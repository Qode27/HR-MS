# Branching and release process

We use **trunk-based development with short-lived branches**. `main` is always deployable.

```
main ──●──────●──────●───────●──────────●──  (every merge -> dev automatically)
        \    /        \     /            \
         feat/PF-123   fix/PF-130         release/1.4 ── tag v1.4.0 -> staging -> prod
```

## Branch names

| Prefix | Use | Example |
|---|---|---|
| `feat/` | new feature | `feat/PF-123-leave-carry-forward` |
| `fix/` | bug fix | `fix/PF-130-payslip-rounding` |
| `chore/` | tooling, deps, CI | `chore/bump-prisma-5-22` |
| `hotfix/` | urgent prod fix, branched from the release tag | `hotfix/1.4.1-login-loop` |
| `release/` | stabilise a release (optional) | `release/1.4` |

## Rules on `main` (Azure Repos branch policy or GitHub ruleset)

- Merge through a pull request only. Direct pushes are blocked.
- At least 1 reviewer, and the author cannot approve their own PR.
- The `Validate` stage must pass (typecheck, unit tests, gitleaks, hadolint, helm lint).
- Comments must be resolved before merging.
- Squash merge, with the commit message following [Conventional Commits](https://www.conventionalcommits.org): `feat(leave): carry forward unused days`.

## Versioning

- SemVer `MAJOR.MINOR.PATCH`. Tags look like `v1.4.0`.
- Image tag = `<build number>-<git sha>`, for example `20261031.3-a1b2c3d`. It is immutable and traceable to a commit.
- The Helm chart `appVersion` is set to the image tag by `helm package --app-version`.

## Release flow

1. Merging to `main` runs CI and deploys to **dev** automatically.
2. When dev looks good, the pipeline waits on the **staging** approval. QA approves, the image is promoted, and smoke tests run.
3. Prod deploys need a change approval: the release manager approves the **prod** environment. The pipeline promotes the same digest and deploys with `--atomic`.
4. Tag the commit `vX.Y.Z` and write release notes (Conventional Commits make these easy to generate).

## Database changes

- Migrations must be **backward-compatible** with the previous app version. The old pods keep running while the `pre-upgrade` migration Job runs.
- Use expand → migrate → contract. First add the new column and deploy code that writes both. Later backfill and switch reads. Drop the old column in a later release.
- Never edit a migration that has already run in any shared environment.
