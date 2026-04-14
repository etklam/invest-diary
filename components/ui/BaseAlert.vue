<script setup lang="ts">
interface Props {
  variant?: 'info' | 'success' | 'warning' | 'error'
}

withDefaults(defineProps<Props>(), {
  variant: 'info',
})

const variantClasses = {
  info: 'border-semantic-info bg-surface-info text-copy',
  success: 'border-semantic-success bg-surface-success text-copy',
  warning: 'border-semantic-warning bg-surface-warning text-copy',
  error: 'border-semantic-error bg-surface-error text-copy',
}

const iconMap = {
  info: 'lucide:info',
  success: 'lucide:check-circle',
  warning: 'lucide:alert-triangle',
  error: 'lucide:alert-circle',
}
</script>

<template>
  <div
    class="flex items-start gap-3 p-4 border-l-[3px] border-solid rounded-none"
    :class="variantClasses[variant]"
  >
    <div class="mt-0.5 shrink-0">
      <Icon :name="iconMap[variant]" class="h-5 w-5 opacity-80" />
    </div>
    <div class="flex-1 text-sm leading-relaxed">
      <slot />
    </div>
  </div>
</template>
