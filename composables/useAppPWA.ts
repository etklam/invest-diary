/**
 * useAppPWA Composable
 *
 * 統一管理 PWA 安裝狀態和方法
 * - 處理 beforeinstallprompt 事件
 * - 管理安裝狀態
 * - 管理 Service Worker 更新
 *
 * 注意：@vite-pwa/nuxt 已提供 usePWA，此處命名為 useAppPWA 以避免衝突
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface NavigatorStandalone extends Navigator {
  standalone?: boolean
}

const devLog = (...args: unknown[]) => {
  if (import.meta.dev) {
    console.log(...args)
  }
}

// 全域狀態（跨元件共享）
const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
const isInstalled = ref(false)
const canInstall = ref(false)
const needRefresh = ref(false)

// 避免重複註冊事件監聽器
let isInitialized = false

export const useAppPWA = () => {
  const { $pwa } = useNuxtApp()

  // 初始化（只執行一次）
  const init = () => {
    if (isInitialized || !import.meta.client) return
    isInitialized = true

    // 檢查是否已安裝
    checkIfInstalled()

    // 監聽 beforeinstallprompt 事件
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // 監聽 appinstalled 事件
    window.addEventListener('appinstalled', handleAppInstalled)
  }

  // 檢查是否已安裝
  const checkIfInstalled = () => {
    // 檢查是否在 standalone 模式下運行
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as NavigatorStandalone).standalone === true
    
    isInstalled.value = isStandalone
  }

  // 處理 beforeinstallprompt 事件
  const handleBeforeInstallPrompt = (e: Event) => {
    e.preventDefault()
    deferredPrompt.value = e as BeforeInstallPromptEvent
    canInstall.value = true
  }

  // 處理安裝完成事件
  const handleAppInstalled = () => {
    deferredPrompt.value = null
    canInstall.value = false
    isInstalled.value = true
  }

  // 安裝應用程式
  const install = async (): Promise<boolean> => {
    if (!deferredPrompt.value) {
      return false
    }

    try {
      // 顯示安裝提示
      await deferredPrompt.value.prompt()

      // 等待用戶回應
      const { outcome } = await deferredPrompt.value.userChoice

      if (outcome === 'accepted') {
        devLog('[PWA] User accepted the install prompt')
        return true
      } else {
        devLog('[PWA] User dismissed the install prompt')
        return false
      }
    } catch (error) {
      devLog('[PWA] Install error:', error)
      return false
    } finally {
      deferredPrompt.value = null
      canInstall.value = false
    }
  }

  // 檢查是否需要更新
  const checkForUpdate = () => {
    if ($pwa && typeof $pwa.needRefresh !== 'undefined') {
      needRefresh.value = $pwa.needRefresh
    }
  }

  // 更新 Service Worker
  const updateServiceWorker = () => {
    if ($pwa && typeof $pwa.updateServiceWorker === 'function') {
      $pwa.updateServiceWorker()
    }
    needRefresh.value = false
  }

  // 監聽 $pwa 狀態變化
  watch(
    () => $pwa?.needRefresh,
    (value) => {
      if (value !== undefined) {
        needRefresh.value = value
      }
    },
    { immediate: true }
  )

  // 清理事件監聽器
  const cleanup = () => {
    if (import.meta.client) {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      isInitialized = false
    }
  }

  // 在客戶端初始化
  if (import.meta.client) {
    onMounted(() => {
      init()
    })

    onUnmounted(() => {
      cleanup()
    })
  }

  return {
    // 狀態
    isInstalled: readonly(isInstalled),
    canInstall: readonly(canInstall),
    needRefresh: readonly(needRefresh),
    
    // 方法
    install,
    updateServiceWorker,
    checkForUpdate
  }
}
