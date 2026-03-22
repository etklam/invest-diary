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
              class="fixed inset-0 bg-gradient-to-br from-gray-900/60 via-gray-800/60 to-indigo-900/40 backdrop-blur-md transition-all"
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
              class="relative inline-block w-full transform overflow-hidden text-left align-bottom transition-all sm:mx-auto sm:max-w-3xl sm:align-middle"
            >
              <div class="flex h-screen flex-col backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 sm:h-auto sm:max-h-[calc(100vh-4rem)] sm:rounded-3xl sm:border sm:border-white/10 sm:shadow-2xl sm:shadow-gray-900/20">
                <div class="flex items-center justify-between border-b border-gray-200/50 px-4 py-4 sm:px-6 sm:py-5 dark:border-gray-700/50">
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white sm:text-xl" id="modal-title">
                      {{ t('quickDiary.title') }}
                    </h3>
                    <p v-if="step === 2" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      模板建立的是草稿建議，送出前仍可自由編輯。
                    </p>
                  </div>
                  <button
                    class="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 transition-all duration-200 hover:bg-gray-100/50 hover:text-gray-600 dark:hover:bg-gray-700/50 dark:hover:text-gray-300"
                    :aria-label="t('common.close')"
                    @click="close"
                  >
                    <Icon name="heroicons:x-mark" class="h-5 w-5" />
                  </button>
                </div>

                <div class="flex-1 overflow-y-auto p-4 sm:p-6">
                  <div v-if="step === 1" class="space-y-4">
                    <p class="text-sm text-gray-600 dark:text-gray-400">{{ t('quickDiary.selectTemplate') }}</p>
                    <div class="grid gap-4 sm:grid-cols-3">
                      <button
                        v-for="template in templates"
                        :key="template.kind"
                        type="button"
                        class="group rounded-2xl border border-gray-200/60 bg-white/60 p-5 text-left transition-all duration-200 hover:border-indigo-400/60 hover:bg-white/80 hover:shadow-lg hover:shadow-indigo-500/10 dark:border-gray-700/60 dark:bg-gray-800/60 dark:hover:bg-gray-800/80"
                        @click="selectTemplate(template.kind)"
                      >
                        <div
                          class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-white transition-transform duration-200 group-hover:scale-110"
                          :class="template.iconClass"
                        >
                          <Icon :name="template.icon" class="h-6 w-6" />
                        </div>
                        <h4 class="text-sm font-semibold text-gray-900 dark:text-white">{{ template.label }}</h4>
                        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ template.description }}</p>
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
                      :title="state.title"
                      :content="state.content"
                      :tags="state.tags"
                      :date="state.date"
                      :save-mode="state.saveMode"
                      :saving="saving"
                      :draft-hint="draftHint"
                      :save-label="t('quickDiary.createDiary')"
                      :saving-label="t('quickDiary.creating')"
                      :templates="templatesFromStorage"
                      :reminders="reminders"
                      :active-reminders="activeReminders"
                      @update:title="setTitle"
                      @update:content="setContent"
                      @update:tags="setTags"
                      @update:date="setDate"
                      @update:saveMode="setSaveMode"
                      @append-text="appendVoiceTranscript"
                      @apply-template="handleApplyTemplate"
                      @set-quick-reminder="handleSetQuickReminder"
                      @reminder-set="handleSetReminder"
                      @reminder-clear="handleClearReminder"
                      @save="handleSave"
                    />
                  </div>
                </div>

                <div class="flex gap-3 border-t border-gray-200/50 px-4 py-4 sm:justify-end sm:px-6 dark:border-gray-700/50">
                  <button
                    v-if="step === 2"
                    type="button"
                    class="flex-1 rounded-xl border border-gray-300/60 bg-white/60 px-4 py-3 font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50/80 sm:flex-none sm:px-5 sm:py-2.5 dark:border-gray-600/60 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:bg-gray-700/60"
                    @click="step = 1"
                  >
                    {{ t('common.back') }}
                  </button>
                  <button
                    type="button"
                    class="flex-1 rounded-xl border border-gray-300/60 bg-white/60 px-4 py-3 font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50/80 sm:flex-none sm:px-5 sm:py-2.5 dark:border-gray-600/60 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:bg-gray-700/60"
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
  defaultSaveMode: 'append',
  defaultTemplateKind: 'trading',
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
    const replace = confirm('已有內容，是否用模板覆蓋？')
    applySnippet(templateContent, replace)
    return
  }
  applySnippet(templateContent)
}

function handleSetQuickReminder(preset: QuickNoteQuickReminderPreset) {
  setQuickReminder(preset)
  toast.info(`已設定${getQuickReminderLabel(preset)}提醒`)
}

function handleSetReminder(payload: { key: 'reminder1' | 'reminder2' | 'reminder3'; time: string }) {
  handleReminderSet(payload)
  toast.info('提醒已設定')
}

function handleClearReminder(payload: { key: 'reminder1' | 'reminder2' | 'reminder3' }) {
  handleReminderClear(payload)
  toast.info('提醒已清除')
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
