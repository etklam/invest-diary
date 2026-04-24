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

    <section
      class="rounded-3xl border p-5 shadow-sm transition-all md:p-6"
      style="border-color: color-mix(in srgb, var(--color-primary) 18%, var(--color-border)); background: var(--color-surface);"
    >
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div class="min-w-0 flex-1 space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <span class="inline-flex h-8 w-8 items-center justify-center rounded-xl" style="background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface-muted)); color: var(--color-primary);">
              <Icon name="heroicons:bolt" class="h-4 w-4" />
            </span>
            <div>
              <p class="text-sm font-bold" style="color: var(--color-text);">{{ t('quickDiary.capture.title') }}</p>
              <p class="text-xs" style="color: var(--color-text-muted);">
                {{ existingDiaryForDate ? t('quickDiary.capture.appendDetected') : t('quickDiary.capture.createDetected') }}
              </p>
            </div>
          </div>
          <label class="sr-only" for="quick-capture-input">{{ t('quickDiary.capture.title') }}</label>
          <textarea
            id="quick-capture-input"
            v-model="captureText"
            data-test="quick-capture-input"
            rows="3"
            class="w-full resize-none rounded-2xl border px-4 py-3 text-sm leading-7 outline-none transition-all focus:ring-2 focus:ring-primary/20"
            style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text);"
            :placeholder="t('quickDiary.capture.placeholder')"
            @keydown.meta.enter.prevent="handleCaptureSave"
            @keydown.ctrl.enter.prevent="handleCaptureSave"
          />
        </div>

        <button
          type="button"
          data-test="quick-capture-save"
          class="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 lg:mt-[52px]"
          style="background: var(--color-primary); box-shadow: 0 4px 12px color-mix(in srgb, var(--color-primary) 20%, transparent);"
          :disabled="captureSaving"
          @click="handleCaptureSave"
        >
          <Icon v-if="captureSaving" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
          <Icon v-else name="heroicons:paper-airplane" class="h-4 w-4" />
          {{ captureSaving ? (state.saveMode === 'append' ? t('quickDiary.appending') : t('quickDiary.creating')) : t('quickDiary.capture.save') }}
        </button>
      </div>

      <div
        v-if="showPostSavePrompt"
        class="mt-4 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
        style="border-color: color-mix(in srgb, var(--color-secondary) 22%, var(--color-border)); background: color-mix(in srgb, var(--color-secondary) 8%, var(--color-surface-muted));"
      >
        <p class="text-sm font-medium" style="color: var(--color-text);">{{ t('quickDiary.capture.afterSavePrompt') }}</p>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="rounded-xl border px-3 py-2 text-xs font-semibold transition-all hover:opacity-85" style="border-color: var(--color-border); background: var(--color-surface); color: var(--color-primary);" @click="startTradingFollowUp">
            {{ t('quickDiary.capture.followUpTrade') }}
          </button>
          <button type="button" class="rounded-xl border px-3 py-2 text-xs font-semibold transition-all hover:opacity-85" style="border-color: var(--color-border); background: var(--color-surface); color: var(--color-secondary);" @click="setPostSaveReminder">
            {{ t('quickDiary.capture.followUpReminder') }}
          </button>
          <button type="button" class="rounded-xl border px-3 py-2 text-xs font-semibold transition-all hover:opacity-85" style="border-color: var(--color-border); background: var(--color-surface); color: var(--color-text-muted);" @click="continueWithTags">
            {{ t('quickDiary.capture.followUpTags') }}
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
const captureText = ref('')
const captureSaving = ref(false)
const showPostSavePrompt = ref(false)

const {
  state,
  templates,
  reminders,
  draftHint,
  activeReminders,
  existingDiaryForDate,
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
    showPostSavePrompt.value = true
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
    toast.error(error.data?.statusMessage || t('diary.saveFailed'))
  } finally {
    saving.value = false
  }
}

async function handleCaptureSave() {
  const content = captureText.value.trim()
  if (!content) {
    toast.warning(t('quickDiary.validation.contentRequired'))
    return
  }

  captureSaving.value = true
  try {
    setContent(content)
    await save()
    captureText.value = ''
    showPostSavePrompt.value = true
    toast.success(t('quickDiary.toasts.saved'))
    await syncExistingDiaryForDate()
    emit('saved')
  } catch (error: any) {
    if (error?.message === 'CONTENT_REQUIRED') {
      toast.warning(t('quickDiary.validation.contentRequired'))
      return
    }
    if (error?.statusCode === 409 || error?.data?.code === 'DIARY_ALREADY_EXISTS') {
      toast.warning(t('quickDiary.errors.diaryExists'))
      return
    }
    toast.error(error.data?.statusMessage || t('diary.saveFailed'))
  } finally {
    captureSaving.value = false
  }
}

function startTradingFollowUp() {
  showPostSavePrompt.value = false
  applyTemplateKind('trading')
  setSaveMode('append')
}

function setPostSaveReminder() {
  setQuickReminder('tomorrow')
  toast.info(t('quickDiary.reminders.presetSet', { label: getQuickReminderLabel('tomorrow', t) }))
  showPostSavePrompt.value = false
}

function continueWithTags() {
  showPostSavePrompt.value = false
  setSaveMode('append')
}
</script>
