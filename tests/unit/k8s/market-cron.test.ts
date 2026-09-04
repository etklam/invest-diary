import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const manifest = readFileSync(resolve(process.cwd(), 'k8s/cron-market-rotation.yaml'), 'utf8')
const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>
}

describe('market batch CronJob contract', () => {
  it('runs rotation then daily breadth with the direct database environment', () => {
    expect(manifest).toContain('name: market-rotation-batch')
    expect(manifest).toContain('name: DATABASE_URL')
    expect(manifest).toContain('name: diary-vue-db-creds')
    expect(manifest).toContain('valueFrom:')
    expect(manifest).toContain('secretKeyRef:')
    expect(manifest).toContain('key: DATABASE_URL')
    expect(manifest.indexOf('scripts/market-rotation/run-batch.ts'))
      .toBeLessThan(manifest.indexOf('scripts/market-state/update-breadth.ts'))
    expect(manifest).not.toContain('/api/')
  })

  it('pins the tsx runner used by the CronJob and ships it in the pruned image', () => {
    // tsx 是 cron 的 runtime 工具,必須在 dependencies — prod image 會 npm prune --omit=dev
    expect(packageJson.dependencies?.tsx).toBe('4.21.0')
    expect(manifest).toContain('./node_modules/.bin/tsx')
  })
})
