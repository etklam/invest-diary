<template>
  <div class="space-y-4">
    <!-- Empty state -->
    <div
      v-if="!notes.length && !loading"
      class="rounded-xl border-2 border-dashed border-dt-border py-16 px-4 text-center"
    >
      <Icon name="heroicons:document-text" class="w-10 h-10 text-dt-text-muted mx-auto mb-3" />
      <p class="text-sm text-dt-text-soft">{{ t('stock.notes.empty') }}</p>
      <button
        class="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-dt-primary-solid hover:bg-dt-primary-solid-active rounded-lg transition-colors"
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
        class="rounded-xl border border-dt-border bg-dt-surface p-5 animate-pulse"
      >
        <div class="h-5 bg-dt-surface-strong rounded w-1/3 mb-3" />
        <div class="h-4 bg-dt-surface-strong rounded w-1/4 mb-2" />
        <div class="h-4 bg-dt-surface-strong rounded w-full mt-4" />
        <div class="h-4 bg-dt-surface-strong rounded w-2/3 mt-2" />
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
          ? 'text-dt-text-muted cursor-not-allowed'
          : 'text-dt-text hover:bg-dt-surface-strong'"
        :disabled="page <= 1"
        @click="$emit('page-change', page - 1)"
      >
        {{ t('common.previous') }}
      </button>
      <span class="text-sm text-dt-text-soft">
        {{ page }} / {{ totalPages }}
      </span>
      <button
        class="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
        :class="page >= totalPages
          ? 'text-dt-text-muted cursor-not-allowed'
          : 'text-dt-text hover:bg-dt-surface-strong'"
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
