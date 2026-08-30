<template>
  <article class="rounded-xl border border-dt-border p-4 bg-dt-surface">
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-center gap-2">
        <StockSourceBadge :source-type="record.sourceType" />
        <span v-if="record.confidence !== null && record.confidence !== undefined" class="text-[11px] text-dt-text-soft">
          {{ t('stock.watchlist.confidence') }} {{ record.confidence }}%
        </span>
      </div>
      <time class="text-[11px] text-dt-text-soft whitespace-nowrap">{{ formatAt(record.occurredAt) }}</time>
    </div>
    <p class="mt-3 text-sm leading-6 text-dt-text">{{ record.summary }}</p>
    <div class="mt-3 flex flex-wrap items-center gap-3 text-xs">
      <span v-if="record.sourceTitle" class="text-dt-text-muted">{{ record.sourceTitle }}</span>
      <NuxtLink
        v-if="record.sourceDiaryId"
        :to="`/diaries/${record.sourceDiaryId}`"
        class="text-dt-info hover:text-dt-info dark:hover:text-dt-info font-medium"
      >
        {{ t('stock.watchlist.openDiary') }}
      </NuxtLink>
      <a
        v-if="record.sourceUrl"
        :href="record.sourceUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="text-dt-info hover:text-dt-info dark:hover:text-dt-info font-medium inline-flex items-center gap-1"
      >
        {{ t('stock.watchlist.openSource') }}
        <Icon name="heroicons:arrow-top-right-on-square" class="w-3.5 h-3.5" />
      </a>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { StockTimelineSourceType } from '~/lib/contracts/stocks/timeline-source'

interface StockTimelineItemData {
  id: string
  summary: string
  occurredAt: string
  sourceType: StockTimelineSourceType
  sourceTitle?: string | null
  sourceUrl?: string | null
  sourceDiaryId?: string | null
  confidence?: number | null
}

defineProps<{
  record: StockTimelineItemData
}>()

const { t } = useI18n()
const { formatLocaleDateTime } = useTimezone()

const formatAt = (value: string) => formatLocaleDateTime(value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
</script>
