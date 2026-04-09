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
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 backdrop-blur-none"
            enter-to-class="opacity-100 backdrop-blur-sm"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 backdrop-blur-sm"
            leave-to-class="opacity-0 backdrop-blur-none"
          >
            <div
              v-if="show"
              class="fixed inset-0 transition-all"
              style="background: color-mix(in srgb, var(--color-panel-ink) 68%, transparent); backdrop-filter: blur(12px);"
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
                class="flex h-screen flex-col sm:h-auto sm:max-h-[calc(100vh-4rem)] sm:rounded-[28px] sm:border"
                style="backdrop-filter: blur(20px); background: color-mix(in srgb, var(--color-surface) 92%, white); border-color: color-mix(in srgb, var(--color-border) 70%, white); box-shadow: var(--shadow-lg);"
              >
                <div class="flex items-center justify-between border-b px-4 py-4 sm:px-6 sm:py-5" style="border-color: var(--color-border);">
                  <div>
                    <p class="text-[11px] font-semibold uppercase tracking-[0.18em]" style="color: var(--color-secondary);">{{ t('quickDiary.modal.eyebrow') }}</p>
                    <h3 class="text-lg font-semibold sm:text-xl" id="modal-title" style="color: var(--color-text); font-family: var(--font-display);">
                      {{ t('quickDiary.title') }}
                    </h3>
                    <p v-if="step === 2" class="mt-1 text-xs" style="color: var(--color-text-muted);">
                      {{ t('quickDiary.modal.step2Hint') }}
                    </p>
                  </div>
                  <button
                    class="flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200"
                    style="color: var(--color-text-soft);"
                    :aria-label="t('common.close')"
                    @click="close"
                  >
                    <Icon name="heroicons:x-mark" class="h-5 w-5" />
                  </button>
                </div>

                <div class="flex-1 overflow-y-auto p-4 sm:p-6">
                  <div v-if="step === 1" class="space-y-6">
                    <div class="space-y-2 text-center sm:text-left">
                      <p class="text-sm font-medium" style="color: var(--color-text-muted);">{{ t('quickDiary.selectTemplate') }}</p>
                      <p class="text-xs" style="color: var(--color-text-soft);">{{ t('quickDiary.modal.templateSubcopy') }}</p>
                    </div>
                    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <button
                        v-for="template in templates"
                        :key="template.kind"
                        type="button"
                        class="group relative flex flex-col items-center rounded-3xl border p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:items-start sm:text-left"
                        style="border-color: var(--color-border); background: color-mix(in srgb, var(--color-surface-muted) 88%, var(--color-surface));"
                        @click="selectTemplate(template.kind)"
                      >
                        <div
                          class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-white transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm"
                          :class="template.iconClass"
                        >
                          <Icon :name="template.icon" class="h-7 w-7" />
                        </div>
                        <h4 class="text-sm font-bold tracking-tight" style="color: var(--color-text)">{{ template.label }}</h4>
                        <p class="mt-2 text-[11px] leading-relaxed" style="color: var(--color-text-muted)">{{ template.description }}</p>
                        
                        <div class="absolute bottom-4 right-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          <Icon name="heroicons:arrow-right" class="h-4 w-4" style="color: var(--color-primary);" />
                        </div>
                      </button>
                    </div>
                  </div>

                  <div v-else class="space-y-5">
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
                    v-if="step === 2"
                    type="button"
                    class="flex-1 rounded-xl border px-4 py-3 font-medium transition-all duration-200 sm:flex-none sm:px-5 sm:py-2.5"
                    style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text);"
                    @click="step = 1"
                  >
                    {{ t('common.back') }}
                  </button>
                  <button
                    type="button"
                    class="flex-1 rounded-xl border px-4 py-3 font-medium transition-all duration-200 sm:flex-none sm:px-5 sm:py-2.5"
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
import QuickNoteEditorCore from '~/components/quicknote/QuickNoteEditorCore.vue'
import QuickNoteTemplateAssistant from '~/components/quicknote/QuickNoteTemplateAssistant.vue'
import { useQuickNoteComposer } from '~/composables/useQuickNoteComposer'
import { getQuickReminderLabel } from '~/lib/quicknote/quick-reminders'
import { createQuickNoteModalTemplates, resolveQuickNoteSaveErrorMessage } from '~/lib/quicknote/modal-shell'
import type { QuickNoteQuickReminderPreset, QuickNoteTemplateKind } from '~/types/quicknote'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created', diaryId: string): void
}>()

const { t } = useI18n()
const toast = useToast()
const step = ref(1)
const saving = ref(false)

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
  save,
  initialize,
  dispose,
  resetState,
} = useQuickNoteComposer({
  defaultTemplateKind: 'trading',
  defaultSaveMode: 'append',
})

const templates = computed(() => createQuickNoteModalTemplates(t))

watch(
  () => props.show,
  (show) => {
    if (show) {
      initialize((message) => confirm(message))
      return
    }
    dispose()
  },
  { immediate: true }
)

function selectTemplate(kind: QuickNoteTemplateKind) {
  applyTemplateKind(kind)
  step.value = 2
}

function close() {
  step.value = 1
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
    const diary = await save()
    toast.success(t('quickDiary.success'))
    emit('created', String(diary?.id))
    close()
  } catch (error: any) {
    console.error('Error creating quick diary:', error)
    toast.error(resolveQuickNoteSaveErrorMessage(error, t))
  } finally {
    saving.value = false
  }
}
</script>
