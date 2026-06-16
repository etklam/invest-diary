<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    type?: 'button' | 'submit' | 'reset'
  }>(),
  {
    variant: 'primary',
    type: 'button',
  }
)

const variantClass = computed(() => {
  return {
    primary:
      'border-dt-primary bg-dt-primary text-white hover:opacity-90',
    secondary:
      'border-dt-border bg-transparent text-dt-text hover:bg-dt-surface-strong',
    ghost:
      'border-transparent bg-transparent text-dt-text-muted hover:text-dt-text',
    danger:
      'border-red-600 bg-red-600 text-white hover:opacity-90',
  }[props.variant]
})
</script>

<template>
  <button
    :type="type"
    class="inline-flex min-h-11 items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
    :class="variantClass"
  >
    <slot />
  </button>
</template>
