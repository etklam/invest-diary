<template>
  <article class="rounded-xl border border-dt-border bg-dt-surface hover:border-dt-border  transition-colors">
    <div class="p-5">
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">
          <h3 class="text-base font-semibold text-dt-text truncate">
            {{ note.title }}
          </h3>
          <div class="flex items-center gap-2 mt-1.5">
            <time class="text-xs text-dt-text-soft">{{ formatDate(note.date) }}</time>
            <span class="text-xs text-dt-text-muted">·</span>
            <span
              class="inline-flex items-center gap-1 text-xs font-medium"
              :class="note.authorKind === 'agent' ? 'text-dt-success' : note.ownership === 'partner' ? 'text-dt-success' : 'text-dt-text-muted'"
            >
              <Icon
                data-testid="stock-note-author-icon"
                :name="note.authorKind === 'agent' ? 'heroicons:cpu-chip' : 'heroicons:user'"
                class="w-3 h-3"
              />
              {{ note.authorLabel || (note.ownership === 'partner' ? t('stock.notes.createdByPartner') : note.authorKind === 'agent' ? t('stock.notes.createdByAgent') : t('stock.notes.createdByUser')) }}
            </span>
          </div>
        </div>
        <div v-if="note.canEdit" class="flex items-center gap-1 flex-shrink-0">
          <button
            class="flex min-h-11 min-w-11 items-center justify-center text-dt-text-soft hover:text-dt-info transition-colors rounded-lg hover:bg-dt-surface-strong"
            :aria-label="t('common.edit')"
            :title="t('common.edit')"
            @click="$emit('edit', note)"
          >
            <Icon name="heroicons:pencil" class="w-4 h-4" />
          </button>
          <button
            class="flex min-h-11 min-w-11 items-center justify-center text-dt-text-soft hover:text-dt-danger transition-colors rounded-lg hover:bg-dt-surface-strong"
            :aria-label="t('common.delete')"
            :title="t('common.delete')"
            @click="$emit('delete', note)"
          >
            <Icon name="heroicons:trash" class="w-4 h-4" />
          </button>
        </div>
      </div>
      <div class="mt-3 text-sm leading-6 text-dt-text prose prose-sm dark:prose-invert max-w-none line-clamp-4">
        {{ note.content }}
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { StockNoteView } from '~/types/stock-note'

defineProps<{
  note: StockNoteView
}>()

defineEmits<{
  edit: [note: StockNoteView]
  delete: [note: StockNoteView]
}>()

const { t } = useI18n()
const { formatLocaleDateTime } = useTimezone()

const formatDate = (value: string) => formatLocaleDateTime(value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
</script>
