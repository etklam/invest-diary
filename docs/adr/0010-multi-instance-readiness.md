# ADR-0010: Multi-instance readiness boundary

Status: Accepted

Date: 2026-09-05

## Context

The application is a Nuxt/Nitro modular monolith. Alert scheduling,
WebSocket broadcasting, and market-data caching currently live inside the app
process. `SCHEDULER_ENABLED=true` is therefore an operational switch, not a
leader-election mechanism.

## Decision

Keep the current deployment topology and make its invariant explicit:

- The web app has one active realtime/scheduler instance.
- The scheduler runs on exactly one instance.
- The WebSocket broadcaster is process-local.
- The market-data cache is process-local.
- The market-rotation CronJob invokes the shared batch domain functions
  directly and is secured by its deployment environment, not by an HTTP
  round-trip.

The runtime configuration module validates `SCHEDULER_ENABLED` as a typed
boolean and emits a startup warning when it is enabled. It does not attempt to
coordinate multiple replicas.

The current K3s manifest makes the invariant executable: the app Deployment
uses `replicas: 1`, `strategy: Recreate`, and explicitly sets
`SCHEDULER_ENABLED="true"`. This prevents an accidental zero-scheduler
deployment and avoids overlapping process-local scheduler instances during a
rollout. The Playwright E2E release gate and structured JSON error logging do
not change this topology; they verify and expose its behavior.

## Consequences

Accidentally enabling the scheduler on multiple app instances can duplicate
pushes, and horizontal realtime scaling is not supported by this contract.
Deployment changes must preserve one active scheduler/realtime instance until
the coordination boundary is redesigned.

Do not add Redis, BullMQ, a distributed lock, leader election, or a service
split as speculative infrastructure.

Runtime configuration caching was reviewed as part of the final reliability
pass and intentionally left unchanged. Tests mutate `process.env`, and Nuxt
build/runtime startup has distinct read timing; on-demand parsing is the safer
contract and is not a current performance blocker. The optional
`ErrorTrackingSink` is secondary telemetry; production alerting is based on
structured `LOG_FORMAT=json` records emitted to the cluster logging path.

## Future trigger

Revisit this ADR only when the web replica count must exceed one for an actual
availability or capacity requirement. That change should then design
distributed scheduler ownership, WebSocket fan-out, and market-data cache
coherence together rather than adding one mechanism in isolation.
