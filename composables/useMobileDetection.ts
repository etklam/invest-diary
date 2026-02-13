import { ref, computed, onMounted, onUnmounted } from 'vue'

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

export function useMobileDetection() {
  // 響應式數據
  const screenWidth = ref(0)
  const screenHeight = ref(0)
  const orientation = ref<'portrait' | 'landscape'>('portrait')
  const isTouch = ref(false)
  const dpr = ref(1)
  const userAgent = ref('')

  // 計算屬性
  const isMobile = computed(() => {
    return screenWidth.value < 768 || (isTouch.value && screenWidth.value < 1024)
  })

  const isTablet = computed(() => {
    return screenWidth.value >= 768 && screenWidth.value < 1024
  })

  const isDesktop = computed(() => {
    return screenWidth.value >= 1024 && !isTouch.value
  })

  // 更新螢幕資訊
  const updateScreenInfo = () => {
    if (typeof window !== 'undefined') {
      screenWidth.value = window.innerWidth
      screenHeight.value = window.innerHeight
      orientation.value = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
      dpr.value = window.devicePixelRatio || 1
      userAgent.value = navigator.userAgent
    }
  }

  // 檢測觸控能力
  const detectTouchCapability = () => {
    if (typeof window !== 'undefined') {
      isTouch.value = (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        navigator.msMaxTouchPoints > 0
      )
    }
  }

  // 檢測裝置類型基於 User Agent
  const detectDeviceType = () => {
    if (typeof window === 'undefined') return

    const ua = userAgent.value.toLowerCase()
    
    // iOS 裝置
    const isIOS = /iphone|ipad|ipod/.test(ua)
    
    // Android 裝置
    const isAndroid = /android/.test(ua)
    
    // 平板檢測
    const isIPad = /ipad/.test(ua) || (isIOS && screenWidth.value >= 768)
    
    // 其他平板
    const isOtherTablet = /tablet|kindle|silk/.test(ua) || 
      (isAndroid && screenWidth.value >= 768)
    
    // 手機檢測
    const isMobileUA = /mobile|phone/.test(ua) && !isTablet.value
    
    return {
      isIOS,
      isAndroid,
      isIPad,
      isOtherTablet,
      isMobileUA
    }
  }

  // 獲取詳細裝置資訊
  const getDeviceInfo = (): DeviceInfo => {
    return {
      isMobile: isMobile.value,
      isTablet: isTablet.value,
      isDesktop: isDesktop.value,
      screenWidth: screenWidth.value,
      screenHeight: screenHeight.value,
      orientation: orientation.value,
      isTouch: isTouch.value,
      dpr: dpr.value,
      userAgent: userAgent.value
    }
  }

  // 處理螢幕方向變化
  const handleOrientationChange = () => {
    updateScreenInfo()
  }

  // 處理視窗大小變化
  const handleResize = () => {
    updateScreenInfo()
  }

  // 初始化
  const init = () => {
    updateScreenInfo()
    detectTouchCapability()
    
    if (typeof window !== 'undefined') {
      // 監聽視窗大小變化
      window.addEventListener('resize', handleResize)
      
      // 監聽螢幕方向變化
      window.addEventListener('orientationchange', handleOrientationChange)
      
      // 監聽媒體查詢變化
      const mediaQuery = window.matchMedia('(orientation: portrait)')
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleOrientationChange)
      } else {
        // 後備方案
        mediaQuery.addListener(handleOrientationChange)
      }
    }
  }

  // 清理
  const cleanup = () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleOrientationChange)
      
      const mediaQuery = window.matchMedia('(orientation: portrait)')
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleOrientationChange)
      } else {
        // 後備方案
        mediaQuery.removeListener(handleOrientationChange)
      }
    }
  }

  // 生命週期
  onMounted(() => {
    init()
  })

  onUnmounted(() => {
    cleanup()
  })

  // 立即初始化（如果在客戶端）
  if (typeof window !== 'undefined') {
    init()
  }

  return {
    // 響應式數據
    screenWidth,
    screenHeight,
    orientation,
    isTouch,
    dpr,
    userAgent,
    
    // 計算屬性
    isMobile,
    isTablet,
    isDesktop,
    
    // 方法
    getDeviceInfo,
    detectDeviceType,
    updateScreenInfo,
    
    // 工具方法
    isSmallScreen: computed(() => screenWidth.value < 640),
    isMediumScreen: computed(() => screenWidth.value >= 640 && screenWidth.value < 1024),
    isLargeScreen: computed(() => screenWidth.value >= 1024),
    
    // 斷點檢查
    isXS: computed(() => screenWidth.value < 640),
    isSM: computed(() => screenWidth.value >= 640 && screenWidth.value < 768),
    isMD: computed(() => screenWidth.value >= 768 && screenWidth.value < 1024),
    isLG: computed(() => screenWidth.value >= 1024 && screenWidth.value < 1280),
    isXL: computed(() => screenWidth.value >= 1280)
  }
}

// 全域實例
let globalMobileDetection: ReturnType<typeof useMobileDetection> | null = null

// 獲取全域實例
export function getMobileDetection() {
  if (!globalMobileDetection) {
    globalMobileDetection = useMobileDetection()
  }
  return globalMobileDetection
}

// 便捷的組合式函數
export function useIsMobile() {
  const { isMobile } = useMobileDetection()
  return isMobile
}

export function useIsTablet() {
  const { isTablet } = useMobileDetection()
  return isTablet
}

export function useIsDesktop() {
  const { isDesktop } = useMobileDetection()
  return isDesktop
}

export function useScreenSize() {
  const { screenWidth, screenHeight, orientation } = useMobileDetection()
  return { screenWidth, screenHeight, orientation }
}