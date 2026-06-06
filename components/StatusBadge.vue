<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    tone?: 'neutral' | 'success' | 'danger' | 'warning' | 'accent'
  }>(),
  {
    tone: 'neutral',
  }
)

const toneClass = computed(() => {
  return {
    neutral: 'border-dt-border bg-dt-bg text-dt-text-muted',
    success: 'border-green-500/30 bg-green-500/10 text-green-600',
    danger: 'border-red-500/30 bg-red-500/10 text-red-600',
    warning: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-700',
    accent: 'border-amber-500/30 bg-amber-500/10 text-amber-700',
  }[props.tone]
})
</script>

<template>
  <span
    class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
    :class="toneClass"
  >
    <slot />
  </span>
</template>
