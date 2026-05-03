<template>
  <article class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
    <div class="p-5">
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">
          <h3 class="text-base font-semibold text-slate-900 dark:text-white truncate">
            {{ note.title }}
          </h3>
          <div class="flex items-center gap-2 mt-1.5">
            <time class="text-xs text-slate-500 dark:text-slate-400">{{ formatDate(note.date) }}</time>
            <span class="text-xs text-slate-300 dark:text-slate-600">·</span>
            <span
              class="inline-flex items-center gap-1 text-xs font-medium"
              :class="note.createdVia === 'AGENT' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-600 dark:text-slate-400'"
            >
              <Icon
                :name="note.createdVia === 'AGENT' ? 'heroicons:cpu-chip' : 'heroicons:user'"
                class="w-3 h-3"
              />
              {{ note.createdByLabel || (note.createdVia === 'AGENT' ? t('stock.notes.createdByAgent') : t('stock.notes.createdByUser')) }}
            </span>
          </div>
        </div>
        <div v-if="note.createdVia === 'USER'" class="flex items-center gap-1 flex-shrink-0">
          <button
            class="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            :title="t('common.edit')"
            @click="$emit('edit', note)"
          >
            <Icon name="heroicons:pencil" class="w-4 h-4" />
          </button>
          <button
            class="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            :title="t('common.delete')"
            @click="$emit('delete', note)"
          >
            <Icon name="heroicons:trash" class="w-4 h-4" />
          </button>
        </div>
      </div>
      <div class="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300 prose prose-sm dark:prose-invert max-w-none line-clamp-4">
        {{ note.content }}
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
interface StockNoteData {
  id: string
  symbol: string
  name?: string | null
  title: string
  content: string
  date: string
  createdVia: string
  createdByLabel?: string | null
  createdAt: string
  updatedAt: string
}

defineProps<{
  note: StockNoteData
}>()

defineEmits<{
  edit: [note: StockNoteData]
  delete: [note: StockNoteData]
}>()

const { t, locale } = useI18n()

const formatDate = (value: string) => {
  return new Date(value).toLocaleString(locale.value === 'zh-TW' ? 'zh-TW' : locale.value === 'zh-CN' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>
