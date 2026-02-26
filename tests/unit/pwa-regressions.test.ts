import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = resolve(__dirname, '../..')

const read = (relativePath: string) =>
  readFileSync(resolve(projectRoot, relativePath), 'utf-8')

describe('PWA regression guardrails', () => {
  it('resets composable initialization flag on cleanup', () => {
    const source = read('composables/useAppPWA.ts')

    expect(source).toMatch(/const cleanup = \(\) => \{[\s\S]*isInitialized\s*=\s*false/)
  })

  it('wires layout top padding state to PWA install prompt visibility', () => {
    const source = read('layouts/default.vue')

    expect(source).toContain('const { canInstall } = useAppPWA()')
    expect(source).toMatch(/watch\(canInstall,[\s\S]*showInstallPrompt\.value\s*=\s*value/)
  })

  it('documents runtime caching behavior consistently with nuxt.config.ts', () => {
    const source = read('README.md')

    expect(source).not.toContain('❌ No offline-first caching (to avoid stale investment data)')
    expect(source).not.toContain('Minimal Workbox setup (no runtime caching)')
  })
})
