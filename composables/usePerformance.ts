import { onMounted } from 'vue'
import type { Metric } from 'web-vitals'

export const usePerformance = () => {
  onMounted(() => {
    if (process.server) return
    if (!import.meta.env.PROD && import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING !== 'true') return

    import('web-vitals')
      .then(({ onCLS, onFCP, onLCP, onINP, onTTFB }) => {
        const log = (m: Metric) => console.log('[Web Vitals]', m.name, m.value)
        onCLS(log); onFCP(log); onLCP(log); onINP(log); onTTFB(log)
      })
      .catch((e) => console.error('[Performance] Failed:', e))
  })
}
