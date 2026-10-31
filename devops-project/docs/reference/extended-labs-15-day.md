# PeopleFlow HR – Hands-on lab guide (Day 1 → Day 15)

> **Reference material.** The course runs on the 3-day plan in `../../LAB-GUIDE.md`. Use these labs as deeper exercises, homework, or for a longer course. Some commands refer to the full Azure stack.

Each lab has the same parts: **Goal**, **Steps** (commands to run), **Check** (how students prove it worked) and **Discuss** (questions for the class). Commands run from `HR-MS/devops-project` unless a step says otherwise. On Windows, use **WSL2 (Ubuntu)** with Docker Desktop's WSL integration.

**Tools:** Git, Node.js 20, Docker, kubectl, kind, Helm 3.16+, Terraform 1.9+, and Azure CLI with kubelogin. `make preflight` lists anything missing.

---

## Lab 0 – Instructor prep: remove committed secrets (do this BEFORE class)

The repo currently tracks `.env.production` and `deploy-hrms/runtime-package/.env.production`. Both contain a real database URL with its password, a JWT secret and a Redis URL. CI's gitleaks step **will fail** until they are gone, which is a useful teaching moment, but rotate the credentials for real first.

1. **Rotate.** Change the database password at the provider, and generate a new `JWT_SECRET` (`openssl rand -base64 48`). Assume the old values are compromised.
2. **Stop tracking the files:**
   ```bash
   cd HR-MS
   git rm --cached .env.production deploy-hrms/runtime-package/.env.production
   printf '\n.env\n.env.*\n!.env.example\ndevops-project/docker/.env.compose\n*.tfplan\n.terraform/\n**/vault.yml\n' >> .gitignore
   git commit -m "chore(security): stop tracking env files"
   ```
3. **Purge them from history**, because the old commits still contain them. Everyone must re-clone afterwards.
   ```bash
   pip install git-filter-repo
   git filter-repo --invert-paths --path .env.production --path deploy-hrms/runtime-package/.env.production
   git remote add origin <url> && git push --force --all && git push --force --tags
   ```
4. **Tidy:** move the `qode27-*.zip`, `qode27-*` folders and `*.log` files out of the repo (see `docs/SECURITY-FINDINGS.md`, SEC-03).
5. **Validate the project** on your machine: `make helm-lint` and `make tf-fmt`.

---

## Lab 1 – Day 1: The DevOps lifecycle for a real app

**Goal:** see the whole path to production before building any part of it.

1. Open `docs/architecture.md` and look at both diagrams.
2. In groups, map each lifecycle phase to a file in this project:

| Phase | PeopleFlow artifact |
|---|---|
| Plan | work items, PR template (`docs/pull_request_template.md`) |
| Code | `src/`, branches (`docs/branching-and-release.md`) |
| Build | `docker/Dockerfile`, Build stage |
| Test | `tests/*.test.ts`, Validate stage |
| Release | image tag, `helm package`, approvals |
| Deploy | `pipelines/templates/deploy-helm.yml` |
| Operate | `terraform/`, `k8s/`, runbooks |
| Monitor | `monitoring/`, Terraform alerts |

3. **Practical:** draw (on paper or in draw.io) the flow "developer fixes a payslip bug → user sees the fix". Mark where a human approves something.

**Check:** every box on the drawing points to a real file or tool. **Discuss:** which steps are manual today in your own company? Which would you automate first?

---

## Lab 2 – Day 2: Linux on a running server (the app container)

**Goal:** practise Linux commands on something real.

```bash
make up                                 # start the 3-tier stack
docker compose -f docker/docker-compose.yml --env-file docker/.env.compose exec app sh
  pwd; ls -la                           # /app - what files did the build copy in?
  id                                    # uid 1001 (nextjs) - why not root?
  ls -l server.js; stat server.js       # permissions and owners
  touch /app/x                          # fails: read-only root filesystem
  touch /tmp/x && ls -l /tmp            # tmpfs is writable
  ps aux                                # the single node process (PID 1)
  cat /etc/os-release; df -h; free -m 2>/dev/null || cat /proc/meminfo | head -3
  env | grep -v SECRET | sort           # configuration comes from env vars
  exit
docker compose -f docker/docker-compose.yml --env-file docker/.env.compose logs --tail=50 app | grep -i error
docker compose -f docker/docker-compose.yml --env-file docker/.env.compose exec db sh -c 'tail -n 20 /var/lib/postgresql/data/pgdata/log/*.log 2>/dev/null || ls /var/lib/postgresql/data'
```

Also on the host: `chmod 600 docker/.env.compose; ls -l docker/` (who should be able to read a secrets file?), then `find .. -name "*.env*" -not -path "*/node_modules/*"`.

**Check:** students can explain why `touch /app/x` fails. **Discuss:** users and groups as a security boundary, with `sudo` compared to `USER nextjs` in the Dockerfile.

---

## Lab 3 – Day 3: Networking and a health-check script

**Goal:** understand ports, DNS and HTTP, then automate the check.

```bash
docker network ls | grep peopleflow                  # frontend and backend networks
docker network inspect peopleflow_backend | grep -A3 '"Internal"'   # internal: true
curl -v http://localhost:8080/nginx-health           # read the request/response headers
curl -sI http://localhost:8080/login | grep -iE 'x-frame|x-content|referrer'   # headers added by NGINX
curl -s http://localhost:8080/api/health/readiness; echo " exit=$?"
nc -zv localhost 5432          # DB published on 127.0.0.1 only. Why?
nc -zv localhost 3000          # fails: the app is NOT published, only reachable via NGINX
nslookup peopleflow.localtest.me                     # public DNS that resolves to 127.0.0.1
bash scripts/healthcheck.sh; echo "exit code = $?"
```

**Practical:** read `scripts/healthcheck.sh`, then extend it:

1. Add a check that the response time of `/login` is under 2 seconds (`curl -w '%{time_total}'`).
2. Run `docker compose stop db`, re-run the script, and watch the exit code change. Then run `docker compose start db`.
3. Convert the output to JSON with `jq -n`, and compare YAML and JSON using `docker/docker-compose.yml`.

**Check:** the script exits non-zero when the DB is down. **Discuss:** why readiness and liveness are different endpoints.

---

## Lab 4 – Day 4: Git workflow with a merge conflict

```bash
cd HR-MS
git switch -c feat/PF-101-health-version
# change: add "region" to the JSON returned by src/app/api/health/route.ts
git add -p && git commit -m "feat(health): include region"
git push -u origin feat/PF-101-health-version          # open a PR using docs/pull_request_template.md
```

**Make a conflict on purpose:** a partner edits the same line on `main` and merges first. Then:

```bash
git fetch origin && git rebase origin/main     # conflict
git status; # edit the file, keep both ideas
git add . && git rebase --continue && git push --force-with-lease
```

Set the branch policy described in `docs/branching-and-release.md`: 1 reviewer, the CI build must pass, no direct pushes.

**Check:** the PR is merged with a squash commit in Conventional Commits format. **Discuss:** GitHub compared to Azure Repos, and when to rebase versus merge.

---

## Lab 5 – Day 5: Build, test, artifact

```bash
cd HR-MS
npm ci                       # reproducible install from package-lock.json
npx prisma generate          # generated DB client (a build step)
npx tsc --noEmit             # quality gate: type errors fail the build
npx vitest run               # 8 unit test files in tests/
npm run build                # produces .next/standalone - the deployable artifact
ls -la .next/standalone && du -sh .next/standalone
```

**Break it:** introduce a type error, or make one assertion in `tests/leave-schema.test.ts` fail. See which command fails and what exit code it returns.

**Artifact:** `tar czf peopleflow-$(git rev-parse --short HEAD).tgz -C .next standalone`. Then discuss why we will ship a **container image** as the artifact instead.

**Check:** students can name source, build output and artifact for this app. **Discuss:** `npm` here compared to Maven or `dotnet` (lockfile = `pom.xml` versions or `packages.lock.json`).

---

## Lab 6 – Day 6: Continuous Integration in Azure Pipelines

1. In Azure DevOps, create a project. Import or connect the repo; a GitHub repo works through a GitHub service connection.
2. Create a pipeline: **Existing Azure Pipelines YAML file** → `/devops-project/pipelines/azure-pipelines.yml`.
3. For the first run, comment out the `Build` and `Deploy_*` stages; only `Validate` runs. Create an empty variable group `peopleflow-common` so the pipeline can start.
4. Push a commit and watch the trigger fire. Explore stages → jobs → steps, the agent pool, the **Tests** tab (JUnit from vitest), and the published artifact.
5. Show gitleaks failing if Lab 0 has not been done. **This is the most memorable CI lesson.**

**Exercise:** add a `lint` job (it needs an ESLint config first; see SEC-08). Make a test fail and watch the PR get blocked by the branch policy.

**Check:** a green `Validate` run whose test results show in the Tests tab. **Discuss:** triggers (`trigger`, `pr`, path filters), caching (`Cache@2`), and what belongs in CI as opposed to CD.

---

## Lab 7 – Day 7: Continuous Delivery with approvals and rollback

1. Create **Environments**: `peopleflow-dev`, `peopleflow-staging`, `peopleflow-prod`. Add **Approvals** on staging and prod.
2. Read `templates/deploy-helm.yml`: `helm upgrade --install --atomic --wait`, then a smoke test.
3. Without Azure, practise on kind (Lab 10) using the same commands:
   ```bash
   helm upgrade --install peopleflow helm/peopleflow -n peopleflow -f helm/peopleflow/values-local.yaml --atomic --wait
   bash scripts/smoke-test.sh http://peopleflow.localtest.me
   ```
4. **Rolling update:** change `config.NEXT_PUBLIC_APP_NAME` and upgrade. Watch `kubectl get pods -w`. Note that `maxUnavailable: 0` means no downtime.
5. **Failed deploy:** run `helm upgrade ... --set image.tag=does-not-exist --atomic --timeout 2m` and watch Helm roll back automatically.
6. **Manual rollback:** `helm history peopleflow -n peopleflow` → `helm rollback peopleflow <rev>`.

**Discuss:** continuous delivery (with a prod approval) compared to continuous deployment. Then blue-green and canary: what would need to change? Hint: two Helm releases plus ingress canary annotations `nginx.ingress.kubernetes.io/canary-weight`.

---

## Lab 8 – Day 8: Azure fundamentals – map what the app needs

**Goal:** before writing any IaC, list the cloud resources and identities the app needs.

1. In groups, fill in this table with the app's needs, then compare it with `terraform/main.tf`:

| Need | Azure service | IaaS/PaaS | Who accesses it, and how? |
|---|---|---|---|
| Run containers | AKS | PaaS-ish | pipeline SP (Azure RBAC), admins group |
| Store images | ACR | PaaS | kubelet managed identity (AcrPull) |
| Database | Postgres Flexible Server | PaaS | pods over a private subnet |
| Secrets | Key Vault | PaaS | app user-assigned identity (Workload Identity) |
| Network isolation | VNet, subnets, NSG, private DNS | IaaS | — |
| Logs, metrics, alerts | Log Analytics, Azure Monitor | SaaS-ish | Container Insights agent |

2. With a free or sandbox subscription: `az login`, `az account show`, `az group create -n rg-lab-<name> -l centralindia`, then explore the portal. Clean up with `az group delete`.
3. Trace one identity end-to-end: *pod → service account → federated credential → user-assigned identity → "Key Vault Secrets User" role → secret*.

**Discuss:** subscriptions, resource groups and regions; why no passwords appear anywhere (managed identities and OIDC); and least privilege (AcrPull compared to AcrPush).

---

## Lab 9 – Day 9: Docker – containerise the 3-tier app

```bash
# from HR-MS (the repo root is the build context)
docker build -f devops-project/docker/Dockerfile --target runner -t peopleflow-web:dev .
docker history peopleflow-web:dev          # layers - which one is the biggest?
docker image ls peopleflow-web             # compare with the node:20 base (about 1 GB)
docker inspect peopleflow-web:dev --format '{{json .Config.Labels}}' | jq   # OCI labels
cd devops-project && make up && make seed && make ps
make logs                                  # container logs
docker compose -f docker/docker-compose.yml --env-file docker/.env.compose down    # data survives (volume)
make up && make health                     # data is still there
```

Walk through the `Dockerfile` stage by stage: deps → builder → runner and migrator. Explain caching (why `package*.json` is copied first), the non-root user, the HEALTHCHECK and `.dockerignore`.

**Exercises:**
1. Change one line in `src/` and rebuild. Which layers are rebuilt?
2. Tag and push to a registry: `docker tag peopleflow-web:dev <you>/peopleflow-web:1.0.0`.
3. Run `docker compose down -v`. What happened to the data, and why?

**Check:** login works at http://localhost:8080 with the seeded admin. **Discuss:** VMs compared to containers, and why migrations run in a separate container.

---

## Lab 10 – Day 10: Kubernetes and Helm on kind

```bash
make kind-up                                   # 1 control plane + 2 workers, ingress, images loaded
make k8s-apply                                 # Kustomize: base + local overlay
make k8s-status
# open http://peopleflow.localtest.me
```

Exercises:

| Concept | Command |
|---|---|
| Namespaces, pods | `kubectl get pods -n peopleflow -o wide` (spread across the nodes) |
| Self-healing | `kubectl delete pod -n peopleflow -l app.kubernetes.io/name=peopleflow-web` → a new pod appears |
| Scaling | `kubectl scale deploy/peopleflow-web -n peopleflow --replicas=3` (the HPA will adjust it later) |
| ConfigMap | `kubectl edit cm peopleflow-config -n peopleflow`, then `kubectl rollout restart deploy/peopleflow-web -n peopleflow` |
| Secrets | `kubectl get secret peopleflow-secrets -n peopleflow -o jsonpath='{.data.JWT_SECRET}' \| base64 -d` (base64 is NOT encryption) |
| Probes | `kubectl describe pod ...` → look at Liveness, Readiness and Startup |
| Service and DNS | `kubectl run tmp --rm -it --image=curlimages/curl -n peopleflow -- curl -s peopleflow-web/api/health` |
| Rolling update | `kubectl set image ...` or a Helm upgrade, then `kubectl rollout status` / `rollout undo` |

The restricted Pod Security Standard will reject the `tmp` pod. Ask students to work out why, and fix it with `--overrides` or by running in a separate namespace. This is a good lesson in itself.

**Helm:** `make k8s-delete && make helm-local && make helm-test`. Compare `helm template` output with the Kustomize files, and show how values files differ by environment.

**Note:** kind's default network plugin does not enforce NetworkPolicies. To demo them, recreate the cluster with `disableDefaultCNI: true` and install Calico.

---

## Lab 11 – Day 11: Terraform

**Safe sandbox first.** Create a single resource group and storage account in a new folder:

```hcl
resource "azurerm_resource_group" "lab" { name = "rg-tf-lab-<you>"  location = "centralindia" }
```

Run `terraform init → plan → apply → plan` (no changes) → change a tag → `plan` (an in-place update) → `destroy`. Look at `terraform.tfstate`: it contains everything, including secrets, which is why state is kept remote.

**The project:**

```bash
cd devops-project/terraform
./bootstrap/create-state-storage.sh stpeopleflowtf<unique>   # once; edit environments/*.backend.hcl to match
make tf-fmt                                   # fmt + validate
make tf-init ENV=dev
make tf-plan ENV=dev                          # read the plan; count resources (~35)
make tf-apply ENV=dev                         # ~15 min (AKS + Postgres). COST: tear down after class
terraform output
```

Walk through the code: `variables.tf` → `main.tf` (modules) → `modules/*/` → `outputs.tf`. Then show `environments/dev.tfvars` against `prod.tfvars`: the same code with different sizes, HA and backups.

**State locking:** two students run `plan` at the same time against the same backend, and one waits on the blob lease. **Safe change:** change the node VM size and read the plan. Does it say *update in-place* or *forces replacement*? Then look at `pipelines/infra-pipeline.yml`: a saved plan, approval, and `apply` of exactly that plan.

**Clean up:** `terraform destroy -var-file=environments/dev.tfvars`. The `prevent_destroy` on the database blocks this. Ask students to work out why, then explain how to remove it in a lab, but never in prod.

---

## Lab 12 – Day 12: Configuration and secrets with Terraform and Key Vault

1. Run `make tf-lab-up`. Terraform generates the JWT and DB passwords (`random_password`) and stores them in Key Vault.
2. Read a secret with least privilege: `az keyvault secret show --vault-name <kv> -n jwt-secret --query value -o tsv`.
3. Run `make secrets-env`, then `make down V=1 && make up && make seed`. The app now runs on secrets pulled from Key Vault, and no file was edited by hand.
4. **Rotation:** run `terraform apply -replace=random_password.jwt`, then redeploy. Explain why users get logged out.
5. **Drift:** change a tag with `az group update ... --set tags.x=y`. `terraform plan` detects it and `apply` reverts it.
6. **Environment consistency:** compare `terraform/environments/dev.tfvars` with `prod.tfvars`: one codebase, different settings.
7. **Production pattern:** Workload Identity and the CSI driver (`helm/peopleflow/templates/secretproviderclass.yaml`) deliver the same secrets to pods with no file and no password.

**Discuss:** Key Vault access policies vs Azure RBAC, why state files must be protected (they contain the secrets), and pipeline variable groups linked to Key Vault vs plain-text pipeline variables.

---

## Lab 13 – Day 13: Monitoring and troubleshooting a broken app

The instructor breaks the app **secretly**, one scenario per team, on kind or AKS. Teams follow `docs/runbooks/incident-response.md`.

| # | Break it (instructor) | Symptom | Root cause they should find |
|---|---|---|---|
| 1 | `kubectl -n peopleflow patch secret peopleflow-secrets -p '{"stringData":{"DATABASE_URL":"postgresql://peopleflow:wrong@postgres:5432/peopleflow_hr"}}'` then `rollout restart` | pods never Ready, 503 | readiness fails: auth error in the logs |
| 2 | `kubectl -n peopleflow scale statefulset/postgres --replicas=0` | 503, readiness fails | data tier down |
| 3 | `helm upgrade ... --set resources.limits.memory=64Mi` (without `--atomic`) | CrashLoopBackOff | `OOMKilled` in `kubectl describe` |
| 4 | `helm upgrade ... --set image.tag=v9.9.9` | ImagePullBackOff | the tag does not exist |
| 5 | `kubectl -n peopleflow patch svc peopleflow-web -p '{"spec":{"selector":{"app.kubernetes.io/name":"typo"}}}'` | 503 from the ingress, pods are fine | Service has no endpoints (`kubectl get endpoints`) |
| 6 | Compose: `docker compose stop app` | NGINX 502 | upstream down (`docker compose ps`, NGINX error log) |

Tools: `kubectl get/describe/logs/events/top`, `make health`, the KQL queries in `monitoring/kql/` (AKS), and the alerts in `monitoring/prometheus/`.

**Deliverable:** each team writes a short postmortem using `docs/runbooks/postmortem-template.md`.

**Discuss:** metrics, logs and traces; the four golden signals (latency, traffic, errors, saturation); and alert fatigue.

---

## Lab 14 – Day 14: DevSecOps and reliability

1. **Scan everything:**
   ```bash
   make gitleaks       # before Lab 0 this finds the committed .env.production files
   make hadolint
   make up && make trivy
   cd .. && npm audit --omit=dev
   docker run --rm -v "$PWD/devops-project:/src" bridgecrew/checkov:3.2.255 -d /src/terraform --config-file /src/security/checkov.yaml
   ```
2. **Pipeline review:** give students the *bad* snippet below and ask them to find at least 6 problems, then compare it with `pipelines/azure-pipelines.yml`:
   ```yaml
   variables:
     DB_PASSWORD: 'Sup3rS3cret!'                 # 1 secret in YAML
   steps:
     - script: docker build -t peopleflow:latest . # 2 mutable tag
     - script: echo $(DB_PASSWORD)               # 3 secret printed to the logs
     - script: docker login -u admin -p $(ACR_ADMIN_PWD) myacr.azurecr.io   # 4 ACR admin user
     - script: kubectl apply -f k8s/ --insecure-skip-tls-verify  # 5 TLS off, 6 no approval / no scan / no rollback
   ```
3. **Fix a finding:** pick one item from `docs/SECURITY-FINDINGS.md` and open a PR that fixes it.
4. **Reliability:** read the HPA, PDB, topology spread and resource limits in `values.yaml`. Load test with `kubectl run -n default load --image=busybox -- sh -c 'while true; do wget -qO- http://peopleflow-web.peopleflow/api/health; done'` and watch `kubectl get hpa -w`. On kind, install metrics-server first. NetworkPolicy may block this traffic, so ask students why.
5. **Backup and restore drill:** follow §C of `docs/runbooks/rollback-and-restore.md`: `make backup`, delete data, restore, and measure RTO and RPO.

**Revision quiz:** Git (rebase vs merge), CI (stage, job, step), Docker (layers), Kubernetes (Deployment, ReplicaSet, Pod), and Terraform (plan vs apply, state).

---

## Lab 15 – Day 15: Final end-to-end project

Each team delivers a working path from commit to production, and demos it in 10 minutes:

1. **Git:** a feature branch with a small, visible change (for example `NEXT_PUBLIC_APP_NAME` or a health JSON field), merged through a PR.
2. **CI:** `Validate` is green, with test results published.
3. **Image:** built once, tagged `<build>-<sha>`, scanned by trivy, with an SBOM attached.
4. **Kubernetes:** deployed with Helm to kind (or AKS dev), and the smoke test passes.
5. **Terraform:** at least one resource managed by Terraform (the sandbox RG, or the full dev stack), with the plan shown before apply.
6. **Operate:** show one log query or `kubectl logs` finding, one alert rule, and one rollback.
7. **Security:** gitleaks clean, plus a short note on one risk they would fix next.

### Marking rubric (100)

| Area | Points |
|---|---|
| Git workflow and PR quality | 10 |
| CI pipeline (tests, scans, artifact) | 20 |
| Docker image (multi-stage, non-root, tagged) | 15 |
| Kubernetes / Helm deploy with health checks | 20 |
| Terraform (plan/apply, variables, state) | 15 |
| Monitoring, troubleshooting and rollback demo | 10 |
| Security awareness and documentation | 10 |

---

## Cost and clean-up (Azure labs)

The dev stack is roughly AKS Free tier plus 1–3 × D2s_v5 nodes, a B1ms Postgres, Basic ACR and Log Analytics. **Destroy it after each session**, or stop it: `az aks stop` and `az postgres flexible-server stop`. Never run the prod tfvars in a training subscription.
