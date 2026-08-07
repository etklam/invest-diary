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
| `FORGEJO_TOKEN` | Authenticate Docker pushes to the Forgejo registry |
| `DEPLOY_SSH_KEY` | Restart and monitor the K3s deployment over SSH |

## Pipeline

1. Install the pinned Docker CLI on the runner.
2. Check out the repository.
3. Log in to the Forgejo registry.
4. Build the image from the repository `Dockerfile`.
5. Push the SHA tag and `latest`.
6. Verify that the generated Prisma client exists inside the image.
7. Restart the K3s deployment and wait for rollout completion.

## Operational checks

```bash
docker pull git.913555.xyz/etklam/invest-diary:latest
kubectl rollout status deployment/diary-vue-app -n diary-vue --timeout=120s
```

The K3s manifests live under [`k8s/`](../../k8s). Historical runner setup notes and resolved incidents are archived under `docs/archive/completed/` and are not current configuration.
