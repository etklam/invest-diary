<script setup lang="ts">
interface Props {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
})

const variantClasses = {
  default: 'border-line bg-surface-alt text-copy-secondary',
  success: 'border-semantic-success bg-surface-success text-semantic-success',
  warning: 'border-semantic-warning bg-surface-warning text-semantic-warning',
  error: 'border-semantic-error bg-surface-error text-semantic-error',
  info: 'border-semantic-info bg-surface-info text-semantic-info',
}
</script>

<template>
  <span
    class="inline-flex items-center px-2 py-0.5 text-xs font-medium border border-solid rounded-sm"
    :class="variantClasses[variant]"
  >
    <slot />
  </span>
</template>
