# Enforce One Diary Per User Date

Status: ready-for-human
Implementation: completed in `c0a2ba7`; production gate pending
Type: HITL

## Parent

[Diary UX Reliability PRD](../../diary-ux-reliability/PRD.md)

## What to build

Make the product rule of one Diary per user-local date an enforceable data invariant. Creating concurrent Diaries or moving an existing Diary onto an occupied date must produce one deterministic winner and a recoverable conflict response instead of duplicate records.

Before enforcement, a human maintainer must approve how any existing duplicates are reconciled. The selected policy must preserve user-authored content and related Transactions and Alerts, with an auditable migration outcome.

## Acceptance criteria

- [ ] A documented reconciliation report identifies whether duplicate user/date pairs already exist. The repository audit command is ready; it has not been run against production.
- [ ] A human-approved policy defines whether each duplicate set is merged, retained under a new date, or otherwise resolved without silent data loss. Human approval is still required before production migration.
- [x] The repository migration enforces uniqueness for a user and normalized Diary date.
- [x] Concurrent creates for the same user/date leave exactly one Diary and return a conflict for the losing request.
- [x] Updating a Diary to an occupied date returns a structured conflict without changing either Diary.
- [x] Date lookup and append behavior remain deterministic after the migration.
- [x] Migration, create, update, append, and concurrency regression tests pass.

## Blocked by

Production duplicate audit and human approval of the reconciliation policy before the final uniqueness migration is applied.

## Comments

Implementation is complete: the schema and migrations add the normalized user/date uniqueness constraint plus an audit model; duplicate audit/reconciliation tooling preserves canonical content, unions tags, reparents child records, and records an audit trail; create/update/append paths map uniqueness races to structured conflicts.

Operational gate: run `npm run diary:duplicates:audit`, approve the reconciliation policy, run `npm run diary:duplicates:reconcile -- --apply --migration-id=<id>`, and only then apply the final uniqueness migration in production. No production database was available in this workspace.

Verification: diary write, migration contract, and reconciliation tooling typecheck/tests passed; full `npm test`, lint, and build passed.
