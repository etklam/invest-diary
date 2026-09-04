# ARCHIVED HISTORICAL AUDIT — DO NOT USE AS CURRENT STATUS

Audit baseline: `main@86994a7`（2026-09-01）

This document preserves the readiness assessment that preceded the native
session, OpenAPI, MariaDB, and integration-gate work completed in September
2026. It is evidence of the decisions and gaps considered at that time, not a
current release instruction. For the current status, read
[`docs/backend-readiness.md`](../../backend-readiness.md).

## Historical readiness conclusion

The baseline described the existing web backend as structurally sound but not
yet ready for a React Native client. Its headline assessment was:

> Overall backend readiness: **6.2/10 — Partially Ready**.

The historical blockers were native JSON session lifecycle, rotating refresh
tokens with family/replay semantics, complete public contract formalisation,
real Nitro + database coverage, and generated-client proof. The baseline
explicitly rejected a React Native UI rewrite, a second DTO layer, a duplicate
`/api/v1/**` route tree, Redis/BullMQ, microservices, push notifications, and a
full offline-first backend.

## Historical scorecard

| Area | Historical score | Historical status | Assessment at the time |
| --- | ---: | --- | --- |
| Overall | 6.2/10 | Partially Ready | Web stable; native and contract gates incomplete |
| Auth | 6/10 | Blocking | Bearer resource calls existed; native lifecycle was missing |
| Mobile compatibility | 5/10 | Blocking | No formal native login/refresh/logout contract |
| API contracts | 6/10 | In progress | Runtime schemas and OpenAPI coverage were incomplete |
| Persistence integrity | 7/10 | In progress | Several owner/state constraints still needed migration proof |
| Testing | 5/10 | Blocking | Most tests were mocked and did not exercise real HTTP/DB boundaries |
| Operations | 6/10 | In progress | Deployment and multi-instance assumptions needed an explicit policy |

## Historical target decisions

- Native clients would use JSON token pairs from
  `POST /api/auth/native/login`, rotating refresh through
  `POST /api/auth/native/refresh`, and family logout through
  `POST /api/auth/native/logout`.
- Refresh rotation would be no-grace: `A → B`; reuse of stale `A` would revoke
  the matching native family only. Logout-all would invalidate all sessions
  through `tokenVersion`.
- Web sessions would retain cookie transport and stable refresh behavior;
  native sessions would not emulate a browser cookie jar.
- Public IDs would be decimal strings, persisted Decimal values would remain
  strings unless a bounded projection explicitly chose numbers, Calendar Dates
  would use `YYYY-MM-DD`, and Instants would use UTC RFC 3339 `Z` values.
- Errors would expose HTTP status plus machine-readable `data.code` and
  `data.requestId`.
- REST would remain the source of truth; realtime would not become a required
  consistency channel. No push or offline sync engine was part of v1.

## Historical evidence and supersession

The baseline called for a canonical Zod → OpenAPI 3.1 → generated-client
pipeline, representative Bearer resource coverage, real MariaDB migration
checks, a real Socket.IO handshake test, and a CI quality dependency chain.
Those recommendations have since been implemented or deliberately classified
as non-blocking in the current readiness document.

The old recommendation to “make native auth a future task” is superseded. The
current document is the only source for the React Native / Expo readiness
decision.

