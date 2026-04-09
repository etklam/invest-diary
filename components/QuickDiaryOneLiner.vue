<template>
  <div class="space-y-6">
    <section
      class="rounded-3xl border p-6 shadow-sm transition-all md:p-8"
      style="border-color: var(--color-border); background: var(--color-surface);"
    >
      <div class="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div class="space-y-1">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em]" style="color: var(--color-secondary);">{{ t('quickDiary.entry.eyebrow') }}</p>
          <h2 class="text-2xl font-bold tracking-tight" style="color: var(--color-text); font-family: var(--font-display);">{{ t('quickDiary.entry.title') }}</h2>
          <p class="text-sm" style="color: var(--color-text-muted);">{{ t('quickDiary.entry.intro') }}</p>
        </div>
        <div class="flex flex-wrap gap-2.5">
          <button
            v-for="option in templateOptions"
            :key="option.kind"
            type="button"
            class="rounded-xl border px-4 py-2.5 text-xs font-bold transition-all duration-300 hover:scale-105 active:scale-95"
            :style="state.templateKind === option.kind
              ? 'border-color: var(--color-primary); background: var(--color-primary); color: white; shadow: var(--shadow-sm);'
              : 'border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text-soft);'"
            :aria-pressed="state.templateKind === option.kind"
            @click="applyTemplateKind(option.kind)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
    </section>

    <QuickNoteTemplateAssistant
      :template-kind="state.templateKind"
      :template-data="state.templateData"
      :has-template-changes-pending="hasTemplateChangesPending"
      @update:template-data="updateTemplateData"
      @apply-template-changes="applyTemplateChanges"
      @regenerate-template="regenerateFromTemplate"
    />

    <QuickNoteEditorCore
      :save-mode="state.saveMode"
      :title="state.title"
      :content="state.content"
      :tags="state.tags"
      :date="state.date"
      :saving="saving"
      :draft-hint="draftHint"
      :save-label="state.saveMode === 'append' ? t('quickDiary.appendDiary') : t('quickDiary.createDiary')"
      :saving-label="state.saveMode === 'append' ? t('quickDiary.appending') : t('quickDiary.creating')"
      :templates="templates"
      :reminders="reminders"
      :active-reminders="activeReminders"
      @update:title="setTitle"
      @update:content="setContent"
      @update:tags="setTags"
      @update:date="setDate"
      @update:save-mode="setSaveMode"
      @append-text="appendVoiceTranscript"
      @apply-template="handleApplyTemplate"
      @set-quick-reminder="handleSetQuickReminder"
      @reminder-set="handleSetReminder"
      @reminder-clear="handleClearReminder"
      @save="handleSave"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import QuickNoteEditorCore from '~/components/quicknote/QuickNoteEditorCore.vue'
import QuickNoteTemplateAssistant from '~/components/quicknote/QuickNoteTemplateAssistant.vue'
import { useQuickNoteComposer } from '~/composables/useQuickNoteComposer'
import { getQuickReminderLabel } from '~/lib/quicknote/quick-reminders'
import type { QuickNoteQuickReminderPreset, QuickNoteTemplateKind } from '~/types/quicknote'

const emit = defineEmits<{
  (e: 'saved'): void
}>()

const toast = useToast()
const { t } = useI18n()
const saving = ref(false)

const {
  state,
  templates,
  reminders,
  draftHint,
  activeReminders,
  hasTemplateChangesPending,
  applyTemplateKind,
  updateTemplateData,
  setTitle,
  setContent,
  setTags,
  setDate,
  setSaveMode,
  appendVoiceTranscript,
  applySnippet,
  applyTemplateChanges,
  regenerateFromTemplate,
  setQuickReminder,
  handleReminderSet,
  handleReminderClear,
  save,
  initialize,
} = useQuickNoteComposer({
  defaultTemplateKind: 'blank',
  defaultSaveMode: 'create',
})

const templateOptions = computed<Array<{ kind: QuickNoteTemplateKind; label: string }>>(() => [
  { kind: 'blank', label: t('quickDiary.templates.blank') },
  { kind: 'trading', label: t('quickDiary.templates.trading') },
  { kind: 'reflection', label: t('quickDiary.templates.reflection') },
  { kind: 'observation', label: t('quickDiary.templates.observation') },
])

onMounted(() => {
  const restored = initialize((message) => confirm(message))
  if (restored) {
    toast.info(t('quickDiary.draft.restoreSuccess'))
  }
})

function handleApplyTemplate(templateContent: string) {
  if (!templateContent) return
  if (state.content.trim()) {
    const replace = confirm(t('quickDiary.confirm.templateOverwrite'))
    applySnippet(templateContent, replace)
    return
  }
  applySnippet(templateContent)
}

function handleSetQuickReminder(preset: QuickNoteQuickReminderPreset) {
  setQuickReminder(preset)
  toast.info(t('quickDiary.reminders.presetSet', { label: getQuickReminderLabel(preset, t) }))
}

function handleSetReminder(payload: { key: 'reminder1'; time: string }) {
  handleReminderSet(payload)
  toast.info(t('quickDiary.reminders.set'))
}

function handleClearReminder(payload: { key: 'reminder1' }) {
  handleReminderClear(payload)
  toast.info(t('quickDiary.reminders.cleared'))
}

async function handleSave() {
  saving.value = true
  try {
    await save()
    toast.success(t('quickDiary.toasts.saved'))
    emit('saved')
  } catch (error: any) {
    if (error?.message === 'CONTENT_REQUIRED') {
      toast.warning(t('quickDiary.validation.contentRequired'))
      return
    }
    if (error?.message === 'TITLE_REQUIRED') {
      toast.warning(t('quickDiary.validation.titleRequired'))
      return
    }
    if (error?.statusCode === 409 || error?.data?.code === 'DIARY_ALREADY_EXISTS') {
      toast.warning(t('quickDiary.errors.diaryExists'))
      return
    }
    toast.error(error.data?.statusMessage || t('diary.saveFailed'))
  } finally {
    saving.value = false
  }
}
</script>
