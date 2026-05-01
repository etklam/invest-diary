<template>
  <article class="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-center gap-2">
        <StockSourceBadge :source-type="record.sourceType" />
        <span v-if="record.confidence !== null && record.confidence !== undefined" class="text-[11px] text-slate-500 dark:text-slate-400">
          {{ t('stock.watchlist.confidence') }} {{ record.confidence }}%
        </span>
      </div>
      <time class="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">{{ formatAt(record.occurredAt) }}</time>
    </div>
    <p class="mt-3 text-sm leading-6 text-slate-800 dark:text-slate-100">{{ record.summary }}</p>
    <div class="mt-3 flex flex-wrap items-center gap-3 text-xs">
      <span v-if="record.sourceTitle" class="text-slate-600 dark:text-slate-300">{{ record.sourceTitle }}</span>
      <NuxtLink
        v-if="record.sourceDiaryId"
        :to="`/diaries/${record.sourceDiaryId}`"
        class="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
      >
        {{ t('stock.watchlist.openDiary') }}
      </NuxtLink>
      <a
        v-if="record.sourceUrl"
        :href="record.sourceUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium inline-flex items-center gap-1"
      >
        {{ t('stock.watchlist.openSource') }}
        <Icon name="heroicons:arrow-top-right-on-square" class="w-3.5 h-3.5" />
      </a>
    </div>
  </article>
</template>

<script setup lang="ts">
interface StockTimelineItemData {
  id: string
  summary: string
  occurredAt: string
  sourceType: string
  sourceTitle?: string | null
  sourceUrl?: string | null
  sourceDiaryId?: string | null
  confidence?: number | null
}

defineProps<{
  record: StockTimelineItemData
}>()

const { t, locale } = useI18n()

const formatAt = (value: string) => {
  return new Date(value).toLocaleString(locale.value === 'zh-TW' ? 'zh-TW' : locale.value === 'zh-CN' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>
