<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit' | 'reset'
}

withDefaults(defineProps<Props>(), {
  variant: 'secondary',
  size: 'md',
  disabled: false,
  loading: false,
  type: 'button',
})

const variantClasses = {
  primary: 'bg-accent text-copy-inverse border-accent hover:bg-accent-hover',
  secondary: 'bg-transparent text-copy border-line hover:bg-surface-alt hover:border-line-hover',
  ghost: 'bg-transparent text-copy border-transparent hover:bg-surface-alt hover:border-line',
  danger: 'bg-transparent text-semantic-error border-semantic-error hover:bg-surface-error',
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs min-h-[36px]',
  md: 'px-4 py-2.5 text-sm min-h-[44px]',
  lg: 'px-6 py-3 text-base min-h-[48px]',
}
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center font-medium transition-all duration-fast ease-in-out border border-solid rounded-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
    :class="[variantClasses[variant], sizeClasses[size]]"
  >
    <template v-if="loading">
      <div class="w-16 h-4 bg-current/10 animate-pulse rounded-sm" />
    </template>
    <slot v-else />
  </button>
</template>
