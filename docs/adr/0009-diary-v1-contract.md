# ADR-0009: Diary and Diary Review v1 contract

Status: Accepted (2026-09-01)

## Decision

Diary `date` is a calendar value and crosses the wire only as `YYYY-MM-DD`.
UTC-noon remains an internal database representation. Every actual instant
crosses the wire as UTC RFC 3339 ending in `Z`; IDs and Decimal values are
strings.

Diary create/update/list and Diary Review use strict canonical Zod schemas and
explicit response mappers. Request names are camelCase. The undocumented
`days` list filter and `DiariesApiResponse` alias are removed before v1. List
pagination is offset-based (`page`, `limit`, maximum 100), returns `data` plus a
pagination envelope, and every ordering has an ID tie-breaker.

Diary Review is the Diary's one mutable current decision post-mortem. Its
lifecycle is `none -> pending -> reviewed`; a reviewed post-mortem may be edited
in place. Outcome is nullable so historical reviewed rows without a structured
outcome remain valid. Thesis Review is a different resource with its own
lifecycle.

MariaDB CHECK constraints enforce review vocabulary and lifecycle. A composite
foreign key from Transaction `(diary_id, user_id)` to Diary `(id, user_id)`
makes the denormalized owner copy unable to drift. The migration audits and
repairs legacy rows before enabling those constraints and has an operational
rollback verified on MariaDB 11.4.

## Breaking wire

- Diary date: ISO UTC-noon instant -> `YYYY-MM-DD`.
- Transaction/alert input: `trade_date`, `trigger_at`, `recurring_mode` ->
  `tradeDate`, `triggerAt`, `recurringMode`.
- Unknown list query parameters, including `days`, now return `400`.
- Diary create returns `201`.
