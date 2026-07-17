<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 z-50 overflow-y-auto"
        aria-labelledby="modal-title"
        role="dialog"
        aria-modal="true"
      >
        <div class="flex min-h-screen items-end justify-center px-4 pb-20 text-center sm:items-center sm:p-0">
          <Transition
            enter-active-class="transition-opacity duration-300 ease-out"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition-opacity duration-200 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <div
              v-if="show"
              class="fixed inset-0"
              style="background: rgba(0, 0, 0, 0.5);"
              @click="close"
            />
          </Transition>

          <Transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 translate-y-8 scale-95"
            enter-to-class="opacity-100 translate-y-0 scale-100"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 translate-y-0 scale-100"
            leave-to-class="opacity-0 translate-y-8 scale-95"
          >
            <div
              v-if="show"
              class="relative inline-block w-full transform overflow-hidden text-left align-bottom transition-all sm:mx-auto sm:max-w-4xl sm:align-middle"
            >
              <div
                class="flex h-screen flex-col sm:h-auto sm:max-h-[calc(100vh-4rem)] sm:rounded-2xl sm:border"
                style="background: var(--color-surface); border-color: var(--color-border); box-shadow: var(--shadow-lg);"
              >
                <div class="flex items-center justify-between border-b px-4 py-4 sm:px-6 sm:py-5" style="border-color: var(--color-border);">
                  <div class="min-w-0">
                    <p class="text-[11px] font-semibold uppercase tracking-[0.18em]" style="color: var(--color-secondary);">{{ t('quickDiary.modal.eyebrow') }}</p>
                    <h3 class="text-lg font-semibold sm:text-xl" id="modal-title" style="color: var(--color-text); font-family: var(--font-display);">
                      {{ t('quickDiary.title') }}
                    </h3>
                    <p class="mt-1 text-xs" style="color: var(--color-text-muted);">
                      {{ t('quickDiary.modal.editorHint') }}
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      class="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-200"
                      style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text);"
                      :aria-expanded="showTemplatePicker"
                      :aria-controls="'quick-diary-template-picker'"
                      @click="showTemplatePicker = !showTemplatePicker"
                    >
                      <Icon name="heroicons:squares-2x2" class="h-4 w-4" />
                      {{ t('quickDiary.changeTemplate') }}
                    </button>
                    <button
                      class="flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200"
                      style="color: var(--color-text-soft);"
                      :aria-label="t('common.close')"
                      @click="close"
                    >
                      <Icon name="heroicons:x-mark" class="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div class="flex-1 overflow-y-auto p-4 sm:p-6">
                  <div
                    v-if="showTemplatePicker"
                    id="quick-diary-template-picker"
                    class="mb-6 space-y-4 rounded-2xl border p-4"
                    style="border-color: var(--color-border); background: color-mix(in srgb, var(--color-surface-muted) 70%, var(--color-surface));"
                  >
                    <div class="space-y-1">
                      <p class="text-sm font-medium" style="color: var(--color-text-muted);">{{ t('quickDiary.selectTemplate') }}</p>
                      <p class="text-xs" style="color: var(--color-text-soft);">{{ t('quickDiary.modal.templateSubcopy') }}</p>
                    </div>
                    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <button
                        v-for="template in templates"
                        :key="template.kind"
                        type="button"
                        class="group relative flex min-h-[44px] flex-col items-start rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                        :style="state.templateKind === template.kind
                          ? 'border-color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface));'
                          : 'border-color: var(--color-border); background: var(--color-surface);'"
                        :aria-pressed="state.templateKind === template.kind"
                        @click="selectTemplate(template.kind)"
                      >
                        <div
                          class="mb-3 flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm"
                          :class="template.iconClass"
                        >
                          <Icon :name="template.icon" class="h-5 w-5" />
                        </div>
                        <h4 class="text-sm font-bold tracking-tight" style="color: var(--color-text)">{{ template.label }}</h4>
                        <p class="mt-1 text-[11px] leading-relaxed" style="color: var(--color-text-muted)">{{ template.description }}</p>
                      </button>
                    </div>
                  </div>

                  <div class="space-y-5">
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
                      :templates="templatesFromStorage"
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
                </div>

                <div class="flex gap-3 border-t px-4 py-4 sm:justify-end sm:px-6" style="border-color: var(--color-border);">
                  <button
                    type="button"
                    class="flex-1 rounded-xl border px-4 py-3 font-medium transition-all duration-200 sm:flex-none sm:px-5 sm:py-2.5 min-h-[44px]"
                    style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text);"
                    @click="close"
                  >
                    {{ t('common.cancel') }}
                  </button>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import QuickNoteEditorCore from '~/components/quicknote/QuickNoteEditorCore.vue'
import QuickNoteTemplateAssistant from '~/components/quicknote/QuickNoteTemplateAssistant.vue'
import { useDiaryMutation } from '~/composables/useDiaryMutation'
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
const lastTemplateKind = useLocalStorage<QuickNoteTemplateKind>(LAST_TEMPLATE_KEY, 'blank')

const {
  state,
  templates: templatesFromStorage,
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
  syncExistingDiaryForDate,
  save,
  initialize,
  dispose,
  resetState,
} = useQuickNoteComposer({
  defaultTemplateKind: 'blank',
  defaultSaveMode: 'create',
})

const templates = computed(() => createQuickNoteModalTemplates(t))

function resolveOpenTemplateKind(restoredDraft: boolean): QuickNoteTemplateKind | null {
  // Explicit context wins only when no draft was restored.
  if (!restoredDraft && props.context?.templateKind) {
    return props.context.templateKind
  }
  if (!restoredDraft) {
    return lastTemplateKind.value || 'blank'
  }
  return null
}

function applyOpenContext(restoredDraft: boolean) {
  const kind = resolveOpenTemplateKind(restoredDraft)
  if (kind) {
    applyTemplateKind(kind)
  }

  // Capture sources may pin a date (e.g. calendar empty day). Apply after draft restore.
  if (props.context?.date) {
    setDate(props.context.date)
  }
}

watch(
  () => props.show,
  (show) => {
    if (show) {
      const restored = Boolean(initialize((message) => confirm(message)))
      applyOpenContext(restored)
      void syncExistingDiaryForDate()
      showTemplatePicker.value = false
      return
    }
    dispose()
  },
  { immediate: true }
)

function selectTemplate(kind: QuickNoteTemplateKind) {
  applyTemplateKind(kind)
  lastTemplateKind.value = kind
  showTemplatePicker.value = false
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
  saving.value = true
  try {
    // Capture before save() resets composer state
    const mode = state.saveMode
    const date = state.date
    const kind = state.templateKind
    const diary = await save()
    const diaryId = String(diary?.id ?? '')

    lastTemplateKind.value = kind
    if (diaryId) {
      notifyDiaryCreated({ id: diaryId, date, mode })
    }

    toast.success(
      mode === 'append'
        ? t('quickDiary.successAppend')
        : t('quickDiary.successCreate')
    )
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
