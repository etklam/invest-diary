import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = resolve(__dirname, '../..')

const read = (relativePath: string) =>
  readFileSync(resolve(projectRoot, relativePath), 'utf-8')

describe('PWA regression guardrails', () => {
  // ponytail: source-scrape but guards real wiring regressions (init-flag
  // cleanup leak, layout install-prompt wiring). Behavioral tests would need
  // a mounted Vue/Nuxt harness — not worth the weight here.
  it('resets composable initialization flag on cleanup', () => {
    const source = read('composables/useAppPWA.ts')

    expect(source).toMatch(/const cleanup = \(\) => \{[\s\S]*isInitialized\s*=\s*false/)
  })

  it('wires layout top padding state to PWA install prompt visibility', () => {
    const source = read('layouts/default.vue')

    expect(source).toContain('const { canInstall } = useAppPWA()')
    expect(source).toMatch(/watch\(canInstall,[\s\S]*showInstallPrompt\.value\s*=\s*value/)
  })
})
