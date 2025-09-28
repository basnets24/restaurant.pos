# Play.Infra 
Restaurant Pos Infrastructure components
```bash
export owner=[GIHHUB-PERSONAL-OR-ORG-NAME]
export gh_pat=[YOUR_PERSONAL_ACCESS_TOKEN]
export RG=[RESOURCE-GROUP-NAME-HERE]
export COSMOS=[DB-NAME-HERE]
export SB=[SERVICE-BUS-HERE]
export ACR=[CONTAINER-REGISTRY-HERE]
export AKS=[AKS-NAME-HERE]
export KV=[KEY-VAULT-NAME]
```



## Add GitHub Package source 

```bash 
dotnet nuget add source \
  --username "$owner" \
  --password "$gh_pat" \
  --store-password-in-clear-text \
  --name github \
  "https://nuget.pkg.github.com/$owner/index.json"
``` 

## Creating Azure Resource Group 
```bash
az group create --name $RG --location westus
```
## Creating CosmosDB Account 
```bash
az cosmosdb create --name $COSMOS --resource-group $RG --kind MongoDB --enable-free-tier
```

## Creating the Service Bus Namespace 
```bash 
az servicebus namespace create --name $SB --resource-group $RG --sku Standard
```

## Creating Container Registry 
```bash
az acr create --name $ACR --resource-group $RG --sku Basic
```

## Creating AKS cluster
```bash 
az aks create -n $AKS -g $RG --node-vm-size Standard_B2s --node-count 2 --attach-acr $ACR \
   --enable-oidc-issuer --enable-workload-identity --generate-ssh-keys

az aks get-credentials --name $AKS --resource-group $RG
```

## Creating Azure Key Vault 
```bash 
az keyvault create -n $KV -g $RG 
```

