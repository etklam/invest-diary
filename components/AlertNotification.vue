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
      <div class="rounded-2xl border shadow-dt-md overflow-hidden" style="background: var(--color-surface); border-color: var(--color-border);">
        <div class="p-4">
          <div class="flex items-start gap-3">
            <!-- Bell icon -->
            <div class="flex-shrink-0 relative">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: color-mix(in srgb, var(--color-primary) 14%, transparent);">
                <Icon name="heroicons:bell-solid" class="h-5 w-5 text-dt-primary" />
              </div>
              <!-- Notification dot -->
              <span class="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2" style="background: var(--color-danger); border-color: var(--color-surface);"></span>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-dt-text">
                {{ $t('alert.title') || '提醒通知' }}
              </p>
              <p class="mt-1 text-sm text-dt-text-muted">
                {{ message }}
              </p>
            </div>

            <!-- Close button -->
            <button
              @click="close"
              class="flex-shrink-0 -m-2 min-h-11 min-w-11 rounded-lg flex items-center justify-center transition-colors duration-200 cursor-pointer"
              :style="{ color: 'var(--color-text-soft)' }"
              :aria-label="$t('common.close')"
            >
              <Icon name="heroicons:x-mark" class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- Progress bar for auto-dismiss -->
        <div class="h-1" style="background: var(--color-surface-strong);">
          <div
            ref="progressBar"
            class="h-full transition-all duration-100 ease-linear"
            :style="{ width: `${progress}%`, background: 'var(--color-primary)' }"
          ></div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
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
