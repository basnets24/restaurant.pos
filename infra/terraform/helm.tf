# ── Emissary Ingress ──────────────────────────────────────────────────────────

resource "helm_release" "emissary_crds" {
  name             = "emissary-crds"
  repository       = "https://app.getambassador.io"
  chart            = "emissary-ingress-crds"
  version          = var.emissary_version
  namespace        = "emissary-system"
  create_namespace = true
}

resource "helm_release" "emissary" {
  name             = "emissary-ingress"
  repository       = "https://app.getambassador.io"
  chart            = "emissary-ingress"
  version          = var.emissary_version
  namespace        = "emissary"
  create_namespace = true

  set {
    name  = "service.annotations.service\\.beta\\.kubernetes\\.io/azure-dns-label-name"
    value = var.app_name
  }

  depends_on = [helm_release.emissary_crds]
}

# ── cert-manager ──────────────────────────────────────────────────────────────

resource "helm_release" "cert_manager" {
  name             = "cert-manager"
  repository       = "https://charts.jetstack.io"
  chart            = "cert-manager"
  version          = var.cert_manager_version
  namespace        = "emissary"
  create_namespace = true

  set {
    name  = "crds.enabled"
    value = "true"
  }

  depends_on = [helm_release.emissary]
}

# ── Microservice Helm releases ────────────────────────────────────────────────
# Chart is stored in ACR OCI registry after: helm push pos-microservice-0.1.1.tgz oci://acrpos.azurecr.io/helm

resource "helm_release" "svc" {
  for_each = local.services

  name             = each.key
  repository       = "oci://${azurerm_container_registry.pos.login_server}/helm"
  chart            = "pos-microservice"
  version          = var.helm_chart_version
  namespace        = each.value.namespace
  create_namespace = true

  # ACR admin credentials for OCI helm authentication.
  repository_username = azurerm_container_registry.pos.admin_username
  repository_password = azurerm_container_registry.pos.admin_password

  values = [
    yamlencode({
      microserviceName = each.key
      identityClientId = azurerm_user_assigned_identity.svc[each.key].client_id

      image = {
        repository = "${azurerm_container_registry.pos.login_server}/${each.key}"
        tag        = "latest"
      }

      container = {
        port = each.value.container_port
        readiness = {
          path                = "/health/ready"
          initialDelaySeconds = 30
          periodSeconds       = 15
          timeoutSeconds      = 10
          failureThreshold    = 3
        }
        liveness = {
          path                = "/health/live"
          initialDelaySeconds = 30
          periodSeconds       = 15
          timeoutSeconds      = 10
          failureThreshold    = 3
        }
        startupProbe = {
          path             = "/health/live"
          failureThreshold = 30
          periodSeconds    = 15
          timeoutSeconds   = 5
        }
        volumeMounts = []
      }

      service = {
        type = "ClusterIP"
        port = 80
      }

      envVariables = local.common_env

      volumes = []
    })
  ]

  depends_on = [
    helm_release.emissary,
    helm_release.cert_manager,
    azurerm_role_assignment.aks_acr_pull,
    azurerm_role_assignment.svc_kv_secrets_user,
    azurerm_federated_identity_credential.svc,
  ]
}
