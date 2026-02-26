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
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="transform translate-y-8 opacity-0 scale-95"
    enter-to-class="transform translate-y-0 opacity-100 scale-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="transform translate-y-0 opacity-100 scale-100"
    leave-to-class="transform translate-y-8 opacity-0 scale-95"
  >
    <div
      v-if="showPrompt"
      class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50"
    >
      <div class="backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 rounded-2xl shadow-xl shadow-indigo-500/10 border border-white/40 dark:border-white/10 overflow-hidden">
        <!-- Header with gradient accent -->
        <div class="h-1 bg-gradient-to-r from-indigo-500 to-purple-600"></div>

        <div class="p-4">
          <div class="flex items-start gap-4">
            <!-- Icon with gradient background -->
            <div class="flex-shrink-0 relative">
              <div class="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl blur-lg opacity-40"></div>
              <div class="relative w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Icon name="heroicons:arrow-path-solid" class="w-6 h-6 text-white animate-spin-slow" />
              </div>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-gray-900 dark:text-white text-sm">{{ t('pwa.update.title') }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">{{ t('pwa.update.description') }}</p>
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex items-center gap-2 mt-4">
            <button
              @click="handleDismiss"
              class="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-200 cursor-pointer"
            >
              {{ t('pwa.update.later') }}
            </button>
            <button
              @click="handleUpdate"
              class="flex-1 px-4 py-2.5 text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25 cursor-pointer flex items-center justify-center gap-2"
            >
              <Icon name="heroicons:arrow-path-solid" class="w-4 h-4" />
              {{ t('pwa.update.refresh') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
@keyframes spin-slow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin-slow {
  animation: spin-slow 3s linear infinite;
}
</style>
