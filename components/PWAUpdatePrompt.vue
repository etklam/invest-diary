<script setup lang="ts">
/**
 * PWA Update Prompt Component
 * 
 * 當有新版本時顯示更新提示
 */

const { t } = useI18n()
const { needRefresh, updateServiceWorker } = useAppPWA()

const showPrompt = ref(false)

// 監聽 needRefresh 狀態
watch(needRefresh, (value) => {
  showPrompt.value = value
}, { immediate: true })

// 更新應用程式
const handleUpdate = () => {
  updateServiceWorker()
  showPrompt.value = false
}

// 稍後更新
const handleDismiss = () => {
  showPrompt.value = false
}
</script>

<template>
  <Transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="transform translate-y-full opacity-0"
    enter-to-class="transform translate-y-0 opacity-100"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="transform translate-y-0 opacity-100"
    leave-to-class="transform translate-y-full opacity-0"
  >
    <div
      v-if="showPrompt"
      class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 p-4 bg-blue-600 dark:bg-blue-700 text-white rounded-lg shadow-lg"
    >
      <div class="flex items-center justify-between gap-3">
        <div class="flex-1">
          <p class="font-medium">{{ t('pwa.update.title') }}</p>
          <p class="text-sm opacity-90">{{ t('pwa.update.description') }}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button
            @click="handleDismiss"
            class="px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            {{ t('pwa.update.later') }}
          </button>
          <button
            @click="handleUpdate"
            class="px-3 py-1.5 text-sm font-medium bg-white text-blue-600 hover:bg-gray-100 rounded-lg transition-colors shadow-sm"
          >
            {{ t('pwa.update.refresh') }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
