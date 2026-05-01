import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

describe('hand-written API documentation', () => {
  it('documents priority API groups without adding swagger runtime dependencies', async () => {
    const apiDocs = await readFile(resolve(process.cwd(), 'docs/API.md'), 'utf8')
    const packageJson = await readFile(resolve(process.cwd(), 'package.json'), 'utf8')
    const dependencies = JSON.parse(packageJson).dependencies ?? {}

    expect(apiDocs).toContain('# API Reference')
    expect(apiDocs).toContain('## Auth')
    expect(apiDocs).toContain('## Diaries')
    expect(apiDocs).toContain('## API Keys')
    expect(apiDocs).toContain('## Agent')
    expect(apiDocs).toContain('## Stocks')
    expect(apiDocs).toContain('POST /api/auth/login')
    expect(apiDocs).toContain('POST /api/agent/diaries')
    expect(apiDocs).toContain('DELETE /api/api-keys/{id}')
    expect(apiDocs).toContain('"scope": "AGENT_WRITE"')
    expect(apiDocs).toContain('"idempotencyKey": "ana:aapl:2026-05-01"')
    expect(apiDocs).toContain('"occurredAt": "2026-05-01T00:00:00.000Z"')
    expect(apiDocs).not.toContain('"scopes":')
    expect(apiDocs).not.toContain('"recordedAt":')
    expect(dependencies).not.toHaveProperty('nuxt-swagger')
    expect(dependencies).not.toHaveProperty('swagger-ui')
  })
})
