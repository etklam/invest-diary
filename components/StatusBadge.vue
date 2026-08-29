<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    tone?: 'neutral' | 'success' | 'danger' | 'warning' | 'accent'
  }>(),
  {
    tone: 'neutral',
  }
)

// ponytail: accent and success share Terminal Green per DESIGN.md — same
// token, different semantic role. Border/bg use alpha-tinted token via
// color-mix so we don't have to maintain 5 fixed tint variants.
// Text uses -strong variants: AA (≥4.5:1) on the 10% tint in light mode.
const toneClass = computed(() => {
  const map: Record<string, string> = {
    neutral: 'border-dt-border bg-dt-surface-strong text-dt-text-muted',
    success: 'border-dt-success/30 bg-dt-success/10 text-dt-success-strong',
    danger: 'border-dt-danger/30 bg-dt-danger/10 text-dt-danger-strong',
    warning: 'border-dt-warning/30 bg-dt-warning/10 text-dt-warning-strong',
    accent: 'border-dt-success/30 bg-dt-success/10 text-dt-success-strong',
  }
  return map[props.tone] ?? map.neutral
})
</script>

<template>
  <span
    class="inline-flex items-center rounded-dt-pill border px-2 py-0.5 text-xs font-medium"
    :class="toneClass"
  >
    <slot />
  </span>
</template>
