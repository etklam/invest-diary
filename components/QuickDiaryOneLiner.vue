<template>
  <div class="space-y-4">
    <!-- Capture section: always visible, main visual focus -->
    <section
      class="rounded-3xl border p-5 shadow-sm transition-all md:p-6"
      style="border-color: color-mix(in srgb, var(--color-primary) 18%, var(--color-border)); background: var(--color-surface);"
    >
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div class="min-w-0 flex-1 space-y-2.5">
          <textarea
            id="quick-capture-input"
            v-model="captureText"
            data-test="quick-capture-input"
            rows="4"
            class="w-full resize-none rounded-2xl border px-4 py-3.5 text-sm leading-7 outline-none transition-all focus:ring-2 focus:ring-primary/20 sm:min-h-[100px]"
            style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text);"
            :placeholder="t('quickDiary.capture.placeholder')"
            @keydown.meta.enter.prevent="handleCaptureSave"
            @keydown.ctrl.enter.prevent="handleCaptureSave"
          />
          <p class="text-xs" style="color: var(--color-text-muted);">
            <template v-if="checkingExistingDiaryForDate">
              {{ t('quickDiary.capture.checking') }}
            </template>
            <template v-else-if="existingDiaryForDate">
              {{ t('quickDiary.capture.willAppend') }}
            </template>
            <template v-else>
              {{ t('quickDiary.capture.willCreate') }}
            </template>
          </p>
        </div>

        <button
          type="button"
          data-test="quick-capture-save"
          class="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold text-white transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto lg:mt-[82px]"
          style="background: var(--color-primary); box-shadow: 0 4px 12px color-mix(in srgb, var(--color-primary) 20%, transparent);"
          :disabled="captureSaving || checkingExistingDiaryForDate"
          @click="handleCaptureSave"
        >
          <Icon v-if="captureSaving || checkingExistingDiaryForDate" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
          <Icon v-else name="heroicons:paper-airplane" class="h-4 w-4" />
          {{ captureButtonLabel }}
        </button>
      </div>

      <!-- Post-save chips -->
      <div
        v-if="showPostSaveActions"
        class="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border px-3 py-2.5 sm:px-4 sm:py-3"
        style="border-color: color-mix(in srgb, var(--color-secondary) 22%, var(--color-border)); background: color-mix(in srgb, var(--color-secondary) 6%, var(--color-surface-muted));"
      >
        <span
          class="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
          style="background: color-mix(in srgb, var(--color-accent) 14%, var(--color-surface-muted)); color: var(--color-accent);"
        >
          {{ t('quickDiary.capture.savedBrief') }}
        </span>
        <button
          type="button"
          class="rounded-full border px-3 py-1 text-xs font-medium transition-all hover:opacity-80"
          style="border-color: var(--color-border); background: var(--color-surface); color: var(--color-primary);"
          @click="startTradingFollowUp"
        >
          {{ t('quickDiary.capture.followUpTrade') }}
        </button>
        <button
          type="button"
          class="rounded-full border px-3 py-1 text-xs font-medium transition-all hover:opacity-80"
          style="border-color: var(--color-border); background: var(--color-surface); color: var(--color-text-muted);"
          @click="continueWithDetails"
        >
          {{ t('quickDiary.capture.followUpTags') }}
        </button>
      </div>
    </section>

    <!-- Collapsible trigger: expand editor -->
    <button
      type="button"
      class="flex w-full items-center justify-between rounded-2xl border px-5 py-3.5 text-sm font-semibold transition-all active:opacity-90 sm:py-3"
      style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-primary);"
      @click="showExpandedEditor = !showExpandedEditor"
    >
      <span>{{ showExpandedEditor ? t('quickDiary.editor.collapse') : t('quickDiary.editor.expand') }}</span>
      <Icon
        name="heroicons:chevron-down"
        class="h-4 w-4 transition-transform duration-200"
        :class="{ 'rotate-180': showExpandedEditor }"
      />
    </button>

    <!-- Expanded editor (compact mode) -->
    <QuickNoteEditorCore
      v-if="showExpandedEditor"
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
      variant="compact"
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
      @toggle-date-picker="handleToggleDatePicker"
      @toggle-save-mode="handleToggleSaveMode"
      @save="handleSave"
    />

    <!-- More tools chips (only when editor expanded) -->
    <div v-if="showExpandedEditor" class="flex flex-wrap gap-2">
      <button
        type="button"
        class="rounded-full border px-3.5 py-2.5 text-xs font-medium transition-all active:opacity-80 sm:py-2"
        style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text);"
        @click="handleToggleDatePicker"
      >
        {{ t('quickDiary.tools.date') }}
      </button>
      <button
        type="button"
        class="rounded-full border px-3.5 py-2.5 text-xs font-medium transition-all active:opacity-80 sm:py-2"
        style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text);"
        @click="handleSetQuickReminder('tomorrow')"
      >
        {{ t('quickDiary.tools.reminders') }}
      </button>
      <button
        type="button"
        class="rounded-full border px-3.5 py-2.5 text-xs font-medium transition-all active:opacity-80 sm:py-2"
        style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text);"
        @click="showVoiceInput = !showVoiceInput"
      >
        {{ t('quickDiary.tools.voice') }}
      </button>
      <button
        type="button"
        class="rounded-full border px-3.5 py-2.5 text-xs font-medium transition-all active:opacity-80 sm:py-2"
        style="border-color: color-mix(in srgb, var(--color-secondary) 25%, var(--color-border)); background: color-mix(in srgb, var(--color-secondary) 8%, var(--color-surface-muted)); color: var(--color-secondary);"
        @click="showTemplateManager = !showTemplateManager"
      >
        {{ t('quickDiary.tools.templates') }}
      </button>
    </div>

    <!-- Voice input modal (shown when voice chip clicked) -->
    <VoiceInput v-if="showVoiceInput" @result="handleVoiceResult" />

    <!-- Template manager modal -->
    <TemplateManager
      v-model="showTemplateManager"
      @apply="handleApplyTemplate"
    />

    <!-- Collapsible trigger: use template -->
    <button
      type="button"
      class="flex w-full items-center justify-between rounded-2xl border px-5 py-3.5 text-sm font-semibold transition-all active:opacity-90 sm:py-3"
      style="border-color: color-mix(in srgb, var(--color-secondary) 25%, var(--color-border)); background: color-mix(in srgb, var(--color-secondary) 6%, var(--color-surface-muted)); color: var(--color-secondary);"
      @click="showTemplatePanel = !showTemplatePanel"
    >
      <span>{{ showTemplatePanel ? t('quickDiary.templateAssistant.collapse') : t('quickDiary.templateAssistant.expand') }}</span>
      <Icon
        name="heroicons:chevron-down"
        class="h-4 w-4 transition-transform duration-200"
        :class="{ 'rotate-180': showTemplatePanel }"
      />
    </button>

    <!-- Template panel -->
    <div v-if="showTemplatePanel" class="space-y-4">
      <div class="flex flex-wrap gap-2.5">
        <button
          v-for="option in templateOptions"
          :key="option.kind"
          type="button"
          class="rounded-xl border px-4 py-2.5 text-xs font-bold transition-all duration-300 hover:scale-105 active:scale-95"
          :style="state.templateKind === option.kind
            ? 'border-color: var(--color-primary); background: var(--color-primary); color: white; box-shadow: var(--shadow-sm);'
            : 'border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text-soft);'"
          :aria-pressed="state.templateKind === option.kind"
          @click="applyTemplateKind(option.kind)"
        >
          {{ option.label }}
        </button>
      </div>

      <QuickNoteTemplateAssistant
        :template-kind="state.templateKind"
        :template-data="state.templateData"
        :has-template-changes-pending="hasTemplateChangesPending"
        @update:template-data="updateTemplateData"
        @apply-template-changes="applyTemplateChanges"
        @regenerate-template="regenerateFromTemplate"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import QuickNoteEditorCore from '~/components/quicknote/QuickNoteEditorCore.vue'
import QuickNoteTemplateAssistant from '~/components/quicknote/QuickNoteTemplateAssistant.vue'
import VoiceInput from '~/components/VoiceInput.vue'
import TemplateManager from '~/components/TemplateManager.vue'
import { useQuickNoteComposer } from '~/composables/useQuickNoteComposer'
import { getQuickReminderLabel } from '~/lib/quicknote/quick-reminders'
import type { QuickNoteQuickReminderPreset, QuickNoteTemplateKind } from '~/types/quicknote'

const emit = defineEmits<{
  (e: 'saved'): void
}>()

const toast = useToast()
const { t } = useI18n()

// Capture state
const captureText = ref('')
const captureSaving = ref(false)
const showPostSaveActions = ref(false)
const postSaveTimer = ref<ReturnType<typeof setTimeout> | null>(null)

// Editor state
const saving = ref(false)

// Collapsible sections
const showExpandedEditor = ref(false)
const showTemplatePanel = ref(false)
const showVoiceInput = ref(false)
const showTemplateManager = ref(false)

// Temporary expanded panels (for date picker / save mode in compact mode)
const showDatePickerInline = ref(false)
const showSaveModeInline = ref(false)

const {
  state,
  templates,
  reminders,
  draftHint,
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

const captureButtonLabel = computed(() => {
  if (checkingExistingDiaryForDate.value) return t('quickDiary.capture.checking')
  return t('quickDiary.capture.save')
})

// Post-save timer management
function startPostSaveTimer() {
  clearPostSaveTimer()
  showPostSaveActions.value = true
  postSaveTimer.value = setTimeout(() => {
    showPostSaveActions.value = false
    postSaveTimer.value = null
  }, 8000)
}

function clearPostSaveTimer() {
  if (postSaveTimer.value) {
    clearTimeout(postSaveTimer.value)
    postSaveTimer.value = null
  }
}

onMounted(() => {
  const restored = initialize((message) => confirm(message))
  if (restored) {
    toast.info(t('quickDiary.draft.restoreSuccess'))
  }
})

onUnmounted(() => {
  clearPostSaveTimer()
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

function handleToggleDatePicker() {
  showDatePickerInline.value = !showDatePickerInline.value
}

function handleToggleSaveMode() {
  showSaveModeInline.value = !showSaveModeInline.value
}

function handleVoiceResult(transcript: string) {
  appendVoiceTranscript(transcript)
  showVoiceInput.value = false
}

async function handleSave() {
  saving.value = true
  try {
    await save()
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
    startPostSaveTimer()
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
  clearPostSaveTimer()
  showPostSaveActions.value = false
  showTemplatePanel.value = true
  applyTemplateKind('trading')
  setSaveMode('append')
}

function continueWithDetails() {
  clearPostSaveTimer()
  showPostSaveActions.value = false
  showExpandedEditor.value = true
  setSaveMode('append')
}
</script>
