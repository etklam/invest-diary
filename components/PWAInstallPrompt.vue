<script setup lang="ts">
/**
 * PWA Install Prompt Component
 * 
 * 顯示安裝提示，讓用戶可以將應用程式安裝到主畫面
 */

const { t } = useI18n()
const { canInstall, isInstalled, install } = useAppPWA()

const showPrompt = ref(false)
const isInstalling = ref(false)

// 7天內不再顯示的 key
const DISMISSED_KEY = 'pwa-install-dismissed'

// 檢查是否應該顯示提示
const shouldShowPrompt = computed(() => {
  // 如果已安裝或不能安裝，不顯示
  if (isInstalled.value || !canInstall.value) return false
  
  // 檢查是否在7天內被關閉過
  if (import.meta.client) {
    const dismissed = localStorage.getItem(DISMISSED_KEY)
    if (dismissed) {
      const daysSinceDismissal = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24)
      if (daysSinceDismissal < 7) return false
    }
  }
  
  return true
})

// 監聽 shouldShowPrompt 變化
watch(shouldShowPrompt, (value) => {
  showPrompt.value = value
}, { immediate: true })

// 安裝應用程式
const handleInstall = async () => {
  isInstalling.value = true
  try {
    const accepted = await install()
    if (accepted) {
      showPrompt.value = false
    }
  } finally {
    isInstalling.value = false
  }
}

// 關閉提示
const handleDismiss = () => {
  showPrompt.value = false
  // 記錄關閉時間
  if (import.meta.client) {
    localStorage.setItem(DISMISSED_KEY, Date.now().toString())
  }
}
</script>

<template>
  <Transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="transform -translate-y-full"
    enter-to-class="transform translate-y-0"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="transform translate-y-0"
    leave-to-class="transform -translate-y-full"
  >
    <div
      v-if="showPrompt"
      class="fixed top-0 left-0 right-0 z-50 p-4 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 shadow-lg"
    >
      <div class="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <img 
            src="/icon-192x192.png" 
            :alt="t('pwa.install.title')" 
            class="w-12 h-12 rounded-lg"
          >
          <div class="text-white">
            <p class="font-semibold">{{ t('pwa.install.title') }}</p>
            <p class="text-sm opacity-90">{{ t('pwa.install.description') }}</p>
          </div>
        </div>
        
        <div class="flex items-center gap-2 shrink-0">
          <button
            @click="handleDismiss"
            class="px-4 py-2 text-sm font-medium text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            {{ t('pwa.install.later') }}
          </button>
          <button
            @click="handleInstall"
            :disabled="isInstalling"
            class="px-4 py-2 text-sm font-medium bg-white text-blue-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm"
          >
            {{ isInstalling ? '...' : t('pwa.install.install') }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
