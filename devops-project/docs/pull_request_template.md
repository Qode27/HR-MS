<!-- Copy to the repo root as .azuredevops/pull_request_template.md (Azure Repos)
     or .github/pull_request_template.md (GitHub). -->

## What and why
<!-- One or two sentences. Link the work item: AB#123 / PF-123 -->

## Type
- [ ] feat  - [ ] fix  - [ ] chore / CI  - [ ] infra (terraform / helm)  - [ ] docs

## How was it tested?
- [ ] Unit tests added or updated (`npm test`)
- [ ] Ran locally with `make up` (Compose) or on kind
- [ ] For infra: `terraform plan` output attached / reviewed

## Database
- [ ] No schema change
- [ ] Adds a migration that is **backward-compatible** with the previous release (expand/contract)

## Risk and rollback
<!-- What could break? How do we roll back? (helm rollback / feature flag / revert) -->

## Checklist
- [ ] No secrets, `.env` files or credentials in the diff
- [ ] Config changes are added to Helm `values*.yaml` and `.env.example`
- [ ] Docs and runbooks updated if behaviour changed
