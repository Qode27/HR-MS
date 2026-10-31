# PeopleFlow HR - DevOps project shortcuts.  Run from devops-project/:  make help
# (Windows: run inside WSL2 or Git Bash with make installed.)

SHELL        := /bin/bash
ROOT         := $(abspath ..)
DP           := $(ROOT)/devops-project
COMPOSE      := docker compose -f $(DP)/docker/docker-compose.yml --env-file $(DP)/docker/.env.compose
ENV          ?= dev
NS           ?= peopleflow
BASE_URL     ?= http://localhost:8080

.DEFAULT_GOAL := help
.PHONY: help preflight env up down logs ps seed health test build scan gitleaks hadolint trivy \
        kind-up k8s-apply k8s-status k8s-delete helm-lint helm-local helm-test kind-down \
        tf-fmt tf-init tf-plan tf-apply tf-lab-up tf-lab-down secrets-env backup

help: ## Show this help
	@grep -hE '^[a-z0-9-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*## "}{printf "  \033[36m%-15s\033[0m %s\n",$$1,$$2}'

preflight: ## [D2] check required tools are installed
	@bash $(DP)/scripts/preflight.sh

# ------------------------------------------------------------------ Compose
env: ## [D9] create docker/.env.compose from the example (once)
	@test -f $(DP)/docker/.env.compose || { cp $(DP)/docker/.env.compose.example $(DP)/docker/.env.compose; \
	  sed -i.bak "s|change-me-generate-a-long-random-value|$$(openssl rand -base64 48 | tr -d '\n/+=')|" $(DP)/docker/.env.compose; \
	  rm -f $(DP)/docker/.env.compose.bak; echo "created docker/.env.compose - change POSTGRES_PASSWORD"; }

up: env ## [D9] build and start the 3-tier stack on :8080
	$(COMPOSE) up --build -d
	@$(COMPOSE) ps

down: ## [D9] stop the stack (add V=1 to also delete the DB volume)
	$(COMPOSE) down $(if $(V),-v,)

logs: ## [D13] follow app + proxy logs
	$(COMPOSE) logs -f --tail=100 app proxy

ps: ## [D9] container status and health
	$(COMPOSE) ps

seed: ## [D9] load demo data (roles, admin user, sample employees)
	$(COMPOSE) run --rm migrate npx tsx prisma/seed.ts

health: ## [D3] check every tier
	@bash $(DP)/scripts/healthcheck.sh $(BASE_URL)

# --------------------------------------------------------------- build/test
test: ## [D5] typecheck + unit tests (same as CI)
	cd $(ROOT) && npm ci && npx prisma generate && npx tsc --noEmit && npx vitest run

build: ## [D9] build both images with a git-based tag
	cd $(ROOT) && for t in runner migrator; do \
	  n=$$([ $$t = runner ] && echo peopleflow-web || echo peopleflow-migrator); \
	  docker build -f $(DP)/docker/Dockerfile --target $$t \
	    --build-arg GIT_SHA=$$(git rev-parse --short HEAD) -t $$n:$$(git rev-parse --short HEAD) .; done

# ----------------------------------------------------------------- security
scan: gitleaks hadolint trivy ## [D14] run all security scans locally

gitleaks: ## [D14] secret scan of the working tree
	docker run --rm -v $(ROOT):/repo zricethezav/gitleaks:v8.21.2 dir /repo \
	  --config /repo/devops-project/security/.gitleaks.toml --redact -v

hadolint: ## [D14] Dockerfile lint
	docker run --rm -i -v $(DP)/security:/cfg hadolint/hadolint:v2.12.0 \
	  hadolint --config /cfg/hadolint.yaml - < $(DP)/docker/Dockerfile

trivy: ## [D14] image vulnerability scan (run `make up` first)
	docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v $(DP)/security:/cfg \
	  aquasec/trivy:0.56.2 image --config /cfg/trivy.yaml peopleflow-web:local

# --------------------------------------------------------------- kubernetes
kind-up: ## [D10] local cluster + ingress + images
	bash $(DP)/scripts/kind-up.sh

k8s-apply: ## [D10] deploy with Kustomize (local overlay)
	kubectl apply -k $(DP)/k8s/overlays/local
	kubectl -n $(NS) wait --for=condition=complete job/peopleflow-migrate --timeout=300s
	kubectl -n $(NS) rollout status deploy/peopleflow-web --timeout=300s

k8s-status: ## [D13] what is running?
	kubectl -n $(NS) get all,ingress,hpa,pdb,networkpolicy

k8s-delete: ## [D10] remove the Kustomize deployment
	kubectl delete -k $(DP)/k8s/overlays/local --ignore-not-found

helm-lint: ## [D10] lint + render the chart for every environment
	@for f in local dev staging prod; do echo "== $$f"; \
	  helm lint $(DP)/helm/peopleflow -f $(DP)/helm/peopleflow/values-$$f.yaml || exit 1; done

helm-local: ## [D10] install the chart on kind (after k8s-delete)
	kubectl get ns $(NS) >/dev/null 2>&1 || kubectl create ns $(NS)
	kubectl label ns $(NS) pod-security.kubernetes.io/enforce=restricted --overwrite
	kubectl -n $(NS) create secret generic postgres-credentials \
	  --from-literal=POSTGRES_USER=peopleflow --from-literal=POSTGRES_PASSWORD=local-lab-password \
	  --from-literal=POSTGRES_DB=peopleflow_hr --dry-run=client -o yaml | kubectl apply -f -
	kubectl -n $(NS) apply -f $(DP)/k8s/overlays/local/postgres.yaml
	kubectl -n $(NS) rollout status statefulset/postgres --timeout=180s
	helm upgrade --install peopleflow $(DP)/helm/peopleflow -n $(NS) \
	  -f $(DP)/helm/peopleflow/values-local.yaml --wait --timeout 10m

helm-test: ## [D10] in-cluster test hook
	helm test peopleflow -n $(NS)

kind-down: ## [D10] delete the kind cluster
	kind delete cluster --name peopleflow

# ---------------------------------------------------------------- terraform
tf-fmt: ## [D11] format + validate
	cd $(DP)/terraform && terraform fmt -recursive && terraform init -backend=false -input=false >/dev/null && terraform validate

tf-init: ## [D11] init with remote state (ENV=dev|staging|prod)
	cd $(DP)/terraform && terraform init -reconfigure -backend-config=environments/$(ENV).backend.hcl

tf-plan: ## [D11] plan (ENV=dev|staging|prod)
	cd $(DP)/terraform && terraform plan -var-file=environments/$(ENV).tfvars -out=$(ENV).tfplan

tf-apply: ## [D11] apply the saved plan
	cd $(DP)/terraform && terraform apply $(ENV).tfplan

# ------------------------------------------------- terraform lab + secrets
STUDENT ?= $(shell whoami | tr -cd 'a-z' | cut -c1-10)

tf-lab-up: ## [D11] create the classroom lab (RG, storage, Key Vault + secrets)
	cd $(DP)/terraform/lab && terraform init -input=false && terraform apply -var="student=$(STUDENT)"

secrets-env: ## [D12] build docker/.env.compose from Key Vault
	bash $(DP)/scripts/env-from-keyvault.sh

tf-lab-down: ## [D11] destroy the classroom lab
	cd $(DP)/terraform/lab && terraform destroy -var="student=$(STUDENT)"

# -------------------------------------------------------------------- data
backup: ## [D14] pg_dump of the Compose database into ./backups
	@mkdir -p $(DP)/backups
	set -a; source $(DP)/docker/.env.compose; set +a; \
	$(COMPOSE) exec -T db pg_dump -U $$POSTGRES_USER --format=custom --no-owner $$POSTGRES_DB \
	  > $(DP)/backups/peopleflow_$$(date -u +%Y%m%dT%H%M%SZ).dump && ls -lh $(DP)/backups | tail -3
