# Postmortem: <short title>

> Blameless. We look for **system** causes, not people to blame. "Why did the system let this happen?"

| | |
|---|---|
| Date | YYYY-MM-DD |
| Severity | SEV1 / SEV2 / SEV3 |
| Duration | detected HH:MM → mitigated HH:MM → resolved HH:MM (timezone) |
| Incident Commander | |
| Authors | |
| Status | Draft / In review / Final |

## Summary
Two or three sentences: what broke, who was affected, and how it was fixed.

## Impact
- Users and tenants affected:
- Features affected (login, payroll run, leave approvals, ...):
- Data loss or corruption: none / describe
- SLO error budget used:

## Timeline
| Time | Event |
|---|---|
| 09:02 | Deploy 20261031.1 reaches prod |
| 09:06 | `app-errors` alert fires |
| 09:10 | IC declared SEV2 |
| 09:14 | `helm rollback` to revision 41 |
| 09:16 | Errors back to baseline |

## Root cause (5 whys)
1. Why did users see errors? …
2. Why …?
3. …

## What went well
-

## What went badly / where we got lucky
-

## Action items
| # | Action | Type (prevent/detect/mitigate) | Owner | Due | Ticket |
|---|---|---|---|---|---|
| 1 | | | | | |
