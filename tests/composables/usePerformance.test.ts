import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'

vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue')>()
  return {
    ...actual,
    onMounted: (fn: () => void) => fn(),
    onUnmounted: (fn: () => void) => fn(),
  }
})

// Mock web-vitals module
vi.mock('web-vitals', () => ({
  onLCP: vi.fn((callback) => callback({ name: 'LCP', value: 2000, id: 'test-id', ratingThresholds: { good: 2500, needsImprovement: 4000 }, navigationType: 'navigate' })),
  onFID: vi.fn((callback) => callback({ name: 'FID', value: 50, id: 'test-id', ratingThresholds: { good: 100, needsImprovement: 300 }, navigationType: 'navigate' })),
  onCLS: vi.fn((callback) => callback({ name: 'CLS', value: 0.05, id: 'test-id', ratingThresholds: { good: 0.1, needsImprovement: 0.25 }, navigationType: 'navigate' })),
  onFCP: vi.fn((callback) => callback({ name: 'FCP', value: 1500, id: 'test-id', ratingThresholds: { good: 1800, needsImprovement: 3000 }, navigationType: 'navigate' })),
  onINP: vi.fn((callback) => callback({ name: 'INP', value: 100, id: 'test-id', ratingThresholds: { good: 200, needsImprovement: 500 }, navigationType: 'navigate' })),
  onTTFB: vi.fn((callback) => callback({ name: 'TTFB', value: 500, id: 'test-id', ratingThresholds: { good: 800, needsImprovement: 1800 }, navigationType: 'navigate' })),
}))

describe('usePerformance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(process as any).server = false
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('populates metrics via initPerformanceMonitoring', async () => {
    vi.resetModules()

    const { usePerformance } = await import('~/composables/usePerformance')
    const { metrics, initPerformanceMonitoring } = usePerformance()

    await initPerformanceMonitoring()
    await nextTick()

    expect(metrics.value.LCP).toBe(2000)
    expect(metrics.value.CLS).toBe(0.05)
    expect(metrics.value.INP).toBe(100)
  })

  it('returns correct metric ratings and core vitals status', async () => {
    vi.resetModules()

    const { usePerformance } = await import('~/composables/usePerformance')
    const { sendToAnalytics, getMetricRating, areCoreVitalsGood } = usePerformance()

    sendToAnalytics({
      name: 'LCP',
      value: 2000,
      id: 'lcp',
      ratingThresholds: { good: 2500, needsImprovement: 4000 },
      navigationType: 'navigate',
    } as any)

    sendToAnalytics({
      name: 'CLS',
      value: 0.05,
      id: 'cls',
      ratingThresholds: { good: 0.1, needsImprovement: 0.25 },
      navigationType: 'navigate',
    } as any)

    sendToAnalytics({
      name: 'INP',
      value: 100,
      id: 'inp',
      ratingThresholds: { good: 200, needsImprovement: 500 },
      navigationType: 'navigate',
    } as any)

    expect(getMetricRating('LCP')).toBe('good')
    expect(getMetricRating('CLS')).toBe('good')
    expect(getMetricRating('INP')).toBe('good')
    expect(areCoreVitalsGood.value).toBe(true)

    sendToAnalytics({
      name: 'INP',
      value: 800,
      id: 'inp2',
      ratingThresholds: { good: 200, needsImprovement: 500 },
      navigationType: 'navigate',
    } as any)

    expect(getMetricRating('INP')).toBe('poor')
    expect(areCoreVitalsGood.value).toBe(false)
  })

  it('returns null rating when metric is missing', async () => {
    vi.resetModules()

    const { usePerformance } = await import('~/composables/usePerformance')
    const { getMetricRating } = usePerformance()

    expect(getMetricRating('LCP')).toBeNull()
  })
})
