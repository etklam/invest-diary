# Health checks

Diary Vue has two separate health mechanisms: a local verification script and a runtime HTTP endpoint. The repository does not currently install project-level pre-commit or pre-push hooks; run these commands manually or from CI.

## Commands

| Command | What it verifies |
| --- | --- |
| `npm run health:check` | `.env`, Prisma schema, TypeScript, tests, database connectivity, and generated Nuxt dependencies |
| `npm run health:full` | `health:check`, followed by a production build |
| `npm run health:quick` | Tests and Prisma schema validation |
| `npm run docs:check` | Markdown links, root-document policy, deprecated links, placeholders, and stale active plans |

`health:check` requires a configured `.env`, a reachable database, installed dependencies, and generated `.nuxt` metadata. A failure caused by one of these prerequisites is not equivalent to an application regression; read the named check in the summary.

## Runtime endpoint

```bash
curl http://localhost:3000/api/health
```

- HTTP `200`: server and database checks passed.
- HTTP `503`: the server is running but the database probe failed.

Healthy response shape:

```json
{
  "status": "healthy",
  "timestamp": "2026-08-07T00:00:00.000Z",
  "checks": {
    "database": {
      "status": "ok",
      "responseTime": 15
    },
    "server": {
      "status": "ok",
      "uptime": 3600,
      "environment": "production"
    }
  }
}
```

## Source of truth

- Local checks: [`scripts/health-check.ts`](../../scripts/health-check.ts)
- Runtime endpoint: [`server/api/health.get.ts`](../../server/api/health.get.ts)
- Package commands: [`package.json`](../../package.json)

Update this runbook whenever those contracts change. Do not document hooks or UI status components unless the corresponding project files exist.
