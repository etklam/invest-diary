import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const manifest = readFileSync(resolve(process.cwd(), 'k8s/03-app-deployment.yaml'), 'utf8')

describe('production app deployment contract', () => {
  it('keeps one active scheduler/realtime process and prevents rollout overlap', () => {
    expect(manifest).toContain('replicas: 1')
    expect(manifest).toContain('strategy:')
    expect(manifest).toContain('type: Recreate')
    expect(manifest).toContain('name: SCHEDULER_ENABLED')
    expect(manifest).toContain('value: "true"')
  })

  it('enables the structured production stdout signal with explicit runtime flags', () => {
    expect(manifest).toContain('name: LOG_FORMAT')
    expect(manifest).toContain('name: RUN_MIGRATIONS')
    expect(manifest).toContain('value: "false"')
    expect(manifest).toContain('name: TRUST_X_FORWARDED_FOR')
    expect(manifest).toContain('name: MARKET_DATA_CONCURRENCY')
  })
})
