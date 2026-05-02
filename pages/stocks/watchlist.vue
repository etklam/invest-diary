<template>
  <div class="min-h-screen pb-20">
    <header class="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white">{{ t('stock.watchlist.title') }}</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">{{ t('stock.watchlist.subtitle') }}</p>
        </div>
        <NuxtLink to="/stocks" class="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
          <Icon name="heroicons:arrow-left" class="w-4 h-4" />
          {{ t('stock.watchlist.backToDashboard') }}
        </NuxtLink>
      </div>
      <div class="mt-4">
        <StockWatchlistAddForm :loading="adding" @submit="addSymbol" />
      </div>
    </header>

    <main class="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
      <div v-if="pending" class="py-16 text-center text-sm text-slate-500 dark:text-slate-400">{{ t('stock.watchlist.loading') }}</div>
      <div v-else-if="!items.length" class="py-16">
        <StockEmptyTimeline />
      </div>
      <StockWatchlistTable
        v-else
        :items="items"
        :removing-id="removingId"
        @archive="archiveItem"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

interface WatchlistItem {
  id: string
  updatedAt: string
  stock: { symbol: string; name?: string | null }
  recordCount: number
  latestRecord?: { summary?: string | null } | null
  status?: string
  sortOrder?: number
}

interface WatchlistResponse {
  items: WatchlistItem[]
}

const { t } = useI18n()
const toast = useToast()

const adding = ref(false)
const removingId = ref<string | null>(null)

const { data, pending, refresh } = await useLazyFetch<WatchlistResponse>('/api/stocks/watchlist', {
  server: false,
  default: () => ({ items: [] })
})

const items = computed(() => data.value?.items ?? [])

const addSymbol = async (symbol: string) => {
  if (adding.value) return
  adding.value = true
  try {
    await $fetch('/api/stocks/watchlist', {
      method: 'POST',
      body: { symbol }
    })
    toast.success(t('stock.watchlist.addSuccess'))
    await refresh()
  } catch {
    toast.error(t('stock.watchlist.addFailed'))
  } finally {
    adding.value = false
  }
}

const archiveItem = async (id: string) => {
  if (removingId.value) return
  removingId.value = id
  try {
    await $fetch(`/api/stocks/watchlist/${id}`, { method: 'DELETE' })
    toast.success(t('stock.watchlist.archiveSuccess'))
    await refresh()
  } catch {
    toast.error(t('stock.watchlist.archiveFailed'))
  } finally {
    removingId.value = null
  }
}

useHead({
  title: `${t('stock.watchlist.title')} - Investment Diary`
})
</script>
