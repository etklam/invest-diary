import { computed } from 'vue'
import { useWindowSize } from '@vueuse/core'

// ponytail: 用 useWindowSize（resize-driven）取代手寫 listener；
// 不用 useMediaQuery 是因 happy-dom 不會在 innerWidth 變動時 dispatch matchMedia change event
// Legacy helper for layouts/mobile.vue; the active default shell follows CSS `xl` (1280px).
export function useMobileDetection() {
  const { width: screenWidth } = useWindowSize()

  return {
    isMobile: computed(() => screenWidth.value < 768),
    isTablet: computed(() => screenWidth.value >= 768 && screenWidth.value < 1024),
  }
}
