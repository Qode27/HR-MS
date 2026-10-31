# terraform init -backend-config=environments/prod.backend.hcl
# Storage account is created once by bootstrap/create-state-storage.sh
resource_group_name  = "rg-peopleflow-tfstate"
storage_account_name = "stpeopleflowtfstate"   # must be globally unique - change it
container_name       = "tfstate"
key                  = "peopleflow-prod.tfstate"
use_azuread_auth     = true                    # no storage keys
