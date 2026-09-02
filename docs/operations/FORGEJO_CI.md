# Forgejo CI and K3s deployment

The current deployment workflow is defined in [`.forgejo/workflows/build.yml`](../../.forgejo/workflows/build.yml). This document summarizes that executable contract; the workflow remains the source of truth.

## Trigger and runner

- Trigger: push to `main`
- Runner label: `hk`
- Registry: `git.913555.xyz`
- Image tags: seven-character commit SHA and `latest`
- Deployment target: K3s namespace `diary-vue`, deployment `diary-vue-app`

## Required secrets

| Secret | Purpose |
| --- | --- |
| `REGISTRY_TOKEN` | Authenticate Docker pushes to the Forgejo registry |
| `DEPLOY_SSH_KEY` | Restart and monitor the K3s deployment over SSH |

## Pipeline

1. Check out the repository.
2. Install npm dependencies from `package-lock.json`.
3. Generate Prisma and run lint, typecheck, the required test suite, docs
   health, OpenAPI drift, generated-client drift, and client smoke checks.
4. Install the pinned Docker CLI and run the real Nitro + MariaDB 11.4
   migration/HTTP contract gate.
5. Only after all checks pass, log in to the Forgejo registry and build the
   image from the repository `Dockerfile`.
6. Push the SHA tag and `latest`.
7. Verify that the generated Prisma client exists inside the image.
8. Restart the K3s deployment and wait for rollout completion.

The quality gate runs before registry authentication, so secrets are not
available to the source/test/generation steps and are never written to an
artifact. The OpenAPI JSON and generated TypeScript file are committed
artifacts; `npm run openapi:check` fails when either one differs from the
canonical source.

## Operational checks

```bash
docker pull git.913555.xyz/etklam/invest-diary:latest
kubectl rollout status deployment/diary-vue-app -n diary-vue --timeout=120s
```

The K3s manifests live under [`k8s/`](../../k8s). Historical runner setup notes and resolved incidents are archived under `docs/archive/completed/` and are not current configuration.
