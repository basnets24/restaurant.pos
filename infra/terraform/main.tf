terraform {
  required_version = ">= 1.6"

  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = "~> 3.0" }
    helm    = { source = "hashicorp/helm",     version = "~> 2.0" }
    kubectl = { source = "gavinbunney/kubectl", version = "~> 1.14" }
  }

  # Bootstrap: create this storage account manually once before first apply.
  # az group create -n restaurant-pos-tfstate -l westus
  # az storage account create -n tfstaterestaurantpos -g restaurant-pos-tfstate --sku Standard_LRS
  # az storage container create -n tfstate --account-name tfstaterestaurantpos
  backend "azurerm" {
    resource_group_name  = "restaurant-pos-tfstate"
    storage_account_name = "tfstaterestaurantpos"
    container_name       = "tfstate"
    key                  = "restaurant-pos.tfstate"
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
  }
}

# Helm and kubectl providers wire directly to AKS output — no local kubeconfig needed.
provider "helm" {
  kubernetes {
    host                   = azurerm_kubernetes_cluster.pos.kube_config[0].host
    client_certificate     = base64decode(azurerm_kubernetes_cluster.pos.kube_config[0].client_certificate)
    client_key             = base64decode(azurerm_kubernetes_cluster.pos.kube_config[0].client_key)
    cluster_ca_certificate = base64decode(azurerm_kubernetes_cluster.pos.kube_config[0].cluster_ca_certificate)
  }
}

provider "kubectl" {
  host                   = azurerm_kubernetes_cluster.pos.kube_config[0].host
  client_certificate     = base64decode(azurerm_kubernetes_cluster.pos.kube_config[0].client_certificate)
  client_key             = base64decode(azurerm_kubernetes_cluster.pos.kube_config[0].client_key)
  cluster_ca_certificate = base64decode(azurerm_kubernetes_cluster.pos.kube_config[0].cluster_ca_certificate)
  load_config_file       = false
}

data "azurerm_client_config" "current" {}
