# Runbook – Incident response

**Use when:** an alert fires (`PeopleFlowNoReadyPods`, `pod-restarts`, `app-errors`, high CPU) or users report the app is down or slow.

## 0. Declare and communicate (first 5 minutes)

1. Acknowledge the alert. You are the **Incident Commander (IC)** until you hand over.
2. Open an incident channel, for example `#inc-2026-10-31-login-errors`.
3. Set a severity:

| Sev | Meaning | Update cadence |
|---|---|---|
| SEV1 | Prod down, or payroll and data integrity at risk | every 15 min |
| SEV2 | Major feature broken, with a workaround | every 30 min |
| SEV3 | Minor, single tenant, or cosmetic | daily |

## 1. Triage – where is it broken?

Work from the outside in, one tier at a time.

```bash
# Edge -> app -> data, from your laptop
curl -sS -o /dev/null -w '%{http_code}\n' https://peopleflow.example.com/login
curl -sS https://peopleflow.example.com/api/health
curl -sS https://peopleflow.example.com/api/health/readiness   # 503 = DB problem

az aks get-credentials -g rg-peopleflow-prod -n aks-peopleflow-prod && kubelogin convert-kubeconfig -l azurecli
kubectl -n peopleflow get pods,deploy,hpa,ingress
kubectl -n peopleflow get events --sort-by=.lastTimestamp | tail -20
kubectl -n peopleflow logs deploy/peopleflow-web --since=15m | grep -iE 'error|unhandled' | tail -50
kubectl -n peopleflow top pods
helm history peopleflow -n peopleflow --max 5
```

| Symptom | Likely cause | Go to |
|---|---|---|
| Ingress returns 502/503, pods `0/1 Ready` | readiness failing, usually the DB | §2c |
| `CrashLoopBackOff` right after a deploy | bad release or missing secret | §2a |
| `OOMKilled` in `kubectl describe pod` | memory limit too low, or a leak | §2b |
| `ImagePullBackOff` | tag not in this env's ACR, promote failed | re-run the promote job |
| Migration Job failed, release stuck | migration error | §2d |
| Everything is slow, HPA at max | load spike or slow queries | §2b, then KQL query 7 |

## 2. Mitigate first, investigate later

**a) A bad release.** Roll back. This is the fastest fix and is safe because the image is immutable.

```bash
helm history peopleflow -n peopleflow
helm rollback peopleflow <LAST_GOOD_REVISION> -n peopleflow --wait
```

**b) Resource pressure.** Scale out, or raise the limits temporarily.

```bash
kubectl -n peopleflow scale deploy/peopleflow-web --replicas=6      # HPA will take over again
```

**c) Database.** Check the server state in the portal (Azure Database for PostgreSQL → peopleflow-prod → Overview, Metrics: CPU, connections, storage).

```bash
az postgres flexible-server show -g rg-peopleflow-prod -n <server> --query state
az postgres flexible-server restart -g rg-peopleflow-prod -n <server>   # last resort, causes a short outage
```

**d) A failed migration.** Read the Job logs. Do **not** delete rows or tables by hand. Fix forward with a new migration, or restore (see rollback-and-restore.md).

```bash
kubectl -n peopleflow logs job/$(kubectl -n peopleflow get jobs -o name | grep migrate | tail -1 | cut -d/ -f2)
```

## 3. Resolve and follow up

- Confirm recovery with `scripts/smoke-test.sh https://peopleflow.example.com` and watch the alert clear.
- Post a final update: impact, duration, the fix, and next steps.
- A postmortem (use `postmortem-template.md`) is required for SEV1 and SEV2 within 5 working days. It is blameless.
