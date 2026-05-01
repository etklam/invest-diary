<template>
  <div class="fixed inset-0 flex items-end justify-center px-4 py-6 pointer-events-none sm:p-6 sm:items-start sm:justify-end z-50 space-y-3" role="status" aria-live="polite">
    <TransitionGroup
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="translate-y-4 opacity-0 scale-95"
      enter-to-class="translate-y-0 opacity-100 scale-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100 scale-100"
      leave-to-class="translate-y-2 opacity-0 scale-95"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="max-w-sm w-full pointer-events-auto overflow-hidden"
        :class="getToastWrapperClass(toast.type)"
        :role="toast.type === 'error' || toast.type === 'warning' ? 'alert' : 'status'"
      >
        <div class="backdrop-blur-xl rounded-2xl shadow-xl border" style="background: color-mix(in srgb, var(--color-surface) 92%, transparent); border-color: color-mix(in srgb, var(--color-border) 40%, transparent);">
          <div class="p-4">
            <div class="flex items-start gap-3">
              <!-- Icon with animated background -->
              <div
                class="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200"
                :style="getIconBgStyle(toast.type)"
              >
                <Icon :name="getIcon(toast.type)" class="h-5 w-5" :style="getIconStyle(toast.type)" />
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0 pt-0.5">
                <p
                  class="text-sm font-medium"
                  style="color: var(--color-text);"
                >
                  {{ toast.message }}
                </p>
              </div>

              <!-- Close button -->
              <button
                @click="removeToast(toast.id)"
                class="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer"
                style="color: var(--color-text-soft);"
                :aria-label="$t('common.close')"
              >
                <Icon name="heroicons:x-mark" class="h-4 w-4" />
              </button>
            </div>
          </div>

          </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import type { Toast } from '~/composables/useToast'

defineProps<{
  toasts: readonly Toast[]
}>()
const emit = defineEmits<{
  (e: 'remove', id: string): void
}>()

const removeToast = (id: string) => {
  emit('remove', id)
}

const getIcon = (type: string) => {
  switch (type) {
    case 'success': return 'heroicons:check-circle-solid'
    case 'error': return 'heroicons:x-circle-solid'
    case 'warning': return 'heroicons:exclamation-triangle-solid'
    default: return 'heroicons:information-circle-solid'
  }
}

const getSemanticColor = (type: string) => {
  switch (type) {
    case 'success': return 'var(--color-success)'
    case 'error': return 'var(--color-danger)'
    case 'warning': return 'var(--color-warning)'
    default: return 'var(--color-info)'
  }
}

const getIconBgStyle = (type: string) => {
  const c = getSemanticColor(type)
  return `background: color-mix(in srgb, ${c} 14%, transparent);`
}

const getIconStyle = (type: string) => {
  return `color: ${getSemanticColor(type)};`
}

const getToastWrapperClass = (_type: string) => {
  return ''
}
</script>
