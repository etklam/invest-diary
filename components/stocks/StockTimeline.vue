<template>
  <div class="space-y-3">
    <StockTimelineItem v-for="record in records" :key="record.id" :record="record" />
  </div>
</template>

<script setup lang="ts">
interface StockTimelineRecord {
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
  records: StockTimelineRecord[]
}>()
</script>
