<script setup lang="ts">
import { useEventListener } from '@vueuse/core'

interface Props {
  show?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  title?: string
  persistent?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  size: 'md',
  persistent: false,
})

const emit = defineEmits<{
  close: []
}>()

const titleId = useId()

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
}

// Body scroll lock
watch(() => props.show, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

onUnmounted(() => {
  document.body.style.overflow = ''
})

// Close on Escape key (skip if persistent)
useEventListener(document, 'keydown', (e) => {
  if (props.show && e.key === 'Escape' && !props.persistent) {
    emit('close')
  }
})

// Backdrop click handler (no-op if persistent)
const handleBackdropClick = () => {
  if (!props.persistent) {
    emit('close')
  }
}

// Focus trap
const modalRef = ref<HTMLElement>()
const focusableElements = ref<HTMLElement[]>([])

watch(() => props.show, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      if (modalRef.value) {
        const focusable = modalRef.value.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const elements = Array.from(focusable) as HTMLElement[]
        focusableElements.value = elements
        if (elements.length > 0) {
          elements[0]?.focus()
        }
      }
    })
  }
})

// Trap focus within modal
const handleTab = (event: KeyboardEvent) => {
  if (!props.show) return
  const elements = focusableElements.value
  if (!elements || elements.length === 0) return

  const firstElement = elements[0]
  const lastElement = elements[elements.length - 1]

  if (event.key === 'Tab') {
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault()
      lastElement?.focus()
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault()
      firstElement?.focus()
    }
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-fast ease-in-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-fast ease-in-out"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 z-overlay bg-black/40 backdrop-blur-sm"
        @click="handleBackdropClick"
      />
    </Transition>

    <Transition
      enter-active-class="transition-all duration-standard ease-in-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition-all duration-standard ease-in-out"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="show"
        ref="modalRef"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title ? titleId : undefined"
        tabindex="0"
        class="fixed inset-0 z-modal flex items-center justify-center p-4"
        @keydown="handleTab"
      >
        <div
          class="w-full bg-surface border border-line rounded-lg p-6 shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
          :class="[sizeClasses[size]]"
          @click.stop
        >
          <div v-if="title" class="flex items-center justify-between mb-4">
            <h2 :id="titleId" class="text-lg font-semibold text-copy">{{ title }}</h2>
            <button
              type="button"
              aria-label="Close"
              class="p-1 text-copy-muted hover:text-copy transition-colors"
              @click="emit('close')"
            >
              <Icon name="lucide:x" class="h-5 w-5" />
            </button>
          </div>
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
