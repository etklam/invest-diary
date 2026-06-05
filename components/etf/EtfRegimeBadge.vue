<script setup lang="ts">
const props = defineProps<{
  regimeFit: string | null
}>()

const badgeClass = computed(() => {
  if (props.regimeFit === 'Leader in Risk-On') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200'
  }
  if (props.regimeFit === 'Defensive Relative Strength') {
    return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-200'
  }
  if (props.regimeFit === 'Lagging Sector') {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200'
  }
  if (props.regimeFit === 'Oversold Reclaim Watch') {
    return 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-400/20 dark:bg-purple-400/10 dark:text-purple-200'
  }
  if (props.regimeFit === 'Extended / Avoid Chasing') {
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200'
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
