# PeopleFlow HR – 3-day hands-on DevOps project

One application, one continuous build. By the end of Day 3, every student has taken **PeopleFlow HR** (the 3-tier HR app: NGINX → Next.js → PostgreSQL) through Git → build and test → Docker → CI pipeline → Kubernetes and Helm → Terraform → secrets → monitoring and troubleshooting → security, and has demoed it.

- **Pace:** about 6 hours of hands-on time per day. Each block lists the course topics it covers (D1–D15 = the 15 syllabus days and their slide decks).
- **Short on time?** See *"If you only have 2 days"* at the bottom.
- **Deeper exercises** for any topic are in `docs/reference/extended-labs-15-day.md`.

| | Day 1 – Build & containerise | Day 2 – Automate & orchestrate | Day 3 – Infrastructure, operate, secure |
|---|---|---|---|
| Covers | D1, D2, D3, D4, D5, D9 | D6, D7, D10 | D8, D11, D12, D13, D14, D15 |
| Ends with | the app running in Docker on :8080 | a green CI pipeline, and the app on Kubernetes deployed with Helm | Terraform resources, a secret from Key Vault, fixed incidents, a final demo |

---

## Before Day 1 (do not skip – installs eat a whole day otherwise)

**Students (send a week ahead):** Windows users install WSL2 (Ubuntu) and Docker Desktop with WSL integration. Then install inside WSL: Git, Node.js 20, kubectl, kind, Helm, Terraform and Azure CLI. Each student needs a free **Azure DevOps** organization and, for Day 3, an Azure subscription (a free trial or a training sandbox). Then:

```bash
git clone <repo-url> HR-MS && cd HR-MS/devops-project && make preflight
```

Pre-pull the large images at home, because classroom Wi-Fi will not cope:

```bash
for i in node:20-alpine postgres:16-alpine nginx:1.27-alpine kindest/node:v1.31.2 \
         zricethezav/gitleaks:v8.21.2 hadolint/hadolint:v2.12.0 aquasec/trivy:0.56.2 curlimages/curl:8.10.1; do docker pull $i; done
```

**Instructor:**

1. **Remove the committed secrets (critical).** `.env.production` and `deploy-hrms/runtime-package/.env.production` are in git and contain a live DB password and JWT secret. **Rotate both**, then:
   ```bash
   git rm --cached .env.production deploy-hrms/runtime-package/.env.production
   printf '\n.env\n.env.*\n!.env.example\ndevops-project/docker/.env.compose\n' >> .gitignore
   git commit -m "chore(security): stop tracking env files"
   # purge from history (everyone re-clones afterwards):
   pip install git-filter-repo && git filter-repo --invert-paths --path .env.production --path deploy-hrms/runtime-package/.env.production
   ```
   *Teaching option:* keep an un-cleaned fork so that on Day 2 gitleaks fails live in the pipeline.
2. Move the `qode27-*` zips and folders and the `*.log` files out of the repo.
3. Do a dry run of all three days once, top to bottom, on a clean machine: `make up`, `make kind-up && make k8s-apply`, `make helm-lint`, then `terraform validate` in `terraform/lab`.

---

## Day 1 – Build and containerise

| Time | Block | Topics |
|---|---|---|
| 0:00–0:40 | 1.1 The big picture | D1 |
| 0:40–1:30 | 1.2 Git workflow | D4 |
| 1:30–2:30 | 1.3 Build, test, artifact | D5 |
| 2:30–4:15 | 1.4 Docker: containerise all 3 tiers | D9 |
| 4:15–5:00 | 1.5 Linux inside the running server | D2 |
| 5:00–6:00 | 1.6 Networking and a Bash health check | D3 |

### 1.1 The big picture (D1)
Open `docs/architecture.md` and show both diagrams. Students draw, on paper, "an HR user reports a payslip bug → the fix is live" and mark Plan, Code, Build, Test, Release, Deploy, Operate and Monitor on it. Tell them: *"Over 3 days you will build every box on this drawing."*

### 1.2 Git workflow (D4)
```bash
cd HR-MS
git switch -c feat/<yourname>-health-region
# edit src/app/api/health/route.ts: add a field to the JSON, e.g. region: "lab"
git add -p && git commit -m "feat(health): include region"
git push -u origin feat/<yourname>-health-region
```
Open a PR using `docs/pull_request_template.md`. **Conflict drill:** two students edit the same line and one merges first. The other then runs `git fetch && git rebase origin/main`, resolves the conflict, and runs `git push --force-with-lease`. Turn on the `main` branch policy (1 reviewer, no direct pushes); see `docs/branching-and-release.md`.

### 1.3 Build, test, artifact (D5)
```bash
npm ci                    # reproducible deps (lockfile)
npx prisma generate       # generated code
npx tsc --noEmit          # quality gate
npx vitest run            # unit tests in tests/
npm run build             # -> .next/standalone = the artifact
du -sh .next/standalone
```
Break a test on purpose and look at the exit code (`echo $?`). Ask why the artifact we ship will be an *image*, not this folder. Mention that Maven (`mvn package`) and `dotnet publish` follow the same pattern.

### 1.4 Docker: containerise all 3 tiers (D9)
Walk through `docker/Dockerfile`: the deps, builder, runner and migrator stages, layer caching, the non-root user, the HEALTHCHECK and `.dockerignore`. Then:
```bash
cd devops-project
make up          # creates docker/.env.compose, builds, migrates, starts proxy + app + db
make seed        # demo data
make ps          # all healthy?
```
Open http://localhost:8080 and log in as `admin@peopleflow.local` / `Admin@123` (seeded lab user).
```bash
docker history peopleflow-web:local     # layers
docker image ls | grep peopleflow       # image size
make logs                               # container logs
make down && make up                    # data survives (named volume)
```
Exercise: change one line in `src/`, rebuild, and notice which layers rebuild. Ask what `make down V=1` does, and why.

### 1.5 Linux inside the running server (D2)
```bash
docker compose -f docker/docker-compose.yml --env-file docker/.env.compose exec app sh
  pwd; ls -la; id            # uid 1001 - why not root?
  touch /app/x               # fails: read-only filesystem
  touch /tmp/x               # works: tmpfs
  ps aux; df -h; env | grep -v SECRET | sort
  exit
ls -l docker/.env.compose && chmod 600 docker/.env.compose
docker compose -f docker/docker-compose.yml --env-file docker/.env.compose logs app | grep -i error | tail
```

### 1.6 Networking and a Bash health check (D3)
```bash
curl -v http://localhost:8080/nginx-health          # HTTP request/response, headers
curl -sI http://localhost:8080/login | grep -i x-   # security headers added by NGINX
nc -zv localhost 3000     # closed: the app is only reachable through NGINX
nc -zv localhost 5432     # open, but only on 127.0.0.1
docker network inspect peopleflow_backend | grep Internal
bash scripts/healthcheck.sh; echo "exit=$?"
docker compose -f docker/docker-compose.yml --env-file docker/.env.compose stop db
bash scripts/healthcheck.sh; echo "exit=$?"         # now fails -> non-zero exit
docker compose -f docker/docker-compose.yml --env-file docker/.env.compose start db
```
**Practical:** extend `scripts/healthcheck.sh` with a response-time check (`curl -w '%{time_total}'`).

**Day 1 done when:** every student's stack is healthy on :8080 and their PR is merged.

---

## Day 2 – Automate and orchestrate

| Time | Block | Topics |
|---|---|---|
| 0:00–2:00 | 2.1 CI pipeline in Azure Pipelines | D6 |
| 2:00–4:00 | 2.2 Kubernetes on kind | D10 |
| 4:00–5:15 | 2.3 Helm and continuous delivery | D7, D10 |
| 5:15–6:00 | 2.4 Approval gate and wrap-up | D7 |

### 2.1 CI pipeline (D6)
1. In Azure DevOps, create a project and import the repo (or connect GitHub).
2. **Pipelines → New → Existing YAML →** `/devops-project/pipelines/azure-pipelines-ci.yml`. This pipeline needs **no Azure resources**.
3. Run it. Show stages, jobs and steps; the agent pool; the **Tests** tab; and the `build-output` artifact (SBOM).
4. Push a commit and watch the trigger fire. Open a PR and watch the PR build run.
5. Break the build (a failing test) and see the PR blocked. Fix it.
6. *(If the repo still has secrets)* gitleaks fails. Discuss why CI is the last line of defence, not the first.
7. Optional: create a Docker Hub service connection `sc-dockerhub` and run with **pushImage = true**.

Read through `pipelines/azure-pipelines.yml`, the production version: build once, then promote through dev → staging → prod.

### 2.2 Kubernetes on kind (D10)
```bash
make kind-up        # 3-node cluster + ingress-nginx + images loaded (about 5 min)
make k8s-apply      # namespace, config, secret, migration Job, Deployment, Service, Ingress, HPA, PDB, NetworkPolicy, Postgres
make k8s-status
```
Open http://peopleflow.localtest.me, then work through:

| Concept | Try it |
|---|---|
| Pods across nodes | `kubectl get pods -n peopleflow -o wide` |
| Self-healing | `kubectl delete pod -n peopleflow -l app.kubernetes.io/name=peopleflow-web`, then watch it come back |
| Scaling | `kubectl scale deploy/peopleflow-web -n peopleflow --replicas=3` |
| ConfigMap | `kubectl edit cm peopleflow-config -n peopleflow`, then `kubectl rollout restart deploy/peopleflow-web -n peopleflow` |
| Secret | `kubectl get secret peopleflow-secrets -n peopleflow -o jsonpath='{.data.JWT_SECRET}' \| base64 -d` (encoded, NOT encrypted) |
| Probes | `kubectl describe pod -n peopleflow <web-pod>` → liveness, readiness, startup |
| Rolling update | `kubectl rollout history` / `rollout undo deploy/peopleflow-web -n peopleflow` |

Read `k8s/base/*.yaml` together. Each file maps to one concept from the D10 slides.

### 2.3 Helm and continuous delivery (D7, D10)
```bash
make k8s-delete
make helm-local                     # same app, now a Helm release
helm list -n peopleflow && make helm-test
```
- **Rolling, zero-downtime update:** run `helm upgrade peopleflow helm/peopleflow -n peopleflow -f helm/peopleflow/values-local.yaml --set config.NEXT_PUBLIC_APP_NAME="PeopleFlow v2" --wait`, while `kubectl get pods -n peopleflow -w` runs in a second terminal.
- **Failed deploy, automatic rollback:** run the same command with `--set image.tag=does-not-exist --atomic --timeout 2m`.
- **Manual rollback:** `helm history peopleflow -n peopleflow`, then `helm rollback peopleflow <rev> -n peopleflow`.
- **Smoke test:** `bash scripts/smoke-test.sh http://peopleflow.localtest.me`
- Compare `values-local.yaml` and `values-prod.yaml`: the same chart for every environment.

### 2.4 Approval gate (D7)
Create the environment **peopleflow-test** with an **Approval** check, then re-run the pipeline. `Release_Test` waits for a human, then renders the Kubernetes manifest for that exact image tag. Discuss continuous delivery vs continuous deployment, and blue-green vs canary (what would change in the chart?).
*Stretch:* register a self-hosted agent in WSL so the pipeline can run `helm upgrade` against your kind cluster.

**Day 2 done when:** the pipeline is green with an approval recorded, and the app runs on kind through Helm.

---

## Day 3 – Infrastructure, operate, secure

| Time | Block | Topics |
|---|---|---|
| 0:00–0:30 | 3.1 Azure fundamentals | D8 |
| 0:30–1:45 | 3.2 Terraform lab | D11 |
| 1:45–2:30 | 3.3 Configuration and secrets with Terraform + Key Vault | D12 |
| 2:30–3:45 | 3.4 Troubleshooting game | D13 |
| 3:45–4:45 | 3.5 DevSecOps and reliability | D14 |
| 4:45–6:00 | 3.6 Final demo | D15 |

### 3.1 Azure fundamentals (D8)
Read `terraform/main.tf` (the production design) and fill in this table together: compute (AKS), registry (ACR), database (Postgres Flexible Server, private subnet), secrets (Key Vault), network (VNet, subnets, NSG), monitoring (Log Analytics, alerts). Then trace one identity: *pod → service account → Workload Identity → Key Vault role → secret*. **Key point:** no passwords anywhere. Managed identities and OIDC replace them.

### 3.2 Terraform lab (D11): a real resource in about 2 minutes
```bash
cd devops-project/terraform/lab
az login && export ARM_SUBSCRIPTION_ID=$(az account show --query id -o tsv)
terraform init
terraform fmt && terraform validate
terraform plan  -var="student=<yourname>"     # read it: 10 resources to add
terraform apply -var="student=<yourname>"
terraform plan  -var="student=<yourname>"     # "No changes" = desired state reached
```
- **Change safely:** add a tag in `locals.tags`, then run `plan`. It shows *update in-place*. Change `location`, then run `plan`. It shows *must be replaced*. Ask what the difference is, and why it matters.
- **State:** open `terraform.tfstate` and find the secret in plain text. Explain why production uses remote state with locking (`../versions.tf` and `../environments/*.backend.hcl`).
- **Modules:** look at `../modules/` and at how `dev.tfvars` and `prod.tfvars` reuse one codebase.
- Keep the resources until 3.3, then run `terraform destroy -var="student=<yourname>"`.

### 3.3 Configuration and secrets with Terraform + Key Vault (D12)
The Terraform lab already **generated** the app's secrets (`random_password`) and stored them in Key Vault. Nobody typed a password, and none is in git.

**1. Read a secret securely**, never hard-coding it. Access comes from your Azure login and the Key Vault access policy (least privilege: secret operations only).
```bash
cd devops-project/terraform/lab
terraform output key_vault_secrets                       # names only, never values
KV=$(terraform output -raw key_vault_name)
az keyvault secret list --vault-name $KV --query "[].name" -o tsv
az keyvault secret show --vault-name $KV -n jwt-secret --query value -o tsv
```

**2. Same config for every environment, pulled at deploy time:**
```bash
cd ../..                                   # back to devops-project
bash scripts/env-from-keyvault.sh          # writes docker/.env.compose (mode 600) from Key Vault
make down V=1 && make up && make seed      # the stack now runs on Key Vault secrets
make health
```
Why `V=1`? Postgres sets its password only when it first creates the data volume. A new password on an old volume gives "authentication failed", a classic real-world incident. Day 3.4 uses the same symptom.

**3. Credential rotation:**
```bash
cd terraform/lab
terraform apply -replace=random_password.jwt -var="student=<yourname>"   # new JWT secret in Key Vault
cd ../.. && bash scripts/env-from-keyvault.sh && make up                  # redeploy picks it up
```
Students see every user logged out, because old tokens are no longer valid. Discuss why rotation needs a plan (SEC-04 in `docs/SECURITY-FINDINGS.md`).

**4. Configuration drift:** someone changes infrastructure by hand, and Terraform detects and reverts it.
```bash
az group update -n rg-pf-lab-<yourname> --set tags.owner=someone-else     # a manual "quick fix"
cd terraform/lab && terraform plan -var="student=<yourname>"              # plan shows the drift: tags will be reverted
terraform apply -var="student=<yourname>"                                  # desired state restored
```

**5. Production pattern (read through):** in AKS, pods get the same Key Vault secrets with **no file and no login at all**, through Workload Identity and the Secrets Store CSI driver. See `helm/peopleflow/templates/secretproviderclass.yaml` and `terraform/main.tf`, which contains the identity, the federated credential and the "Key Vault Secrets User" role. In pipelines, use a **variable group linked to Key Vault**, never plain-text pipeline variables.

Clean up when the lab is done: `cd terraform/lab && terraform destroy -var="student=<yourname>"`.

### 3.4 Troubleshooting game (D13)
The instructor secretly breaks one thing per team on the kind cluster. Teams follow `docs/runbooks/incident-response.md` using `kubectl get/describe/logs/events`, `make health` and `kubectl get endpoints`.

| # | Break it (instructor) | What teams should find |
|---|---|---|
| 1 | `kubectl -n peopleflow patch secret peopleflow-secrets -p '{"stringData":{"DATABASE_URL":"postgresql://peopleflow:wrong@postgres:5432/peopleflow_hr"}}' && kubectl -n peopleflow rollout restart deploy/peopleflow-web` | readiness fails, auth error in the logs |
| 2 | `kubectl -n peopleflow scale statefulset/postgres --replicas=0` | data tier down, 503 |
| 3 | `helm upgrade peopleflow helm/peopleflow -n peopleflow -f helm/peopleflow/values-local.yaml --set resources.limits.memory=64Mi` | `OOMKilled`, CrashLoopBackOff |
| 4 | the same `helm upgrade` with `--set image.tag=v9.9.9` | ImagePullBackOff |
| 5 | `kubectl -n peopleflow patch svc peopleflow-web -p '{"spec":{"selector":{"app.kubernetes.io/name":"typo"}}}'` | the Service has no endpoints |

Each team writes a 5-line postmortem (`docs/runbooks/postmortem-template.md`). Then show what production adds: `monitoring/kql/` queries, `monitoring/prometheus/` alerts and the Azure alerts in Terraform.

### 3.5 DevSecOps and reliability (D14)
```bash
make gitleaks && make hadolint && make trivy
cd .. && npm audit --omit=dev
```
**Pipeline review:** students find the 6 problems in this snippet, then propose the fixes (compare `pipelines/azure-pipelines.yml`):
```yaml
variables:
  DB_PASSWORD: 'Sup3rS3cret!'
steps:
  - script: docker build -t peopleflow:latest .
  - script: echo $(DB_PASSWORD)
  - script: docker login -u admin -p $(ACR_ADMIN_PWD) myacr.azurecr.io
  - script: kubectl apply -f k8s/ --insecure-skip-tls-verify
```
*Answers:* a secret in YAML; a mutable `latest` tag; a secret printed to logs; the registry admin user; TLS disabled; and no scan, no approval and no rollback.

**Reliability (15 min):** walk through resources and limits, HPA, PDB and probes in `helm/peopleflow/values.yaml`. **Backup drill:** run `make backup`, delete an employee in the UI, restore with `pg_restore` (see `docs/runbooks/rollback-and-restore.md`), and time it. That time is your RTO.

### 3.6 Final demo (D15)
Each team (or student) has 8 minutes to show:
1. A code change merged through a PR → the CI pipeline green → the image tagged `<build>-<sha>` and scanned.
2. That change deployed to kind with Helm, the smoke test passing, then a rollback.
3. `terraform plan` / `apply` output for the lab resources, a drift detected and fixed, and the app running on secrets pulled from Key Vault.
4. One incident they diagnosed, and one security fix they would make next (`docs/SECURITY-FINDINGS.md`).

| Rubric | Points |
|---|---|
| Git and PR | 10 |
| CI pipeline (tests, scans, artifact) | 20 |
| Docker image | 15 |
| Kubernetes and Helm, with health checks and rollback | 25 |
| Terraform and secrets | 15 |
| Troubleshooting and security | 15 |

---

## If you only have 2 days

| Day 1 | Day 2 |
|---|---|
| 1.1 Big picture (20 min) | 2.1 CI pipeline (75 min) |
| 1.2 Git (30 min) | 2.2 + 2.3 Kubernetes and Helm, including rollback (2 h) |
| 1.3 Build and test (30 min) | 3.2 Terraform lab (45 min, instructor-led) |
| 1.4 Docker (90 min) | 3.3 Key Vault secret read + `env-from-keyvault.sh` + drift demo (25 min) |
| 1.5 + 1.6 Linux and networking, inside the running stack (60 min) | 3.4 Troubleshooting, 3 scenarios (40 min) |
| `make kind-up` before going home (the slow download) | 3.5 Pipeline review only (20 min) + final demo (40 min) |

Give these as homework: the full 3.5 scans and backup drill, the approval gate (2.4), and the deeper labs in `docs/reference/`.

## Azure costs
The Day 3 lab costs a few cents if destroyed the same day. The production stack in `terraform/` (AKS, Postgres and the rest) is **reference code to read, not to apply in class**. If you demo it, use `environments/dev.tfvars` only and destroy it right after.
