import { computed, ref } from 'vue'
import { useWindowSize, useDevicePixelRatio } from '@vueuse/core'

export interface DeviceInfo {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  screenWidth: number
  screenHeight: number
  orientation: 'portrait' | 'landscape'
  isTouch: boolean
  dpr: number
  userAgent: string
}

// ponytail: 用 useWindowSize（resize-driven）取代手寫 listener；
// 不用 useMediaQuery 是因 happy-dom 不會在 innerWidth 變動時 dispatch matchMedia change event
export function useMobileDetection(_options: { manageLifecycle?: boolean } = {}) {
  const { width: screenWidth, height: screenHeight } = useWindowSize()
  const { pixelRatio: dpr } = useDevicePixelRatio()
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const isTouch =
    typeof navigator !== 'undefined' &&
    (navigator.maxTouchPoints > 0 || 'ontouchstart' in window)

  const isMobile = computed(() => screenWidth.value < 768)
  const isTablet = computed(() => screenWidth.value >= 768 && screenWidth.value < 1024)
  const isDesktop = computed(() => screenWidth.value >= 1024 && !isTouch)
  const orientation = computed<'portrait' | 'landscape'>(() =>
    screenWidth.value >= screenHeight.value ? 'landscape' : 'portrait',
  )

  const detectDeviceType = () => {
    if (typeof window === 'undefined') return undefined
    const ua = userAgent.toLowerCase()
    const isIOS = /iphone|ipad|ipod/.test(ua)
    const isAndroid = /android/.test(ua)
    return {
      isIOS,
      isAndroid,
      isIPad: /ipad/.test(ua) || (isIOS && screenWidth.value >= 768),
      isOtherTablet: /tablet|kindle|silk/.test(ua) || (isAndroid && screenWidth.value >= 768),
      isMobileUA: /mobile|phone/.test(ua) && !isTablet.value,
    }
  }

  const getDeviceInfo = (): DeviceInfo => ({
    isMobile: isMobile.value,
    isTablet: isTablet.value,
    isDesktop: isDesktop.value,
    screenWidth: screenWidth.value,
    screenHeight: screenHeight.value,
    orientation: orientation.value,
    isTouch,
    dpr: dpr.value,
    userAgent,
  })

  return {
    screenWidth,
    screenHeight,
    orientation,
    isTouch: ref(isTouch),
    dpr,
    userAgent,
    isMobile,
    isTablet,
    isDesktop,
    getDeviceInfo,
    detectDeviceType,
    isSmallScreen: computed(() => screenWidth.value < 640),
    isMediumScreen: computed(() => screenWidth.value >= 640 && screenWidth.value < 1024),
    isLargeScreen: computed(() => screenWidth.value >= 1024),
    isXS: computed(() => screenWidth.value < 640),
    isSM: computed(() => screenWidth.value >= 640 && screenWidth.value < 768),
    isMD: computed(() => screenWidth.value >= 768 && screenWidth.value < 1024),
    isLG: computed(() => screenWidth.value >= 1024 && screenWidth.value < 1280),
    isXL: computed(() => screenWidth.value >= 1280),
  }
}

// ponytail: 保留 API 形狀；@vueuse 的 useWindowSize 本身跨呼叫共享 listener
let globalMobileDetection: ReturnType<typeof useMobileDetection> | null = null
export function getMobileDetection() {
  if (!globalMobileDetection) globalMobileDetection = useMobileDetection()
  return globalMobileDetection
}
