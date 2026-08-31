<template>
  <PageContainer width="app" class="min-h-screen pb-20">
    <header class="py-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <h1 class="text-2xl font-bold text-dt-text">{{ t('stock.watchlist.title') }}</h1>
          <p class="text-sm text-dt-text-soft mt-1">{{ t('stock.watchlist.subtitle') }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
          <NuxtLink to="/stocks" class="inline-flex shrink-0 items-center gap-1.5 text-sm text-dt-text-muted hover:text-dt-text dark:hover:text-white">
            <Icon name="heroicons:arrow-left" class="w-4 h-4" />
            {{ t('stock.watchlist.backToDashboard') }}
          </NuxtLink>
          <NuxtLink to="/partners" class="inline-flex shrink-0 items-center gap-1.5 text-sm text-dt-text-muted hover:text-dt-text dark:hover:text-white">
            <Icon name="heroicons:user-group" class="w-4 h-4" />
            {{ t('nav.partners') }}
          </NuxtLink>
        </div>
      </div>
      <div class="mt-4">
        <StockWatchlistAddForm :loading="adding" @submit="addSymbol" />
      </div>
    </header>

    <div>
      <div v-if="pending" class="py-16 text-center text-sm text-dt-text-soft">{{ t('stock.watchlist.loading') }}</div>
      <div v-else-if="!items.length" class="py-16">
        <StockEmptyTimeline />
      </div>
      <StockWatchlistTable
        v-else
        :items="items"
        :removing-id="removingId"
        @archive="archiveItem"
      />
    </div>
  </PageContainer>
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
