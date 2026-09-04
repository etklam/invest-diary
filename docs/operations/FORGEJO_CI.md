# Forgejo CI and K3s deployment

The executable contract is [`.forgejo/workflows/build.yml`](../../.forgejo/workflows/build.yml).
This document describes the current release dependency chain; the workflow
remains the source of truth.

## Triggers and runner

- `pull_request` targeting `main`: runs `quality` only. This keeps the PR path
  on the existing fast quality and contract gates.
- Push to `main`: runs `quality`, then the full `e2e` job, then
  `build-push-deploy`.
- Runner label: `hk`.
- MariaDB contract image: `mariadb:11.4`.
- Playwright browser: Chromium, installed by the `e2e` job.

The deploy job cannot start unless both `quality` and `e2e` succeed. A skipped
or failed main-branch E2E therefore cannot reach registry login, image push, or
K3s rollout.

## Required secrets

Secrets are used only by the `build-push-deploy` job after both gates succeed:

| Secret | Purpose |
| --- | --- |
| `REGISTRY_TOKEN` | Authenticate Docker pushes to the Forgejo registry |
| `DEPLOY_SSH_KEY` | Restart and monitor the K3s deployment over SSH |

The `quality` and `e2e` jobs run before registry authentication. They do not
require or materialize deployment credentials.

## Quality job

The `quality` job installs dependencies and generated Prisma types, then runs:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run typecheck:tests`
4. `npm test -- --reporter=dot`
5. `npm run coverage:gate`
6. `npm run docs:check`
7. `npm run openapi:check`
8. `npm run openapi:breaking`
9. `npm run client:smoke`
10. `npm run test:socketio`
11. `npm run test:diary-reconciliation:mysql`
12. `npm run test:backend-http:mariadb`
13. `npm run test:market-rotation:mysql`

Each real database gate owns one disposable MariaDB lifecycle, has loopback
and test-database-name guards, checks the MariaDB version, applies migrations
deterministically, and removes its container with a shell trap. The Socket.IO
command explicitly enables the loopback listener test; generic `npm test` keeps
that environment-dependent listener suite skipped.

## Main-branch E2E job

The `e2e` job has `needs: quality` and runs only for a push to `main`:

1. Install dependencies and generate the Prisma client.
2. Install the Docker CLI and Chromium with its runner dependencies.
3. Run `npm run test:e2e`.
4. Upload `playwright-report/` and `test-results/` with a 14-day retention.

Playwright global setup starts exactly one disposable `mariadb:11.4`
container on a dynamically mapped loopback port, applies migrations, starts
the Nuxt test server, and removes the container on success or setup failure.
It does not reuse any quality-job database.

## Build, push, deploy job

The `build-push-deploy` job has `needs: [quality, e2e]` and runs only for a push
to `main`:

1. Install dependencies, generate Prisma client, and run `npm run build`.
2. Install the pinned Docker CLI, authenticate to `git.913555.xyz`, and build
   the image with the seven-character SHA and `latest` tags.
3. Verify `.prisma/client` exists in the image.
4. Restart `diary-vue-app` in K3s namespace `diary-vue` and wait for rollout.

This chain prevents a failing PR or main-branch browser regression from
reaching the registry or deployment.

## Operational checks

```bash
docker pull git.913555.xyz/etklam/invest-diary:latest
kubectl rollout status deployment/diary-vue-app -n diary-vue --timeout=120s
kubectl logs -n diary-vue deployment/diary-vue-app --since=1h
```

K3s manifests live under [`k8s/`](../../k8s). Production app and batch
containers set `LOG_FORMAT=json`; external cluster log collection should route
records with `level == "ERROR"` using `context.operation`, `context.requestId`
or `requestId`, `context.jobId`, `context.errorType`, and `context.error`.
Secrets and connection strings must never be sent to that signal path.

Historical runner setup notes and resolved incidents are archived under
`docs/archive/completed/`.
