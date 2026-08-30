<template>
  <div class="space-y-3">
    <StockTimelineItem v-for="record in records" :key="record.id" :record="record" />
  </div>
</template>

<script setup lang="ts">
import type { StockTimelineSourceType } from '~/lib/contracts/stocks/timeline-source'

interface StockTimelineRecord {
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
  records: StockTimelineRecord[]
}>()
</script>
