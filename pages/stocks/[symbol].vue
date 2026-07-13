<template>
  <div class="min-h-screen pb-20">
    <!-- Header -->
    <header class="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="flex items-center justify-between gap-4">
        <div>
          <NuxtLink
            to="/stocks/watchlist"
            class="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            <Icon name="heroicons:arrow-left" class="w-4 h-4" />
            {{ t('stock.watchlist.backToWatchlist') }}
          </NuxtLink>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white mt-2">{{ displaySymbol }}</h1>
          <p v-if="stockName" class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {{ stockName }}
            <span class="inline-flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              <Icon name="heroicons:eye" class="w-3 h-3" />
              {{ t('stock.watchlist.editModal.statusWatching') }}
            </span>
          </p>
        </div>
        <button
          class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex-shrink-0"
          @click="showEditor = true"
        >
          <Icon name="heroicons:plus" class="w-4 h-4" />
          {{ t('stock.notes.write') }}
        </button>
      </div>
    </header>

    <main class="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Error state -->
      <div
        v-if="error"
        class="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 py-12 px-4 text-center"
      >
        <Icon name="heroicons:exclamation-triangle" class="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p class="text-sm text-red-700 dark:text-red-400 mb-4">{{ error }}</p>
        <button
          class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          @click="refresh()"
        >
          <Icon name="heroicons:arrow-path" class="w-4 h-4" />
          {{ t('common.retry') }}
        </button>
      </div>

      <!-- Editor -->
      <div v-if="showEditor && !error" class="mb-6">
        <StockNoteEditor
          ref="editorRef"
          :show-cancel="true"
          :saving="isSaving"
          @save="handleSave"
          @cancel="showEditor = false"
        />
      </div>

      <!-- Filters -->
      <div v-if="!error" class="flex flex-wrap items-center gap-2 mb-6">
        <button
          v-for="filter in filters"
          :key="filter.value"
          class="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
          :class="activeFilter === filter.value
            ? 'bg-blue-600 text-white'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'"
          @click="activeFilter = filter.value"
        >
          {{ filter.label }}
        </button>
      </div>

      <!-- Notes list -->
      <StockNoteList
        v-if="!error"
        :notes="displayNotes"
        :loading="pending"
        :page="currentPage"
        :limit="20"
        :total="totalNotes"
        @write="showEditor = true"
        @edit="handleEdit"
        @delete="handleDelete"
        @page-change="handlePageChange"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { canDisplayPartnerStockNotes, toStockNotesView } from '~/lib/stocks/note-view'
import type { StockNoteDraft, StockNoteView, StockNotesResponse } from '~/types/stock-note'
import type { PartnerLinkSummary, PartnerLinksResponse } from '~/types/partner'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const toast = useToast()
const route = useRoute()

const displaySymbol = computed(() => String(route.params.symbol).toUpperCase())
const showEditor = ref(false)
const editorRef = ref<{ resetForm: () => void }>()
const isSaving = ref(false)
const activeFilter = ref<string>('all')
const currentPage = ref(1)

const partnerLinks = ref<PartnerLinkSummary[]>([])

const visiblePartnerLinks = computed(() => partnerLinks.value.filter(
  canDisplayPartnerStockNotes,
))

const filters = computed(() => {
  const base: Array<{ value: string; label: string }> = [
    { value: 'all', label: t('stock.notes.filterAll') },
    { value: 'USER', label: t('stock.notes.filterMine') },
  ]
  for (const link of visiblePartnerLinks.value) {
    const name = link.partner?.name || link.partner?.email || t('stock.notes.filterPartner')
    base.push({
      value: `partner:${link.partner.id}`,
      label: name,
    })
  }
  return base
})

const selectedPartnerId = computed(() => {
  if (!activeFilter.value.startsWith('partner:')) return null

  const partnerId = activeFilter.value.replace('partner:', '')
  return visiblePartnerLinks.value.some(link => link.partner.id === partnerId) ? partnerId : null
})

const queryParams = computed(() => {
  const params: Record<string, string | number> = { page: currentPage.value, limit: 20 }
  if (activeFilter.value === 'USER') {
    params.createdVia = 'USER'
  } else if (selectedPartnerId.value) {
    params.partnerId = selectedPartnerId.value
  }
  return params
})

const fetchPartners = async () => {
  try {
    const response = await $fetch<PartnerLinksResponse>('/api/partners')
    partnerLinks.value = response.links
  } catch {
    // Partners not critical — silently fail
  }
}

await fetchPartners()

const { data, pending, error, refresh } = await useLazyFetch<StockNotesResponse>(
  () => `/api/stocks/${encodeURIComponent(String(route.params.symbol))}/notes`,
  {
    server: false,
    query: queryParams,
    default: () => ({ notes: [], total: 0, page: 1, limit: 20 }),
  },
)

const displayNotes = computed(() => data.value ? toStockNotesView(data.value).notes : [])
const totalNotes = computed(() => data.value?.total ?? 0)
const stockName = computed(() => displayNotes.value.find(note => note.name)?.name ?? null)

const handleSave = async (noteData: StockNoteDraft) => {
  if (isSaving.value) return
  isSaving.value = true
  try {
    await $fetch(`/api/stocks/${encodeURIComponent(String(route.params.symbol))}/notes`, {
      method: 'POST',
      body: noteData,
    })
    toast.success(t('stock.notes.saveSuccess'))
    showEditor.value = false
    editorRef.value?.resetForm()
    await refresh()
  } catch {
    toast.error(t('common.error'))
  } finally {
    isSaving.value = false
  }
}

const handleEdit = async (note: StockNoteView) => {
  if (!note.canEdit) return

  const newTitle = prompt(t('diary.title'), note.title)
  if (!newTitle) return
  const newContent = prompt(t('diary.content'), note.content)
  if (!newContent) return

  try {
    await $fetch(`/api/stocks/${encodeURIComponent(String(route.params.symbol))}/notes/${note.id}`, {
      method: 'PUT',
      body: { title: newTitle, content: newContent },
    })
    toast.success(t('stock.notes.saveSuccess'))
    await refresh()
  } catch {
    toast.error(t('common.error'))
  }
}

const handleDelete = async (note: StockNoteView) => {
  if (!note.canEdit) return

  if (!confirm(t('stock.notes.deleteConfirm'))) return

  try {
    await $fetch(`/api/stocks/${encodeURIComponent(String(route.params.symbol))}/notes/${note.id}`, {
      method: 'DELETE',
    })
    toast.success(t('common.deleted'))
    await refresh()
  } catch {
    toast.error(t('common.error'))
  }
}

const handlePageChange = (page: number) => {
  currentPage.value = page
}

watch(activeFilter, () => {
  currentPage.value = 1
})

watch(visiblePartnerLinks, (links) => {
  if (activeFilter.value.startsWith('partner:') && !links.some(link => `partner:${link.partner.id}` === activeFilter.value)) {
    activeFilter.value = 'all'
  }
})

useHead({
  title: computed(() => `${displaySymbol.value} - ${t('stock.notes.title')} - Investment Diary`),
})
</script>
