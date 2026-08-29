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
    return 'bg-dt-primary/10 text-dt-primary border-dt-primary/20'
  }
  if (props.sourceType === 'VIDEO_TRANSCRIBE_SUMMARIZE') {
    return 'bg-dt-info/10 text-dt-info border-dt-info/20'
  }
  if (props.sourceType === 'ARTICLE') {
    return 'bg-dt-warning/10 text-dt-warning-strong border-dt-warning/20'
  }
  if (props.sourceType === 'DIARY') {
    return 'bg-dt-success/10 text-dt-success-strong border-dt-success/20'
  }
  return 'bg-dt-surface-strong text-dt-text-muted border-dt-border'
})
</script>
