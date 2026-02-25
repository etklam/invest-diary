/**
 * Web Vitals Monitoring Composable
 *
 * Tracks Core Web Vitals (LCP, FCP, CLS, FID, INP) for Real User Monitoring (RUM).
 * Based on web-vitals library: https://github.com/GoogleChrome/web-vitals
 *
 * Usage:
 * ```ts
 * const { metrics, sendToAnalytics } = usePerformance()
 * ```
 */

import { computed, onMounted, onUnmounted, readonly, ref } from 'vue'
import type { Metric, ReportCallback } from 'web-vitals'

// Types for Web Vitals metrics
export interface PerformanceMetrics {
  LCP?: number  // Largest Contentful Paint (target: < 2.5s)
  FCP?: number  // First Contentful Paint (target: < 1.8s)
  CLS?: number  // Cumulative Layout Shift (target: < 0.1)
  FID?: number  // First Input Delay (target: < 100ms)
  INP?: number  // Interaction to Next Paint (target: < 200ms)
  TTFB?: number // Time to First Byte (target: < 800ms)
}

// Rating helper
function getRating(value: number, thresholds: { good: number; needsImprovement: number }): string {
  if (value <= thresholds.good) return 'good'
  if (value <= thresholds.needsImprovement) return 'needs-improvement'
  return 'poor'
}

export const usePerformance = () => {
  const metrics = ref<PerformanceMetrics>({})
  let vitals: any = null

  /**
   * Log metric to console in development
   */
  const logMetric = (metric: Metric) => {
    const threshold = thresholdsByMetric[metric.name]
    const rating = threshold ? getRating(metric.value, threshold) : 'good'

    console.log(`[Web Vitals] ${metric.name}:`, {
      value: metric.value,
      rating,
      id: metric.id,
      navigationType: metric.navigationType
    })

    // Store in ref
    metrics.value[metric.name as keyof PerformanceMetrics] = metric.value
  }

  /**
   * Send metrics to analytics endpoint
   * Implement your analytics tracking here (Google Analytics, Plausible, etc.)
   */
  const sendToAnalytics = (metric: Metric) => {
    const threshold = thresholdsByMetric[metric.name]
    const rating = threshold ? getRating(metric.value, threshold) : 'good'

    // Example: Send to your analytics endpoint
    // $fetch('/api/analytics/web-vitals', {
    //   method: 'POST',
    //   body: {
    //     name: metric.name,
    //     value: metric.value,
    //     rating,
    //     id: metric.id,
    //     navigationType: metric.navigationType,
    //     url: window.location.href,
    //     userAgent: navigator.userAgent,
    //     timestamp: Date.now()
    //   }
    // })

    // Example: Send to Google Analytics 4
    // if (window.gtag) {
    //   window.gtag('event', metric.name, {
    //     value: metric.value,
    //     metric_id: metric.id,
    //     metric_rating: rating,
    //     custom_map: { [metric.name]: metric.name }
    //   })
    // }

    // Example: Send to Plausible
    // if (window.plausible) {
    //   window.plausible('web-vital', {
    //     props: {
    //       metric: metric.name,
    //       value: metric.value,
    //       rating
    //     }
    //   })
    // }

    logMetric(metric)
  }

  /**
   * Initialize Web Vitals monitoring
   * Only runs in browser (client-side)
   */
  const initPerformanceMonitoring = async () => {
    if (process.server) return

    try {
      // Dynamically import web-vitals to reduce initial bundle size
      const { onCLS, onFCP, onLCP, onTTFB, onINP } = await import('web-vitals')

      // Core Web Vitals
      onCLS(sendToAnalytics)
      onFCP(sendToAnalytics)
      onLCP(sendToAnalytics)
      onINP(sendToAnalytics)
      onTTFB(sendToAnalytics)

      vitals = { onCLS, onFCP, onLCP, onTTFB, onINP }
    } catch (error) {
      console.error('[Performance] Failed to load web-vitals:', error)
    }
  }

  onMounted(() => {
    // Only initialize in production or when explicitly enabled
    if (import.meta.env.PROD || import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true') {
      initPerformanceMonitoring()
    }
  })

  /**
   * Get performance rating for a metric
   */
  const getMetricRating = (metricName: keyof PerformanceMetrics): string | null => {
    const value = metrics.value[metricName]
    if (!value) return null

    const threshold = thresholdsByMetric[metricName]
    return threshold ? getRating(value, threshold) : null
  }

  /**
   * Check if all Core Web Vitals are in "good" range
   */
  const areCoreVitalsGood = computed(() => {
    const lcp = getMetricRating('LCP')
    const cls = getMetricRating('CLS')
    const inp = getMetricRating('INP')

    return lcp === 'good' && cls === 'good' && inp === 'good'
  })

  return {
    metrics: readonly(metrics),
    sendToAnalytics,
    getMetricRating,
    areCoreVitalsGood,
    initPerformanceMonitoring
  }
}
  const thresholdsByMetric: Record<string, { good: number; needsImprovement: number }> = {
    LCP: { good: 2500, needsImprovement: 4000 },
    FCP: { good: 1800, needsImprovement: 3000 },
    CLS: { good: 0.1, needsImprovement: 0.25 },
    FID: { good: 100, needsImprovement: 300 },
    INP: { good: 200, needsImprovement: 500 },
    TTFB: { good: 800, needsImprovement: 1800 }
  }

