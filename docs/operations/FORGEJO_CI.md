# Forgejo CI and K3s deployment

The executable contract is [`.forgejo/workflows/build.yml`](../../.forgejo/workflows/build.yml).
This document explains the split between source quality and deployment; the
workflow remains the source of truth.

## Triggers and runner

- `pull_request` targeting `main`: runs the complete quality/contract job.
- Push to `main`: runs the same quality job, then allows build/push/deploy.
- Runner label: `hk`.
- MariaDB contract image: `mariadb:11.4`.
- E2E is intentionally not a required PR gate yet. Its own disposable
  database lifecycle is available through `npm run test:e2e`; promote it only
  after the complete browser matrix is stable on the target runner.

## Required secrets

Secrets are used only by the `build-push-deploy` job after `quality` succeeds:

| Secret | Purpose |
| --- | --- |
| `REGISTRY_TOKEN` | Authenticate Docker pushes to the Forgejo registry |
| `DEPLOY_SSH_KEY` | Restart and monitor the K3s deployment over SSH |

The quality job runs before registry authentication. It does not require or
materialize deployment credentials.

## Required quality job

The quality job installs dependencies and generated Prisma types, then runs:

1. ESLint, production `vue-tsc`, and the strict `npm run typecheck:tests`
   allowlist for newly changed/critical contract tests.
2. The generic Vitest suite and the enforced coverage gate.
3. Documentation/OpenAPI drift and generated-client smoke checks.
4. The real Socket.IO contract (`npm run test:socketio`).
5. Disposable MariaDB 11.4 reconciliation, built Nitro HTTP, and Market
   Rotation boundary contracts.

Each database script has a loopback and test-database-name guard, checks the
MariaDB version, applies migrations deterministically, and removes its
container with a shell trap. The Socket.IO command explicitly enables the
loopback listener test; generic `npm test` keeps that environment-dependent
listener suite skipped so a restricted local sandbox cannot hide unrelated
unit failures.

## Build, push, deploy job

The second job has `needs: quality` and runs only for a push to `main`:

1. Install dependencies, generate Prisma client, and run `npm run build`.
2. Install the pinned Docker CLI, authenticate to `git.913555.xyz`, and build
   the image with the seven-character SHA and `latest` tags.
3. Verify `.prisma/client` exists in the image.
4. Restart `diary-vue-app` in K3s namespace `diary-vue` and wait for rollout.

This separation prevents registry/deployment failures from being confused with
quality failures and prevents a failing PR from reaching the registry.

## Operational checks

```bash
docker pull git.913555.xyz/etklam/invest-diary:latest
kubectl rollout status deployment/diary-vue-app -n diary-vue --timeout=120s
```

K3s manifests live under [`k8s/`](../../k8s). Historical runner setup notes
and resolved incidents are archived under `docs/archive/completed/`.
