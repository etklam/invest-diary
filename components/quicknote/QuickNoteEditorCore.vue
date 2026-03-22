<template>
  <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200">快速筆記</h2>
      <span v-if="draftHint" class="text-xs text-gray-500 dark:text-gray-400">{{ draftHint }}</span>
    </div>

    <input
      :value="title"
      type="text"
      class="mt-3 w-full rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
      :placeholder="t('diary.diaryTitle')"
      aria-label="快速筆記標題"
      @input="handleTitleInput"
    />

    <textarea
      :value="content"
      class="mt-3 w-full rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
      :placeholder="t('quickDiary.oneLiner.placeholder')"
      rows="4"
      autofocus
      aria-label="快速筆記內容"
      @input="handleContentInput"
    />

    <div class="mt-3 flex flex-wrap items-center gap-2">
      <VoiceInput @result="emit('append-text', $event)" />
      <div class="flex flex-wrap gap-2">
        <button
          v-for="template in templates"
          :key="template.id"
          type="button"
          class="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600 hover:border-indigo-300 hover:text-indigo-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          @click="emit('apply-template', template.content)"
        >
          {{ template.name }}
        </button>
        <button
          type="button"
          class="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200"
          @click="showTemplateManager = true"
        >
          管理模板
        </button>
      </div>
    </div>

    <div class="mt-4">
      <QuickTags
        :model-value="tags"
        @update:model-value="emit('update:tags', $event)"
      />
    </div>

    <div class="mt-4 space-y-3">
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-xs text-gray-500 dark:text-gray-400">快速提醒</span>
        <button
          v-for="option in quickReminderOptions"
          :key="option.preset"
          type="button"
          class="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 hover:border-indigo-300 hover:text-indigo-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          @click="emit('set-quick-reminder', option.preset)"
        >
          {{ option.label }}
        </button>
      </div>
      <div v-if="activeReminders.length" class="space-y-1 text-xs text-gray-500 dark:text-gray-400">
        <div v-for="item in activeReminders" :key="item.key">
          {{ item.label }}：剩餘 {{ item.remaining }}
        </div>
      </div>
      <QuickReminder
        :reminders="reminders"
        @set="emit('reminder-set', $event)"
        @clear="emit('reminder-clear', $event)"
      />
    </div>

    <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label class="text-xs text-gray-500 dark:text-gray-400" for="quick-note-date">日期</label>
        <input
          id="quick-note-date"
          type="date"
          :value="date"
          class="rounded-md border border-gray-200 bg-white p-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          @input="handleDateInput"
        />
      </div>

      <button
        class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="saving"
        @click="emit('save')"
      >
        {{ saving ? (savingLabel || t('common.loading')) : (saveLabel || t('common.save')) }}
      </button>
    </div>

    <TemplateManager
      v-model="showTemplateManager"
      @apply="emit('apply-template', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import QuickTags from '~/components/QuickTags.vue'
import VoiceInput from '~/components/VoiceInput.vue'
import TemplateManager from '~/components/TemplateManager.vue'
import QuickReminder from '~/components/QuickReminder.vue'
import type { QuickNoteTemplate } from '~/composables/useQuickNoteTemplates'
import { quickReminderOptions } from '~/lib/quicknote/quick-reminders'
import type {
  QuickNoteQuickReminderPreset,
  QuickNoteReminderKey,
  QuickNoteReminders,
} from '~/types/quicknote'

defineProps<{
  title: string
  content: string
  tags: string[]
  date: string
  saving: boolean
  draftHint: string
  saveLabel?: string
  savingLabel?: string
  templates: QuickNoteTemplate[]
  reminders: QuickNoteReminders
  activeReminders: Array<{
    key: string
    label: string
    remaining: string
  }>
}>()

const emit = defineEmits<{
  (e: 'update:title', value: string): void
  (e: 'update:content', value: string): void
  (e: 'update:tags', value: string[]): void
  (e: 'update:date', value: string): void
  (e: 'append-text', value: string): void
  (e: 'apply-template', value: string): void
  (e: 'save'): void
  (e: 'set-quick-reminder', value: QuickNoteQuickReminderPreset): void
  (e: 'reminder-set', payload: { key: QuickNoteReminderKey; time: string }): void
  (e: 'reminder-clear', payload: { key: QuickNoteReminderKey }): void
}>()

const { t } = useI18n()

const showTemplateManager = ref(false)

function handleContentInput(event: Event) {
  emit('update:content', (event.target as HTMLTextAreaElement).value)
}

function handleTitleInput(event: Event) {
  emit('update:title', (event.target as HTMLInputElement).value)
}

function handleDateInput(event: Event) {
  emit('update:date', (event.target as HTMLInputElement).value)
}
</script>
