<template>
  <span class="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border" :class="badgeClass">
    {{ label }}
  </span>
</template>

<script setup lang="ts">
const props = defineProps<{
  sourceType: string
}>()

const { t } = useI18n()

const label = computed(() => {
  return t(`stock.watchlist.sourceTypes.${props.sourceType}`, props.sourceType)
})

const badgeClass = computed(() => {
  if (props.sourceType === 'TRADE_BASIC_DIARY') {
    return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900'
  }
  if (props.sourceType === 'VIDEO_TRANSCRIBE_SUMMARIZE') {
    return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900'
  }
  if (props.sourceType === 'ARTICLE') {
    return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900'
  }
  if (props.sourceType === 'DIARY') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900'
  }
  return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
})
</script>
