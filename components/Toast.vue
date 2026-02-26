<template>
  <div class="fixed inset-0 flex items-end justify-center px-4 py-6 pointer-events-none sm:p-6 sm:items-start sm:justify-end z-50 space-y-3">
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
      >
        <div class="backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 rounded-2xl shadow-xl border border-white/40 dark:border-white/10">
          <div class="p-4">
            <div class="flex items-start gap-3">
              <!-- Icon with animated background -->
              <div
                class="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200"
                :class="getIconBgClass(toast.type)"
              >
                <Icon :name="getIcon(toast.type)" class="h-5 w-5" :class="getIconClass(toast.type)" />
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0 pt-0.5">
                <p
                  class="text-sm font-medium"
                  :class="getTextClass(toast.type)"
                >
                  {{ toast.message }}
                </p>
              </div>

              <!-- Close button -->
              <button
                @click="removeToast(toast.id)"
                class="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-all duration-200 cursor-pointer"
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

const props = defineProps<{
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

const getIconBgClass = (type: string) => {
  switch (type) {
    case 'success': return 'bg-emerald-100 dark:bg-emerald-900/30'
    case 'error': return 'bg-red-100 dark:bg-red-900/30'
    case 'warning': return 'bg-amber-100 dark:bg-amber-900/30'
    default: return 'bg-blue-100 dark:bg-blue-900/30'
  }
}

const getIconClass = (type: string) => {
  switch (type) {
    case 'success': return 'text-emerald-600 dark:text-emerald-400'
    case 'error': return 'text-red-600 dark:text-red-400'
    case 'warning': return 'text-amber-600 dark:text-amber-400'
    default: return 'text-blue-600 dark:text-blue-400'
  }
}

const getTextClass = (type: string) => {
  switch (type) {
    case 'success': return 'text-gray-900 dark:text-emerald-50'
    case 'error': return 'text-gray-900 dark:text-red-50'
    case 'warning': return 'text-gray-900 dark:text-amber-50'
    default: return 'text-gray-900 dark:text-blue-50'
  }
}

const getToastWrapperClass = (type: string) => {
  // Add subtle colored shadow based on type
  switch (type) {
    case 'success':
      return 'shadow-emerald-500/10'
    case 'error':
      return 'shadow-red-500/10'
    case 'warning':
      return 'shadow-amber-500/10'
    default:
      return 'shadow-blue-500/10'
  }
}
</script>
