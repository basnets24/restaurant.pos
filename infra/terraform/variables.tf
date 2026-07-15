variable "location" {
  default = "westus"
}

variable "resource_group_name" {
  default = "restaurant-pos"
}

variable "acr_name" {
  description = "Must be globally unique, alphanumeric only."
  default     = "acrpos"
}

variable "aks_name" {
  default = "aks-pos"
}

variable "servicebus_name" {
  default = "sb-pos"
}

variable "keyvault_name" {
  default = "keyv-pos"
}

variable "supabase_connection_string" {
  description = "Supabase PostgreSQL connection string. Set via TF_VAR_supabase_connection_string — never commit this."
  sensitive   = true
}

variable "atlas_connection_string" {
  description = "MongoDB Atlas connection string. Set via TF_VAR_atlas_connection_string — never commit this."
  sensitive   = true
}

variable "app_name" {
  description = "DNS label used by the Emissary Ingress LoadBalancer service."
  default     = "spoontab"
}

variable "domain" {
  default = "spoontab.com"
}

variable "acme_email" {
  default = "sneha.basnet2@gmail.com"
}

variable "node_count" {
  default = 2
}

variable "node_vm_size" {
  default = "Standard_B2s"
}

variable "helm_chart_version" {
  description = "Version of the pos-microservice chart pushed to ACR."
  default     = "0.1.1"
}

variable "emissary_version" {
  default = "8.9.1"
}

variable "cert_manager_version" {
  default = "v1.18.2"
}
