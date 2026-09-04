# ADR-0010: Multi-instance readiness boundary

Status: Accepted

Date: 2026-09-04

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

## Consequences

Accidentally enabling the scheduler on multiple app instances can duplicate
pushes, and horizontal realtime scaling is not supported by this contract.
Deployment changes must preserve one active scheduler/realtime instance until
the coordination boundary is redesigned.

Do not add Redis, BullMQ, a distributed lock, leader election, or a service
split as speculative infrastructure.

## Future trigger

Revisit this ADR only when the web replica count must exceed one for an actual
availability or capacity requirement. That change should then design
distributed scheduler ownership, WebSocket fan-out, and market-data cache
coherence together rather than adding one mechanism in isolation.
