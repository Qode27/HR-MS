# PeopleFlow HR – End-to-end DevOps project

A 3-day, hands-on, industry-style DevOps project built around **PeopleFlow HR**, the 3-tier HR application in this repository (Next.js + Prisma + PostgreSQL). Each folder matches one area of the DevOps syllabus. In 3 days students have taken the same application from `git push` through CI, containers, Kubernetes, Terraform-built Azure infrastructure, configuration management, monitoring and security scanning.

The application code is **not modified**. Everything DevOps lives in `devops-project/`, the way a platform team adds delivery tooling around a product team's repo.

```
HR-MS/                         <- application (product team)
├── src/  prisma/  tests/  package.json ...
└── devops-project/            <- delivery platform (this folder)
    ├── docker/                Dockerfile (multi-stage), .dockerignore, Compose 3-tier stack, NGINX
    ├── k8s/                   kind cluster config, Kustomize base + local overlay (Postgres StatefulSet)
    ├── helm/peopleflow/       Helm chart + values-{local,dev,staging,prod}.yaml
    ├── pipelines/             classroom CI (azure-pipelines-ci.yml) + production CI/CD, infra pipeline
    ├── terraform/             lab/ (2-min classroom lab) + production modules: AKS, ACR, Postgres, Key Vault
    ├── monitoring/            KQL queries (Log Analytics) + PrometheusRule alerts
    ├── security/              gitleaks, trivy, hadolint, checkov configs
    ├── scripts/               preflight, healthcheck, smoke test, DB backup, kind bootstrap
    ├── docs/                  architecture, branching/release, runbooks, postmortem, security findings
    ├── Makefile               one-line shortcuts for every lab (`make help`)
    └── LAB-GUIDE.md           3-day timed lab plan (+ 2-day variant)
```

## The application in three tiers

| Tier | What | Local | Azure |
|---|---|---|---|
| Web / edge | NGINX reverse proxy / ingress | Compose `proxy`, ingress-nginx on kind | AKS app-routing (managed NGINX) |
| Application | Next.js 15 UI and API (`/api/*`), Prisma | Compose `app`, Deployment `peopleflow-web` | Helm release on AKS, HPA, PDB |
| Data | PostgreSQL 16 | Compose `db`, StatefulSet | Azure Database for PostgreSQL Flexible Server (private) |

See [docs/architecture.md](docs/architecture.md) for diagrams and design decisions.

## Quick start (local, about 10 minutes)

```bash
cd HR-MS/devops-project
make preflight          # which tools are missing?
make up                 # builds images, runs migrations, starts proxy + app + db
make seed               # demo data
make health             # checks every tier
# open http://localhost:8080  ->  admin@peopleflow.local / Admin@123 (seed data, lab only)
```

On Kubernetes (kind):

```bash
make kind-up && make k8s-apply
# open http://peopleflow.localtest.me
```

## Course plan: 3 days (2-day variant included)

| Day | Theme | Syllabus days covered | Students finish with |
|---|---|---|---|
| 1 | Build and containerise | D1 DevOps intro, D2 Linux, D3 Networking/Bash, D4 Git, D5 Build/test, D9 Docker | the 3-tier app running in Docker, a merged PR |
| 2 | Automate and orchestrate | D6 CI, D7 CD, D10 Kubernetes/Helm | a green Azure Pipeline with an approval, the app on kind via Helm, a rollback |
| 3 | Infrastructure, operate, secure | D8 Azure, D11 Terraform, D12 Config & secrets (Terraform + Key Vault), D13 Monitoring, D14 DevSecOps, D15 Final project | Terraform resources, a secret from Key Vault, incidents fixed, a final demo |

**Follow [LAB-GUIDE.md](LAB-GUIDE.md)**: a timed, block-by-block plan with the exact commands. Its pre-course checklist matters, because installs and image downloads must happen before Day 1.

What runs in class and what is read as reference:

| Runs hands-on (laptop + free Azure DevOps + a small Azure sandbox) | Read as "what production looks like" |
|---|---|
| `docker/`, `scripts/`, `k8s/`, `helm/` (on kind) | `pipelines/azure-pipelines.yml` (dev → staging → prod on AKS) |
| `pipelines/azure-pipelines-ci.yml` (no Azure resources needed) | `terraform/` root and `modules/` (AKS, ACR, private Postgres, Key Vault) |
| `terraform/lab/` (RG + storage + Key Vault with generated secrets, ~2 min) | `monitoring/` (Log Analytics, Prometheus alerts) |
| `scripts/env-from-keyvault.sh` (app config pulled from Key Vault) | `pipelines/infra-pipeline.yml` (Terraform plan → approval → apply) |

Deeper per-topic exercises: `docs/reference/extended-labs-15-day.md`.

## Validation status

The YAML files, shell scripts and Kubernetes manifests were syntax-checked when this project was generated. `helm lint` and `terraform validate` could not run in the generation environment. Run `make helm-lint` and `make tf-fmt` (plus `terraform validate` in `terraform/lab`) once yourself before the first class.
