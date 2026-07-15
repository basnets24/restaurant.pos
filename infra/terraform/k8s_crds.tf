# These are Emissary and cert-manager custom resources — not manageable via the
# azurerm or helm providers, so we use kubectl_manifest directly.
# All depend on the Helm releases that install the CRD definitions first.

resource "kubectl_manifest" "listener_http" {
  yaml_body = file("${path.module}/../emissary-ingress/listener.yaml")

  depends_on = [helm_release.emissary]
}

resource "kubectl_manifest" "cluster_issuer" {
  yaml_body = <<-YAML
    apiVersion: cert-manager.io/v1
    kind: ClusterIssuer
    metadata:
      name: letsencrypt-prod
    spec:
      acme:
        email: ${var.acme_email}
        server: https://acme-v02.api.letsencrypt.org/directory
        privateKeySecretRef:
          name: letsencrypt-prod
        solvers:
          - http01:
              ingress:
                class: emissary
  YAML

  depends_on = [helm_release.cert_manager]
}

resource "kubectl_manifest" "tls_certificate" {
  yaml_body = <<-YAML
    apiVersion: cert-manager.io/v1
    kind: Certificate
    metadata:
      name: spoontab-tls-cert
      namespace: emissary
    spec:
      secretName: spoontab-tls
      issuerRef:
        name: letsencrypt-prod
        kind: ClusterIssuer
      dnsNames:
        - "${var.domain}"
  YAML

  depends_on = [kubectl_manifest.cluster_issuer]
}

resource "kubectl_manifest" "host" {
  yaml_body = <<-YAML
    apiVersion: getambassador.io/v3alpha1
    kind: Host
    metadata:
      name: spoontab-host
      namespace: emissary
    spec:
      hostname: ${var.domain}
      tlsSecret:
        name: spoontab-tls
      acmeProvider:
        email: ${var.acme_email}
  YAML

  depends_on = [kubectl_manifest.tls_certificate]
}

resource "kubectl_manifest" "mapping_identity" {
  yaml_body = <<-YAML
    apiVersion: getambassador.io/v3alpha1
    kind: Mapping
    metadata:
      name: identity-mapping
    spec:
      hostname: ${var.domain}
      prefix: /identity-svc/
      service: identity-service.identity
  YAML

  depends_on = [kubectl_manifest.host]
}

resource "kubectl_manifest" "mapping_frontend" {
  yaml_body = <<-YAML
    apiVersion: getambassador.io/v3alpha1
    kind: Mapping
    metadata:
      name: frontend-mapping
    spec:
      hostname: ${var.domain}
      prefix: /
      service: frontend-client.frontend
  YAML

  depends_on = [kubectl_manifest.host]
}

resource "kubectl_manifest" "mapping_frontend_www" {
  yaml_body = <<-YAML
    apiVersion: getambassador.io/v3alpha1
    kind: Mapping
    metadata:
      name: frontend-root-www
      namespace: emissary
    spec:
      hostname: www.${var.domain}
      prefix: /
      service: frontend-client.frontend
  YAML

  depends_on = [kubectl_manifest.host]
}
