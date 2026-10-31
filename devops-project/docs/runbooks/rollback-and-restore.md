# Runbook – Rollback and database restore

## A. Roll back the application (minutes, no data loss)

The pipeline deploys with `helm upgrade --atomic`, so a deploy that fails its probes **rolls itself back**. Use the steps below when a release is "healthy" but behaves wrongly.

```bash
helm history peopleflow -n peopleflow
# REVISION  STATUS      APP VERSION            DESCRIPTION
# 41        superseded  20261030.2-9f8e7d6     Upgrade complete
# 42        deployed    20261031.1-a1b2c3d     Upgrade complete   <- bad
helm rollback peopleflow 41 -n peopleflow --wait
kubectl -n peopleflow rollout status deploy/peopleflow-web
devops-project/scripts/smoke-test.sh https://peopleflow.example.com
```

**Watch out:** a rollback does **not** undo database migrations. That is why migrations must be backward-compatible (see branching-and-release.md). If the old code cannot run on the new schema, fix forward instead.

Other ways to roll back:

- **Pipeline:** re-run the `Deploy_Prod` stage of the last good run. It redeploys that run's image tag.
- **Kustomize (kind lab):** `kubectl rollout undo deploy/peopleflow-web -n peopleflow`
- **Compose:** `git checkout v1.3.2 && make up` (rebuilds and restarts that version)

## B. Restore the database

Pick the smallest restore that fixes the problem.

### B1. Azure point-in-time restore (prod, staging)

Flexible Server keeps automatic backups for 7–35 days. The restore creates a **new server**, so the original is untouched.

```bash
az postgres flexible-server restore \
  -g rg-peopleflow-prod --name psql-peopleflow-prod-restore \
  --source-server <current-server-name> \
  --restore-time "2026-10-31T08:55:00Z"
```

Then:

1. Check the data on the restored server, through a jump box or a debug pod.
2. Either copy the affected tables back (a partial fix), or point the app at the new server. To do that, update the `database-url` and `direct-url` secrets in Key Vault. The CSI driver re-syncs them within about 2 minutes. Then restart the pods: `kubectl rollout restart deploy/peopleflow-web -n peopleflow`.
3. Move the new server into Terraform (`terraform import`), or rename it, so the code still matches what is running.

### B2. Logical restore from a `pg_dump` file (Compose, VM, kind)

```bash
# Backups come from scripts/db-backup.sh or `make backup`
sha256sum -c peopleflow_20261031T013000Z.dump.sha256
pg_restore --clean --if-exists --no-owner \
  --dbname="postgresql://peopleflow:***@localhost:5432/peopleflow_hr" \
  peopleflow_20261031T013000Z.dump
```

## C. Restore drill (do this every quarter, and on Day 3, block 3.5)

1. Take a backup of the lab DB.
2. Delete something on purpose: `DELETE FROM "Employee" WHERE ...`.
3. Restore into a **new** database, then compare row counts.
4. Write down how long it took. That is your real **RTO**. The backup age is your **RPO**.

| Environment | RPO target | RTO target | Mechanism |
|---|---|---|---|
| prod | 5 min | 1 h | PITR, zone-redundant HA, geo-redundant backup |
| staging | 24 h | 4 h | PITR (7 days) |
| lab / VM | 24 h | best effort | nightly `pg_dump` |
