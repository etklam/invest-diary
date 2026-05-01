<template>
  <div class="min-h-screen pb-20">
    <header class="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{{ t('stock.watchlist.timeline') }}</p>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white mt-1">{{ data?.stock?.symbol || symbol }}</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">{{ data?.stock?.name || t('stock.watchlist.noName') }}</p>
        </div>
        <NuxtLink to="/stocks/watchlist" class="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
          <Icon name="heroicons:arrow-left" class="w-4 h-4" />
          {{ t('stock.watchlist.backToWatchlist') }}
        </NuxtLink>
      </div>
    </header>

    <main class="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
      <div v-if="pending" class="py-16 text-center text-sm text-slate-500 dark:text-slate-400">{{ t('stock.watchlist.loading') }}</div>
      <StockEmptyTimeline v-else-if="!records.length" />
      <StockTimeline v-else :records="records" />
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

interface TimelineResponse {
  stock: { symbol: string; name?: string | null }
  records: Array<{
    id: string
    summary: string
    occurredAt: string
    sourceType: string
    sourceTitle?: string | null
    sourceUrl?: string | null
    sourceDiaryId?: string | null
    confidence?: number | null
    createdByLabel?: string | null
  }>
}

const { t } = useI18n()
const route = useRoute()
const symbol = computed(() => String(route.params.symbol || '').toUpperCase())

const { data, pending } = await useLazyFetch<TimelineResponse>(
  () => `/api/stocks/${encodeURIComponent(symbol.value)}/timeline`,
  {
    server: false,
    default: () => ({ stock: { symbol: symbol.value }, records: [] }),
    watch: [symbol]
  }
)

const records = computed(() => data.value?.records ?? [])

useHead({
  title: computed(() => `${symbol.value} ${t('stock.watchlist.timeline')} - Investment Diary`)
})
</script>
