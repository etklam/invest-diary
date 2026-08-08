<template>
  <div class="quick-note-page space-y-4">
    <QuickNoteEditorCore
      :save-mode="state.saveMode"
      :title="state.title"
      :content="state.content"
      :tags="state.tags"
      :date="state.date"
      :saving="saving"
      :draft-hint="draftHint"
      :draft-status="draftStatus"
      :save-label="state.saveMode === 'append' ? t('quickDiary.appendDiary') : t('quickDiary.createDiary')"
      :saving-label="state.saveMode === 'append' ? t('quickDiary.appending') : t('quickDiary.creating')"
      :templates="templates"
      :reminders="reminders"
      :active-reminders="activeReminders"
      :existing-diary-for-date="existingDiaryForDate"
      :checking-existing-diary-for-date="checkingExistingDiaryForDate"
      :template-kind="state.templateKind"
      :template-data="state.templateData"
      :has-template-changes-pending="hasTemplateChangesPending"
      :template-options="templateOptions"
      :template-picker-open="templatePickerOpen"
      :autofocus="autofocusEditor"
      @update:title="setTitle"
      @update:content="setContent"
      @update:tags="setTags"
      @update:date="setDate"
      @update:save-mode="setSaveMode"
      @append-text="appendVoiceTranscript"
      @apply-template="handleApplyTemplate"
      @update:template-data="updateTemplateData"
      @apply-template-changes="applyTemplateChanges"
      @regenerate-template="regenerateFromTemplate"
      @update:template-picker-open="templatePickerOpen = $event"
      @select-template-kind="applyTemplateKind"
      @set-quick-reminder="handleSetQuickReminder"
      @reminder-set="handleSetReminder"
      @reminder-clear="handleClearReminder"
      @retry-draft="retryDraftSave"
      @save="handleSave"
      @cancel="handleCancel"
    />

    <div
      v-if="showPostSaveActions"
      class="flex flex-wrap items-center gap-2 rounded-dt-md border px-4 py-3"
      style="border-color: color-mix(in srgb, var(--color-accent) 25%, var(--color-border)); background: var(--color-surface);"
    >
      <span class="text-xs font-semibold" style="color: var(--color-accent);">{{ t('quickDiary.capture.savedBrief') }}</span>
      <button
        type="button"
        class="min-h-10 rounded-dt-sm border px-3 text-xs font-semibold transition-colors hover:border-dt-primary hover:text-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
        style="border-color: var(--color-border); color: var(--color-text-muted);"
        @click="startTradingFollowUp"
      >
        {{ t('quickDiary.capture.followUpTrade') }}
      </button>
      <button
        type="button"
        class="min-h-10 rounded-dt-sm border px-3 text-xs font-semibold transition-colors hover:border-dt-primary hover:text-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
        style="border-color: var(--color-border); color: var(--color-text-muted);"
        @click="continueWithDetails"
      >
        {{ t('quickDiary.capture.followUpTags') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import QuickNoteEditorCore from '~/components/quicknote/QuickNoteEditorCore.vue'
import { useQuickNoteComposer } from '~/composables/useQuickNoteComposer'
import { getQuickReminderLabel } from '~/lib/quicknote/quick-reminders'
import type { QuickNoteQuickReminderPreset, QuickNoteTemplateKind } from '~/types/quicknote'

const emit = defineEmits<{
  (e: 'saved'): void
}>()

const toast = useToast()
const { t } = useI18n()
const saving = ref(false)
const autofocusEditor = ref(false)
const templatePickerOpen = ref(false)
const showPostSaveActions = ref(false)
const postSaveTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const {
  state,
  templates,
  reminders,
  draftHint,
  draftStatus,
  activeReminders,
  existingDiaryForDate,
  checkingExistingDiaryForDate,
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
  syncExistingDiaryForDate,
  retryDraftSave,
  save,
  initialize,
  dispose,
  resetState,
} = useQuickNoteComposer({
  defaultTemplateKind: 'blank',
  defaultSaveMode: 'create',
})

const templateOptions = computed<Array<{ kind: QuickNoteTemplateKind; label: string; description: string }>>(() => [
  {
    kind: 'blank',
    label: t('quickDiary.templates.blank'),
    description: t('quickDiary.templates.blankDesc'),
  },
  {
    kind: 'trading',
    label: t('quickDiary.templates.trading'),
    description: t('quickDiary.templates.tradingDesc'),
  },
  {
    kind: 'reflection',
    label: t('quickDiary.templates.reflection'),
    description: t('quickDiary.templates.reflectionDesc'),
  },
  {
    kind: 'observation',
    label: t('quickDiary.templates.observation'),
    description: t('quickDiary.templates.observationDesc'),
  },
])

onMounted(() => {
  const restored = initialize((message) => confirm(message))
  if (restored) {
    toast.info(t('quickDiary.draft.restoreSuccess'))
  }
  autofocusEditor.value = !restored && !state.content.trim()
})

onUnmounted(() => {
  clearPostSaveTimer()
  dispose()
})

function clearPostSaveTimer() {
  if (!postSaveTimer.value) return
  clearTimeout(postSaveTimer.value)
  postSaveTimer.value = null
}

function startPostSaveTimer() {
  clearPostSaveTimer()
  showPostSaveActions.value = true
  postSaveTimer.value = setTimeout(() => {
    showPostSaveActions.value = false
    postSaveTimer.value = null
  }, 8000)
}

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

function handleCancel() {
  templatePickerOpen.value = false
  resetState()
  showPostSaveActions.value = false
}

async function handleSave() {
  if (saving.value) return
  saving.value = true
  try {
    await save()
    templatePickerOpen.value = false
    startPostSaveTimer()
    toast.success(t('quickDiary.toasts.saved'))
    await syncExistingDiaryForDate()
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
    toast.error(error?.data?.statusMessage || t('diary.saveFailed'))
  } finally {
    saving.value = false
  }
}

function startTradingFollowUp() {
  clearPostSaveTimer()
  showPostSaveActions.value = false
  applyTemplateKind('trading')
  setSaveMode('append')
}

function continueWithDetails() {
  clearPostSaveTimer()
  showPostSaveActions.value = false
  setSaveMode('append')
}
</script>
