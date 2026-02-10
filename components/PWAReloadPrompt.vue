<script setup lang="ts">
import { ref, computed } from 'vue'

const showReloadPrompt = ref(false)
const offlineReady = ref(false)

// Safely get PWA instance
const pwa = computed(() => {
  try {
    return useNuxtApp().$pwa
  } catch {
    return null
  }
})

// Watch for offline ready state
watch(() => pwa.value?.offlineReady, (value) => {
  if (value) {
    offlineReady.value = true
    setTimeout(() => {
      offlineReady.value = false
    }, 5000)
  }
}, { immediate: true })

// The $pwa object also has needRefresh for new content
watch(() => pwa.value?.needRefresh, (value) => {
  showReloadPrompt.value = value === true
}, { immediate: true })

const reloadApp = () => {
  showReloadPrompt.value = false
  pwa.value?.updateServiceWorker?.()
}

const dismissPrompt = () => {
  showReloadPrompt.value = false
}
</script>

<template>
  <!-- Offline ready notification -->
  <Transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="transform translate-y-full opacity-0"
    enter-to-class="transform translate-y-0 opacity-100"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="transform translate-y-0 opacity-100"
    leave-to-class="transform translate-y-full opacity-0"
  >
    <div
      v-if="offlineReady"
      class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 p-4 bg-green-600 dark:bg-green-700 text-white rounded-lg shadow-lg"
    >
      <div class="flex items-center gap-3">
        <div class="flex-shrink-0">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div class="flex-1">
          <p class="font-medium">應用程式已準備離線使用</p>
          <p class="text-sm opacity-90">現在可以在沒有網路連線的情況下使用</p>
        </div>
      </div>
    </div>
  </Transition>

  <!-- New content available notification -->
  <Transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="transform translate-y-full opacity-0"
    enter-to-class="transform translate-y-0 opacity-100"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="transform translate-y-0 opacity-100"
    leave-to-class="transform translate-y-full opacity-0"
  >
    <div
      v-if="showReloadPrompt"
      class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 p-4 bg-blue-600 dark:bg-blue-700 text-white rounded-lg shadow-lg"
    >
      <div class="flex items-center justify-between gap-3">
        <div class="flex-1">
          <p class="font-medium">有新版本可用</p>
          <p class="text-sm opacity-90">點擊重新整理以獲取最新內容</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button
            @click="dismissPrompt"
            class="px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            稍後
          </button>
          <button
            @click="reloadApp"
            class="px-3 py-1.5 text-sm font-medium bg-white text-blue-600 hover:bg-gray-100 rounded-lg transition-colors shadow-sm"
          >
            重新整理
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
