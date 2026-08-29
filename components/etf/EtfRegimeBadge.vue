<script setup lang="ts">
const props = defineProps<{
  regimeFit: string | null
}>()

const badgeClass = computed(() => {
  if (props.regimeFit === 'Leader in Risk-On') {
    return 'border-dt-success/20 bg-dt-success/10 text-dt-success-strong'
  }
  if (props.regimeFit === 'Defensive Relative Strength') {
    return 'border-dt-info/20 bg-dt-info/10 text-dt-info'
  }
  if (props.regimeFit === 'Lagging Sector') {
    return 'border-dt-warning/20 bg-dt-warning/10 text-dt-warning-strong'
  }
  if (props.regimeFit === 'Oversold Reclaim Watch') {
    return 'border-dt-primary/20 bg-dt-primary/10 text-dt-primary'
  }
  if (props.regimeFit === 'Extended / Avoid Chasing') {
    return 'border-dt-danger/20 bg-dt-danger/10 text-dt-danger-strong'
  }
  return ''
})
</script>

<template>
  <span
    v-if="regimeFit"
    class="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold"
    :class="badgeClass"
  >
    {{ regimeFit }}
  </span>
</template>
