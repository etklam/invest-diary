<template>
  <div class="space-y-4">
    <!-- Empty state -->
    <div
      v-if="!notes.length && !loading"
      class="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 py-16 px-4 text-center"
    >
      <Icon name="heroicons:document-text" class="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
      <p class="text-sm text-slate-500 dark:text-slate-400">{{ t('stock.notes.empty') }}</p>
      <button
        class="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        @click="$emit('write')"
      >
        <Icon name="heroicons:plus" class="w-4 h-4" />
        {{ t('stock.notes.write') }}
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="space-y-4">
      <div
        v-for="i in 3"
        :key="i"
        class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 animate-pulse"
      >
        <div class="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3" />
        <div class="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/4 mb-2" />
        <div class="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full mt-4" />
        <div class="h-4 bg-slate-100 dark:bg-slate-800 rounded w-2/3 mt-2" />
      </div>
    </div>

    <!-- Notes list -->
    <StockNoteItem
      v-for="note in notes"
      :key="note.id"
      :note="note"
      @edit="$emit('edit', note)"
      @delete="$emit('delete', note)"
    />

    <!-- Pagination -->
    <div v-if="total > limit" class="flex items-center justify-center gap-2 pt-2">
      <button
        class="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
        :class="page <= 1
          ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'"
        :disabled="page <= 1"
        @click="$emit('page-change', page - 1)"
      >
        {{ t('common.previous') }}
      </button>
      <span class="text-sm text-slate-500 dark:text-slate-400">
        {{ page }} / {{ totalPages }}
      </span>
      <button
        class="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
        :class="page >= totalPages
          ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'"
        :disabled="page >= totalPages"
        @click="$emit('page-change', page + 1)"
      >
        {{ t('common.next') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StockNoteView } from '~/types/stock-note'

const props = defineProps<{
  notes: StockNoteView[]
  loading: boolean
  page: number
  limit: number
  total: number
}>()

defineEmits<{
  write: []
  edit: [note: StockNoteView]
  delete: [note: StockNoteView]
  'page-change': [page: number]
}>()

const { t } = useI18n()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.limit)))
</script>
