import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue')>()
  return {
    ...actual,
    onMounted: (fn: () => void) => fn(),
  }
})

const registerSpy = vi.fn()
vi.mock('web-vitals', () => ({
  onCLS: registerSpy,
  onFCP: registerSpy,
  onLCP: registerSpy,
  onINP: registerSpy,
  onTTFB: registerSpy,
}))

describe('usePerformance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(process as any).server = false
  })

  it('registers web-vitals callbacks when flag enabled', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_ENABLE_PERFORMANCE_MONITORING', 'true')
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const { usePerformance } = await import('~/composables/usePerformance')
    usePerformance()

    await new Promise((r) => setTimeout(r, 0))

    expect(registerSpy).toHaveBeenCalled()
    vi.unstubAllEnvs()
  })

  it('skips on server', async () => {
    vi.resetModules()
    ;(process as any).server = true
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const { usePerformance } = await import('~/composables/usePerformance')
    usePerformance()

    await new Promise((r) => setTimeout(r, 0))
    expect(logSpy).not.toHaveBeenCalled()
    logSpy.mockRestore()
    ;(process as any).server = false
  })
})
