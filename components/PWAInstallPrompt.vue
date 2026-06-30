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
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="transform -translate-y-full opacity-0"
    enter-to-class="transform translate-y-0 opacity-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="transform translate-y-0 opacity-100"
    leave-to-class="transform -translate-y-full opacity-0"
  >
    <div
      v-if="showPrompt"
      class="fixed top-0 left-0 right-0 z-50 p-3 sm:p-4"
    >
      <div class="max-w-7xl mx-auto">
        <div class="rounded-2xl border shadow-dt-md" style="background: var(--color-primary); border-color: var(--color-primary-active);">
          <div class="flex items-center justify-between gap-3 sm:gap-4">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="relative flex-shrink-0">
                <img
                  src="/icon-192x192.png"
                  :alt="t('pwa.install.title')"
                  class="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl border border-white/30"
                >
                <div class="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-lg flex items-center justify-center shadow-dt-sm">
                  <Icon name="heroicons:arrow-down-solid" class="w-3 h-3 text-dt-primary" />
                </div>
              </div>

              <div class="min-w-0">
                <p class="font-semibold text-white text-sm sm:text-base">{{ t('pwa.install.title') }}</p>
                <p class="text-xs sm:text-sm text-white/85 truncate">{{ t('pwa.install.description') }}</p>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <button
                @click="handleDismiss"
                class="px-3 py-2 sm:px-4 text-xs sm:text-sm font-medium text-white hover:bg-white/15 rounded-dt-sm transition-colors duration-200 cursor-pointer"
              >
                {{ t('pwa.install.later') }}
              </button>
              <button
                @click="handleInstall"
                :disabled="isInstalling"
                class="px-4 py-2 sm:px-5 text-xs sm:text-sm font-medium bg-white text-dt-primary hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-dt-sm transition-colors duration-200 shadow-dt-sm cursor-pointer flex items-center gap-2"
              >
                <Icon v-if="isInstalling" name="svg-spinners:180-ring" class="w-4 h-4" />
                <Icon v-else name="heroicons:download-solid" class="w-4 h-4" />
                <span>{{ isInstalling ? '...' : t('pwa.install.install') }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
