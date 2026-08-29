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
      <div class="bg-dt-surface rounded-dt-md shadow-dt-lg border border-dt-border overflow-hidden">
        <!-- Header accent -->
        <div class="h-1 bg-dt-primary-solid"></div>

        <div class="p-4">
          <div class="flex items-start gap-4">
            <!-- Icon -->
            <div class="flex-shrink-0 w-12 h-12 bg-dt-primary-solid rounded-dt-sm flex items-center justify-center">
              <Icon name="heroicons:arrow-path-solid" class="w-6 h-6 text-white animate-spin-slow" />
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-dt-text text-sm">{{ t('pwa.update.title') }}</p>
              <p class="text-sm text-dt-text-muted mt-1">{{ t('pwa.update.description') }}</p>
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex items-center gap-2 mt-4">
            <button
              @click="handleDismiss"
              class="flex-1 px-4 py-2.5 text-sm font-medium text-dt-text hover:bg-dt-surface-strong rounded-dt-sm transition-colors duration-200 cursor-pointer"
            >
              {{ t('pwa.update.later') }}
            </button>
            <button
              @click="handleUpdate"
              class="flex-1 px-4 py-2.5 text-sm font-medium bg-dt-primary-solid text-white hover:opacity-90 rounded-dt-sm transition-opacity duration-200 cursor-pointer flex items-center justify-center gap-2"
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
