# Monitoring & Observability Implementation Plan

Complete observability for the Restaurant POS system - centralized logging, distributed tracing, metrics collection, visualization, and alerting.

---

## Current State vs Target

Verified directly against the code (not just this doc) as of 2026-07-22, against
the current 4-service architecture (identity, catalog, order, payment — menu,
inventory, and tenant no longer exist as separate services; see
`docs/MONGO_TO_POSTGRES_MIGRATION.md` and the service-merge history).

### What's Working ✅
- Serilog + Seq logging (3/4 backend services: identity, catalog, order)
- Health checks implemented and working (`/health/ready`, `/health/live`)
- Kubernetes probes configured correctly (readiness/liveness/startup in the Helm chart)
- Request logging (`UseSerilogRequestLogging()`) only in identity

### What's Broken ❌
- **Payment service has no Serilog at all** - confirmed by its own runtime logs,
  which are in the default .NET console-logger format (`info: MassTransit[0]`),
  not Serilog's compact format (`[HH:mm:ss INF] ...`) the other three services show.
- **OpenTelemetry tracing/metrics are fully implemented but never called anywhere.**
  `Common.Library`'s `AddTracing()`/`AddMetrics()` (`shared/Common.Library/OpenTelemetry/Extensions.cs`)
  are complete, working implementations - not stubs - but:
  - They live in namespace `Play.Common.OpenTelemetry`, not `Common.Library.OpenTelemetry`
    like everything else in this library - a leftover from before the package was
    renamed from `Play.Common`. That inconsistency alone makes them easy to miss.
  - No service calls `AddTracing()`/`AddMetrics()` in `Program.cs` today.
  - Even if called, `AddTracing()` requires a `JaegerSettings` config section
    (`JaegerSettings:Host`/`:Port`) that doesn't exist in any current
    `appsettings.json` or in the current Terraform's Helm values - it would throw
    `InvalidOperationException("Jaeger settings are missing.")` at startup.
- **Two orphaned files from an earlier infra iteration, unused by anything today:**
  - `infra/jaegar/values.yaml` (note the typo - "jaegar" not "jaeger") - Jaeger
    Helm values not referenced by any `.tf` file.
  - `services/payment/helm/values.yaml` - a standalone per-service values file
    from before the Terraform's current inline `yamlencode()` pattern existed;
    different image-tag convention, different namespace convention
    (`seq.observability`/`jaeger-query.observability` vs today's plain `seq`).
- No Prometheus/Grafana - metrics have nowhere to go even once exposed.
- Frontend monitoring completely absent.
- No alerting configured.

### Impact
- Can't trace requests across services
- No visibility into performance
- Frontend errors go unnoticed
- Production issues require manual debugging
- No proactive alerting

---

## Implementation Phases

### Phase 1: Fix & Wire Up (Week 1)

**Priority:** Quick wins - complete partially implemented features

#### 1.1 Add Serilog to Payment Service
**File:** `services/payment/PaymentService/Program.cs`

Add to service configuration:
```csharp
builder.Services.AddSeqLogging(builder.Configuration);
builder.Host.UseSerilog();
```

**Why:** Payment service currently not sending logs to Seq; they go nowhere.

#### 1.2 Add Request Logging to All Services
**Files:** All backend `Program.cs` files except identity (catalog, order, payment)

Add after Serilog setup:
```csharp
app.UseSerilogRequestLogging();
```

**Pattern to copy from:** `services/identity/src/IdentityService/Program.cs:115`

**Why:** HTTP request/response visibility in Seq - critical for debugging.

#### 1.3 Add HEALTHCHECK to Backend Dockerfiles
**Files:** All `services/*/Dockerfile`

Add instruction after EXPOSE:
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD curl -f http://localhost:[port]/health/live || exit 1
```

**Service Ports:**
- Identity: 7163
- Catalog: 5062
- Order: 5236
- Payment: 5238

**Why:** Docker health checks for local development (not just Kubernetes probes).

#### 1.4 Register OpenTelemetry Tracing
**Files:** All backend `Program.cs` files

**Prerequisite:** Fix the namespace on `AddTracing()`/`AddMetrics()` first -
they currently live in `Play.Common.OpenTelemetry` (a leftover from before this
package was renamed from `Play.Common`), inconsistent with every other
`Common.Library.*` namespace. Rename to `Common.Library.OpenTelemetry`.

Add to service configuration:
```csharp
builder.Services.AddTracing(builder.Configuration);
```

**Pattern:** Already defined in `shared/Common.Library/OpenTelemetry/Extensions.cs`

**Also required:** a `JaegerSettings` config section (`Host`/`Port`) in each
service's `appsettings.json` and in the Helm `common_env` - `AddTracing()`
throws at startup without it. Nothing currently provides this section anywhere.

**Update Helm Values:** `infra/helm/microservice/values.yaml`
```yaml
env:
  - name: JAEGER_AGENT_HOST
    value: jaeger-service
  - name: JAEGER_AGENT_PORT
    value: "6831"
```

**Why:** Enable distributed tracing across all services to Jaeger.

#### 1.5 Expose Prometheus Metrics
**Files:** All backend `Program.cs` files

Add to service configuration:
```csharp
builder.Services.AddMetrics(builder.Configuration);
```

**Pattern:** Already defined in `shared/Common.Library/OpenTelemetry/Extensions.cs`

**Endpoint:** `/metrics` automatically exposed by OpenTelemetry

**Why:** Prometheus can scrape metrics from all services.

---

### Phase 2: Metrics Collection & Visualization (Week 2)

**Goal:** Collect and visualize system metrics, and stand up distributed tracing

#### 2.0 Deploy Jaeger in Kubernetes

No prior version of this plan actually included this step - "Jaeger
infrastructure deployed" was listed under "What's Working" without one, but
verification found no Jaeger `helm_release` in any current Terraform file.

**Fix the typo'd directory first:** `infra/jaegar/` -> `infra/jaeger/`
(the values file inside is otherwise usable as-is - all-in-one, in-memory
storage, no Cassandra - a reasonable, cost-free choice for a personal project's
traffic level).

**Add a `helm_release` resource** (in the rebuilt Terraform) for the official
`jaegertracing/jaeger` chart using `infra/jaeger/values.yaml`, and add
`JaegerSettings__Host`/`JaegerSettings__Port` to `locals.tf`'s `common_env` so
every service's `AddTracing()` call (once wired up in Phase 1) can actually
find it.

**Delete** `services/payment/helm/values.yaml` - orphaned, superseded by the
Terraform's inline per-service Helm values, and describes a namespace/image
convention (`seq.observability`, `jaeger-query.observability`,
`acrpos.azurecr.io/pos.payment:1.0.1`) nothing else in the repo uses anymore.

#### 2.1 Deploy Prometheus in Kubernetes

**Create Helm Chart:** `infra/helm/prometheus/`

**Files:**
- `Chart.yaml` - Chart metadata
- `values.yaml` - Configuration with retention 15 days, 5GB storage
- `templates/deployment.yaml` - Prometheus deployment
- `templates/service.yaml` - ClusterIP service
- `templates/configmap.yaml` - Scrape configuration

**Scrape Configuration:**
```yaml
scrape_configs:
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__
```

#### 2.2 Deploy Grafana in Kubernetes

**Create Helm Chart:** `infra/helm/grafana/`

**Files:**
- `Chart.yaml`
- `values.yaml` - Datasources, auto-provision
- `templates/deployment.yaml`
- `templates/service.yaml`
- `dashboards/restaurant-pos-overview.json` - Main dashboard

**Configuration:**
```yaml
datasources:
  prometheus:
    url: http://prometheus-service:9090
    access: proxy

dashboards:
  enabled: true
  defaultDashboards: true
```

**Grafana Panels:**
1. Service Health (up/down status)
2. HTTP Request Rate (requests/sec per service)
3. Error Rate (% of 5xx responses)
4. Latency P95 (response time 95th percentile)
5. Database Connection Pool Usage
6. Message Queue Depth (RabbitMQ)
7. Pod Memory Usage
8. Pod CPU Usage
9. Frontend Error Count
10. Frontend Performance Metrics

#### 2.3 Configure Alerting Rules (Email)

**File:** `infra/prometheus/alert-rules.yaml`

**Alert Rules:**
```yaml
groups:
  - name: service-health
    rules:
      - alert: ServiceDown
        expr: up{job=~".*service"} == 0
        for: 5m
        annotations:
          summary: "{{ $labels.job }} is down"
          description: "Service {{ $labels.job }} has been down for 5 minutes"
      
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate on {{ $labels.job }}"
          description: "Error rate is {{ $value | humanizePercentage }}"
      
      - alert: HighLatency
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 1
        for: 5m
        annotations:
          summary: "High latency on {{ $labels.job }}"
          description: "P95 latency is {{ $value | humanizeDuration }}"
      
      - alert: DatabaseDown
        expr: up{job="postgres-exporter"} == 0
        for: 2m
        annotations:
          summary: "Database is down"
```

**Email Configuration:**
- Configure SMTP endpoint in Alertmanager
- Email recipients: [to be specified]
- Alert summary: ServiceDown, HighErrorRate, HighLatency, DatabaseDown

---

### Phase 3: Frontend Monitoring (Week 2)

**Goal:** Track frontend errors and performance

#### 3.1 Add Frontend Error Reporting to Seq

**Approach:** Simple HTTP logging to Seq (no external dependencies)

**Create:** `services/frontend/src/lib/errorReporting.ts`

```typescript
export function initErrorReporting() {
  const seqUrl = window.config?.SEQ_URL || 'http://localhost:5341';

  // Catch uncaught errors
  window.addEventListener('error', (event) => {
    reportToSeq({
      level: 'Error',
      message: event.message || 'Uncaught Error',
      exception: event.error?.stack,
      properties: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      }
    });
  });

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    reportToSeq({
      level: 'Error',
      message: event.reason?.message || 'Unhandled Promise Rejection',
      exception: event.reason?.stack,
      properties: {
        url: window.location.href,
        timestamp: new Date().toISOString(),
      }
    });
  });
}

async function reportToSeq(logEvent: any) {
  const seqUrl = window.config?.SEQ_URL || 'http://localhost:5341';
  
  try {
    await fetch(`${seqUrl}/api/events/raw?clef`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        '@t': new Date().toISOString(),
        '@l': logEvent.level,
        '@m': logEvent.message,
        '@x': logEvent.exception,
        'source': 'frontend',
        ...logEvent.properties
      })
    });
  } catch (err) {
    console.error('Failed to report error to Seq', err);
  }
}
```

**Usage:** Add to `services/frontend/src/index.tsx`
```typescript
import { initErrorReporting } from './lib/errorReporting';

// Initialize before React renders
initErrorReporting();

// Then render React app
ReactDOM.createRoot(document.getElementById('root')!).render(...)
```

#### 3.2 Add Frontend Performance Metrics

**Install:** `npm install web-vitals`

**Create:** `services/frontend/src/lib/performanceMonitoring.ts`

```typescript
import { getCLS, getFID, getLCP, TTFB } from 'web-vitals';

export function initPerformanceMonitoring() {
  const seqUrl = window.config?.SEQ_URL || 'http://localhost:5341';

  getCLS((metric) => reportMetricToSeq(metric, seqUrl));
  getFID((metric) => reportMetricToSeq(metric, seqUrl));
  getLCP((metric) => reportMetricToSeq(metric, seqUrl));
  TTFB((metric) => reportMetricToSeq(metric, seqUrl));
}

function reportMetricToSeq(metric: any, seqUrl: string) {
  fetch(`${seqUrl}/api/events/raw?clef`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      '@t': new Date().toISOString(),
      '@l': 'Information',
      '@m': `Frontend Performance: ${metric.name}`,
      'metricName': metric.name,
      'value': metric.value,
      'rating': metric.rating,
      'source': 'frontend-metrics'
    })
  }).catch(err => console.error('Failed to report metric', err));
}
```

**Metrics Tracked:**
- CLS (Cumulative Layout Shift)
- FID (First Input Delay)
- LCP (Largest Contentful Paint)
- TTFB (Time to First Byte)

#### 3.3 Update Frontend Config

**File:** `services/frontend/public/config.js`

Add Seq URL:
```javascript
window.SEQ_URL = 'http://localhost:5341';  // Local development
// In production, configure based on environment
```

---

### Phase 4: Documentation & Operations (Week 3)

#### 4.1 Create Monitoring Operations Guide

**File:** `docs/MONITORING.md` (new)

**Content:**
- How to access each monitoring tool locally and in production
- Reading Seq logs (filters, queries)
- Tracing requests in Jaeger
- Creating custom metrics in Prometheus
- Building dashboards in Grafana
- Setting up email notifications
- Troubleshooting guide:
  - Service is slow → Check latency metrics, Jaeger traces
  - Service is throwing errors → Check Seq logs, error rate alert
  - Frontend users report issues → Check frontend errors in Seq, performance metrics
  - Database slow → Check connection pool, database metrics
  - RabbitMQ backed up → Check message queue depth metric

#### 4.2 Update Existing Documentation

**Files to update:**
- `README.md` - Add monitoring overview section
- `LOCAL_DEVELOPMENT.md` - Add accessing monitoring tools locally
- `CI_CD_PIPELINE.md` - Add monitoring deployment in Phase 6
- `infra/README.md` - Add monitoring components and deployment

#### 4.3 Create Runbooks

**File:** `.github/RUNBOOKS.md` (new)

Procedures for:
- Responding to ServiceDown alert
- Responding to HighErrorRate alert
- Responding to HighLatency alert
- Debugging a slow request
- Investigating a crash from frontend error
- Restarting monitoring components
- Scaling Prometheus storage

---

## Files to Create/Modify

### New Files (Phase 2 - Kubernetes)

**Jaeger:**
- `infra/jaeger/values.yaml` (renamed from the typo'd `infra/jaegar/`)
- A `helm_release "jaeger"` resource in the rebuilt Terraform's `helm.tf`

**Prometheus Helm Chart:**
- `infra/helm/prometheus/Chart.yaml`
- `infra/helm/prometheus/values.yaml`
- `infra/helm/prometheus/templates/deployment.yaml`
- `infra/helm/prometheus/templates/service.yaml`
- `infra/helm/prometheus/templates/configmap.yaml`
- `infra/helm/prometheus/templates/servicemonitor.yaml`

**Grafana Helm Chart:**
- `infra/helm/grafana/Chart.yaml`
- `infra/helm/grafana/values.yaml`
- `infra/helm/grafana/templates/deployment.yaml`
- `infra/helm/grafana/templates/service.yaml`
- `infra/helm/grafana/dashboards/restaurant-pos-overview.json`

**Configuration:**
- `infra/prometheus/alert-rules.yaml`

### New Files (Phase 3 - Frontend)

- `services/frontend/src/lib/errorReporting.ts`
- `services/frontend/src/lib/performanceMonitoring.ts`

### New Documentation

- `docs/MONITORING.md`
- `.github/RUNBOOKS.md`

### Modified Files (Phase 1)

#### All Backend Services - Program.cs

Pattern for all 4 services (identity, catalog, order, payment):
```csharp
builder.Services.AddSeqLogging(builder.Configuration);
builder.Services.AddTracing(builder.Configuration);
builder.Services.AddMetrics(builder.Configuration);
builder.Host.UseSerilog();

// In app configuration section:
app.UseSerilogRequestLogging();
```

#### All Backend Services - Dockerfile

Add after EXPOSE:
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD curl -f http://localhost:[service-port]/health/live || exit 1
```

#### Kubernetes/Helm

- `infra/helm/microservice/values.yaml` - Add Jaeger environment variables
- `infra/helm/microservice/templates/deployment.yaml` - Jaeger env injection

#### Frontend

- `services/frontend/src/index.tsx` - Initialize error reporting
- `services/frontend/public/config.js` - Add SEQ_URL
- `services/frontend/package.json` - Add `web-vitals` dependency

#### CI/CD

- No AKS deployment workflow exists yet (`.github/workflows/` currently only has
  CI + NuGet-publish workflows) - this would need to be created, not just
  updated, whenever actual CD to AKS is built

---

## Implementation Timeline

### Week 1: Fix & Wire Up
- [ ] Add Serilog to Payment service
- [ ] Add request logging to 5 services
- [ ] Add HEALTHCHECK to Dockerfiles
- [ ] Register OpenTelemetry tracing in all services
- [ ] Expose Prometheus metrics endpoints
- **Verification:** Logs in Seq, traces in Jaeger, metrics in Prometheus

### Week 2: Visualization & Frontend
- [ ] Deploy Prometheus in Kubernetes
- [ ] Deploy Grafana in Kubernetes
- [ ] Create Grafana dashboards
- [ ] Configure alerting rules
- [ ] Add frontend error tracking to Seq
- [ ] Add frontend performance metrics
- **Verification:** Grafana dashboard shows all metrics, alerts work

### Week 3: Documentation & Ops
- [ ] Create MONITORING.md operations guide
- [ ] Update all existing documentation
- [ ] Create runbooks for common issues
- [ ] Verify all monitoring accessible
- **Verification:** Can access Seq/Jaeger/Prometheus/Grafana, follow guide to debug issue

---

## Decisions Made

✓ **Frontend Error Tracking:** Simple Seq logging (free)
  - Send errors via HTTP to Seq
  - Appears alongside backend logs
  - No external dependencies

✓ **Metrics Retention:** 15 days (cost-optimized)
  - Balance between history and storage
  - ~5GB storage

✓ **Alerting:** Email only
  - Simple SMTP-based notifications
  - Can add Slack later if needed

---

## Success Criteria

✓ All services log centrally to Seq  
✓ All HTTP requests logged with duration/status  
✓ Distributed tracing works across services (Jaeger)  
✓ Metrics collected and exposed (Prometheus)  
✓ Metrics visualized in Grafana  
✓ Frontend errors visible in Seq alongside backend logs  
✓ Frontend performance metrics tracked  
✓ Email alerts for critical issues  
✓ Operations guide documents how to use all tools  
✓ Complete observability - can debug any issue without SSH access to pods

---

## Access Points

### Local Development
- **Seq:** http://localhost:5341
- **Jaeger:** http://localhost:16686
- **Prometheus:** http://localhost:9090
- **Grafana:** http://localhost:3000

### Production Kubernetes
- **Seq:** Via Kubernetes ingress
- **Jaeger:** Via Kubernetes ingress (optional)
- **Prometheus:** Internal only (no public access needed)
- **Grafana:** Via Kubernetes ingress

---

## Quick Reference

### To debug a slow request:
1. Look at latency metric in Grafana
2. Find matching trace in Jaeger
3. See where time is spent across services
4. Check logs in Seq for those services

### To investigate an error:
1. See error rate spike in Grafana
2. Check frontend errors in Seq (if client-side)
3. Check error logs in Seq (service-side)
4. Follow distributed trace in Jaeger if multi-service

### To respond to an alert:
1. Email received with alert details
2. Check Grafana for current status
3. See logs in Seq for context
4. Follow runbook for response procedure
