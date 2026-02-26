<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="translate-y-4 opacity-0 scale-95"
    enter-to-class="translate-y-0 opacity-100 scale-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100 scale-100"
    leave-to-class="translate-y-2 opacity-0 scale-95"
  >
    <div
      v-if="show"
      class="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 pointer-events-auto"
    >
      <div class="backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 rounded-2xl shadow-xl shadow-indigo-500/10 border border-white/40 dark:border-white/10 overflow-hidden">
        <div class="p-4">
          <div class="flex items-start gap-3">
            <!-- Animated bell icon -->
            <div class="flex-shrink-0 relative">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Icon name="heroicons:bell-solid" class="h-5 w-5 text-white animate-pulse" />
              </div>
              <!-- Notification dot -->
              <span class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></span>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-gray-900 dark:text-white">
                {{ $t('alert.title') || '提醒通知' }}
              </p>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {{ message }}
              </p>
            </div>

            <!-- Close button -->
            <button
              @click="close"
              class="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-all duration-200 cursor-pointer"
              :aria-label="$t('common.close') || '關閉'"
            >
              <Icon name="heroicons:x-mark" class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- Progress bar for auto-dismiss -->
        <div class="h-1 bg-gray-100 dark:bg-gray-800">
          <div
            ref="progressBar"
            class="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-100 ease-linear"
            :style="{ width: `${progress}%` }"
          ></div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const props = defineProps<{
  message: string
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const close = () => {
  emit('close')
}

// Progress bar animation (5 seconds)
const progress = ref(100)
const progressBar = ref<HTMLElement | null>(null)
let animationFrame: number | null = null
let startTime: number | null = null

const animate = (timestamp: number) => {
  if (!startTime) startTime = timestamp
  const elapsed = timestamp - startTime
  const duration = 5000 // 5 seconds

  progress.value = Math.max(0, 100 - (elapsed / duration) * 100)

  if (elapsed < duration) {
    animationFrame = requestAnimationFrame(animate)
  }
}

// Start animation when show becomes true
watch(() => props.show, (newVal) => {
  if (newVal) {
    progress.value = 100
    startTime = null
    animationFrame = requestAnimationFrame(animate)

    // Auto close after 5 seconds
    setTimeout(() => {
      close()
    }, 5000)
  } else {
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
  }
})

// Cleanup on unmount
onUnmounted(() => {
  if (animationFrame !== null) {
    cancelAnimationFrame(animationFrame)
  }
})
</script>
