<template>
  <div class="p-4 space-y-6">
    <section class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200">快速筆記流程</h2>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">可直接自由編輯，也可以先用模板建立草稿再修改。</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="option in templateOptions"
            :key="option.kind"
            type="button"
            class="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200"
            :class="state.templateKind === option.kind
              ? 'border-indigo-600 bg-indigo-600 text-white'
              : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300 hover:text-indigo-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'"
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
      :title="state.title"
      :content="state.content"
      :tags="state.tags"
      :date="state.date"
      :save-mode="state.saveMode"
      :saving="saving"
      :draft-hint="draftHint"
      :templates="templates"
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
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import QuickNoteEditorCore from '~/components/quicknote/QuickNoteEditorCore.vue'
import QuickNoteTemplateAssistant from '~/components/quicknote/QuickNoteTemplateAssistant.vue'
import { useQuickNoteComposer } from '~/composables/useQuickNoteComposer'
import { getQuickReminderLabel } from '~/lib/quicknote/quick-reminders'
import type { QuickNoteQuickReminderPreset, QuickNoteTemplateKind } from '~/types/quicknote'

const emit = defineEmits<{
  (e: 'saved'): void
}>()

const toast = useToast()
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
  defaultSaveMode: 'create',
  defaultTemplateKind: 'blank',
})

const templateOptions: Array<{ kind: QuickNoteTemplateKind; label: string }> = [
  { kind: 'blank', label: '自由編輯' },
  { kind: 'trading', label: '交易日記' },
  { kind: 'reflection', label: '盤後反思' },
  { kind: 'observation', label: '市場觀察' },
]

onMounted(() => {
  const restored = initialize((message) => confirm(message))
  if (restored) {
    toast.info('已恢復草稿')
  }
})

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
    await save()
    toast.success('已儲存快速筆記')
    emit('saved')
  } catch (error: any) {
    if (error?.message === 'CONTENT_REQUIRED') {
      toast.warning('請先輸入內容')
      return
    }
    if (error?.message === 'TITLE_REQUIRED') {
      toast.warning('請先輸入標題')
      return
    }
    toast.error(error.data?.statusMessage || '儲存失敗')
  } finally {
    saving.value = false
  }
}
</script>
