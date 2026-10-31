#!/usr/bin/env bash
# Day 11 - one-time creation of the remote state backend (chicken-and-egg:
# Terraform cannot create the storage that holds its own state).
# Usage: ./create-state-storage.sh <storage-account-name> [location]
set -euo pipefail

SA="${1:?usage: create-state-storage.sh <globally-unique-storage-account-name> [location]}"
LOC="${2:-centralindia}"
RG="rg-peopleflow-tfstate"

az group create -n "$RG" -l "$LOC" --tags project=peopleflow managed_by=bootstrap -o none
az storage account create -n "$SA" -g "$RG" -l "$LOC" \
  --sku Standard_ZRS --kind StorageV2 \
  --min-tls-version TLS1_2 --allow-blob-public-access false \
  --allow-shared-key-access false -o none
az storage account blob-service-properties update -n "$SA" -g "$RG" \
  --enable-versioning true --enable-delete-retention true --delete-retention-days 30 -o none

# Data-plane access for whoever runs Terraform (you now, the pipeline SP later).
ME="$(az ad signed-in-user show --query id -o tsv)"
SCOPE="$(az storage account show -n "$SA" -g "$RG" --query id -o tsv)"
az role assignment create --assignee-object-id "$ME" --assignee-principal-type User \
  --role "Storage Blob Data Contributor" --scope "$SCOPE" -o none

sleep 30   # RBAC propagation
az storage container create -n tfstate --account-name "$SA" --auth-mode login -o none

echo "State backend ready. Put storage_account_name = \"$SA\" in environments/*.backend.hcl"
echo "Also grant 'Storage Blob Data Contributor' on $SCOPE to the pipeline service principal."
