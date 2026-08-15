<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 z-[100] overflow-y-auto"
        aria-labelledby="quick-note-modal-title"
        role="dialog"
        aria-modal="true"
        @keydown="handleDialogKeydown"
      >
        <div class="flex min-h-[100dvh] items-end justify-center sm:items-center sm:p-6">
          <div class="fixed inset-0 bg-black/55" @click="close" />

          <div
            ref="dialogPanel"
            class="relative flex h-[100dvh] w-full flex-col overflow-hidden sm:h-auto sm:max-h-[calc(100dvh-48px)] sm:max-w-[1120px] sm:rounded-dt-lg sm:border"
            style="border-color: var(--color-border); background: var(--color-surface); box-shadow: var(--shadow-lg);"
            tabindex="-1"
          >
            <header class="flex min-h-14 items-center justify-between gap-3 border-b px-4 py-2.5 sm:min-h-[72px] sm:gap-4 sm:px-6 sm:py-3" style="border-color: var(--color-border);">
              <div class="flex min-w-0 items-center gap-3">
                <h1 id="quick-note-modal-title" class="truncate text-lg font-semibold sm:text-xl" style="color: var(--color-text); font-family: var(--font-display);">
                  {{ t('quickDiary.title') }}
                </h1>
                <span v-if="draftHint" class="truncate text-xs" style="color: var(--color-text-soft);" aria-live="polite">
                  {{ draftHint }}
                </span>
              </div>

              <div class="flex shrink-0 items-center gap-1.5">
                <!-- Template lives next to content on mobile; keep header control from sm up -->
                <button
                  type="button"
                  class="hidden min-h-11 items-center gap-2 rounded-dt-sm border px-3 text-xs font-semibold transition-colors hover:border-dt-primary hover:text-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30 sm:inline-flex"
                  style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text-muted);"
                  :aria-expanded="showTemplatePicker"
                  :aria-controls="'quick-note-template-picker'"
                  @click="showTemplatePicker = !showTemplatePicker"
                >
                  <Icon name="heroicons:squares-2x2" class="h-4 w-4" />
                  <span>{{ t('quickDiary.changeTemplate') }}</span>
                </button>
                <button
                  type="button"
                  class="flex h-11 w-11 items-center justify-center rounded-dt-sm transition-colors hover:bg-dt-surface-muted focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
                  style="color: var(--color-text-soft);"
                  :aria-label="t('common.close')"
                  @click="close"
                >
                  <Icon name="heroicons:x-mark" class="h-5 w-5" />
                </button>
              </div>
            </header>

            <QuickNoteEditorCore
              :save-mode="state.saveMode"
              :title="state.title"
              :content="state.content"
              :tags="state.tags"
              :stock-symbols="state.stockSymbols"
              :date="state.date"
              :saving="saving"
              :draft-hint="draftHint"
              :draft-status="draftStatus"
              :save-label="state.saveMode === 'append' ? t('quickDiary.appendDiary') : t('quickDiary.createDiary')"
              :saving-label="state.saveMode === 'append' ? t('quickDiary.appending') : t('quickDiary.creating')"
              :templates="templatesFromStorage"
              :reminders="reminders"
              :active-reminders="activeReminders"
              :existing-diary-for-date="existingDiaryForDate"
              :checking-existing-diary-for-date="checkingExistingDiaryForDate"
              :template-kind="state.templateKind"
              :template-data="state.templateData"
              :has-template-changes-pending="hasTemplateChangesPending"
              :template-options="templates"
              :template-picker-open="showTemplatePicker"
              :autofocus="autofocusEditor"
              scrollable
              @update:title="setTitle"
              @update:content="setContent"
              @update:tags="setTags"
              @update:stock-symbols="setStockSymbols"
              @update:date="setDate"
              @update:save-mode="setSaveMode"
              @append-text="appendVoiceTranscript"
              @apply-template="handleApplyTemplate"
              @update:template-data="updateTemplateData"
              @apply-template-changes="applyTemplateChanges"
              @regenerate-template="regenerateFromTemplate"
              @update:template-picker-open="showTemplatePicker = $event"
              @select-template-kind="selectTemplate"
              @set-quick-reminder="handleSetQuickReminder"
              @reminder-set="handleSetReminder"
              @reminder-clear="handleClearReminder"
              @retry-draft="retryDraftSave"
              @save="handleSave"
              @cancel="close"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import QuickNoteEditorCore from '~/components/quicknote/QuickNoteEditorCore.vue'
import { useDiaryMutation } from '~/composables/useDiaryMutation'
import { useDialogA11y } from '~/composables/useDialogA11y'
import { useQuickNoteComposer } from '~/composables/useQuickNoteComposer'
import { getQuickReminderLabel } from '~/lib/quicknote/quick-reminders'
import { createQuickNoteModalTemplates, resolveQuickNoteSaveErrorMessage } from '~/lib/quicknote/modal-shell'
import type {
  QuickDiaryContext,
  QuickNoteQuickReminderPreset,
  QuickNoteTemplateKind,
} from '~/types/quicknote'

const LAST_TEMPLATE_KEY = 'quick-note-last-template-kind'

const props = withDefaults(defineProps<{
  show: boolean
  context?: QuickDiaryContext | null
}>(), {
  context: null,
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created', diaryId: string): void
}>()

const { t } = useI18n()
const toast = useToast()
const { notifyDiaryCreated } = useDiaryMutation()
const saving = ref(false)
const showTemplatePicker = ref(false)
const autofocusEditor = ref(false)
const dialogPanel = ref<HTMLElement | null>(null)
const lastTemplateKind = useLocalStorage<QuickNoteTemplateKind>(LAST_TEMPLATE_KEY, 'blank')

const {
  state,
  templates: templatesFromStorage,
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
  setStockSymbols,
  setDate,
  setSaveMode,
  appendVoiceTranscript,
  applySnippet,
  applyTemplateChanges,
  regenerateFromTemplate,
  setQuickReminder,
  handleReminderSet,
  handleReminderClear,
  retryDraftSave,
  save,
  initialize,
  dispose,
  resetState,
} = useQuickNoteComposer({
  defaultTemplateKind: 'blank',
  defaultSaveMode: 'create',
})

const { handleKeydown: handleDialogKeydown } = useDialogA11y(dialogPanel, {
  open: () => props.show,
  disabled: saving,
  focusOnOpen: false,
  onEscape: close,
})

const templates = computed(() => {
  const options = createQuickNoteModalTemplates(t)
  if (lastTemplateKind.value === 'blank') return options
  return [
    ...options.filter(option => option.kind === 'blank'),
    ...options.filter(option => option.kind === lastTemplateKind.value),
    ...options.filter(option => option.kind !== 'blank' && option.kind !== lastTemplateKind.value),
  ]
})

function applyOpenContext(restoredDraft: boolean) {
  const prefillContent = props.context?.content?.trim() ?? ''
  const prefillSymbols = props.context?.stockSymbols ?? []

  if (restoredDraft) {
    if (!prefillContent && !prefillSymbols.length) return
    // Draft protection (PRD §38): never silently overwrite a restored draft.
    // Confirm = prepend prefill above the draft text; cancel = keep draft untouched.
    if (!confirm(t('quickDiary.draft.prefillAppendPrompt'))) return
    if (prefillContent) setContent([prefillContent, state.content].filter(Boolean).join('\n\n'))
    if (prefillSymbols.length) setStockSymbols([...state.stockSymbols, ...prefillSymbols])
    return
  }

  if (props.context?.templateKind) applyTemplateKind(props.context.templateKind)
  if (props.context?.date) setDate(props.context.date)
  if (prefillContent) setContent(prefillContent)
  if (prefillSymbols.length) setStockSymbols(prefillSymbols)
}

watch(
  () => props.show,
  (show) => {
    if (show) {
      const restored = Boolean(initialize((message) => confirm(message)))
      applyOpenContext(restored)
      autofocusEditor.value = !restored && !state.content.trim()
      showTemplatePicker.value = false
      void nextTick(() => {
        if (!autofocusEditor.value) dialogPanel.value?.focus()
      })
      return
    }
    dispose()
    showTemplatePicker.value = false
    autofocusEditor.value = false
  },
  { immediate: true },
)

function selectTemplate(kind: QuickNoteTemplateKind) {
  applyTemplateKind(kind)
  lastTemplateKind.value = kind
}

function close() {
  showTemplatePicker.value = false
  resetState()
  emit('close')
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

async function handleSave() {
  if (saving.value) return
  saving.value = true
  try {
    const mode = state.saveMode
    const date = state.date
    const kind = state.templateKind
    const diary = await save()
    const diaryId = String(diary?.id ?? '')

    lastTemplateKind.value = kind
    showTemplatePicker.value = false
    if (diaryId) notifyDiaryCreated({ id: diaryId, date, mode })

    toast.success(mode === 'append' ? t('quickDiary.successAppend') : t('quickDiary.successCreate'))
    emit('created', diaryId)
    close()
  } catch (error: any) {
    console.error('Error creating quick diary:', error)
    toast.error(resolveQuickNoteSaveErrorMessage(error, t))
  } finally {
    saving.value = false
  }
}

</script>
