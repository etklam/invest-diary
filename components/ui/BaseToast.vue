<script setup lang="ts">
interface Props {
  show?: boolean
  variant?: 'info' | 'success' | 'warning' | 'error'
  message?: string
  duration?: number
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  variant: 'info',
  message: '',
  duration: 4000,
})

const emit = defineEmits<{
  close: []
}>()

const variantClasses = {
  info: 'border-semantic-info bg-surface-raised',
  success: 'border-semantic-success bg-surface-raised',
  warning: 'border-semantic-warning bg-surface-raised',
  error: 'border-semantic-error bg-surface-raised',
}

const iconMap = {
  info: 'lucide:info',
  success: 'lucide:check-circle',
  warning: 'lucide:alert-triangle',
  error: 'lucide:alert-circle',
}

// error/warning demand immediate attention; info/success can wait
const ariaLive = computed(() =>
  props.variant === 'error' || props.variant === 'warning' ? 'assertive' : 'polite'
)

// Auto-dismiss for info/success — single timeout, always cleaned up
const timeoutId = ref<ReturnType<typeof setTimeout> | null>(null)

const clearPendingTimeout = () => {
  if (timeoutId.value !== null) {
    clearTimeout(timeoutId.value)
    timeoutId.value = null
  }
}

const handleClose = () => {
  clearPendingTimeout()
  emit('close')
}

watchEffect((onCleanup) => {
  if (props.show && (props.variant === 'info' || props.variant === 'success')) {
    timeoutId.value = setTimeout(() => {
      emit('close')
    }, props.duration)
  }

  onCleanup(() => {
    clearPendingTimeout()
  })
})

onUnmounted(() => {
  clearPendingTimeout()
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-fast ease-in-out"
      enter-from-class="translate-y-4 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition-all duration-fast ease-in-out"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-4 opacity-0"
    >
      <div
        v-if="show"
        role="alert"
        :aria-live="ariaLive"
        aria-atomic="true"
        class="fixed bottom-4 right-4 z-toast max-w-[360px] border-l-[3px] border-solid p-3 shadow-sm"
        :class="variantClasses[variant]"
      >
        <div class="flex items-start gap-3">
          <Icon :name="iconMap[variant]" class="h-5 w-5 shrink-0 mt-0.5 opacity-80" />
          <p class="flex-1 text-sm text-copy">{{ message }}</p>
          <button
            type="button"
            aria-label="Close"
            class="p-1 text-copy-muted hover:text-copy transition-colors"
            @click="handleClose"
          >
            <Icon name="lucide:x" class="h-4 w-4" />
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
