import { computed, type ComputedRef, type Ref, unref } from 'vue'
import { getQuickReminderLabel } from '~/lib/quicknote/quick-reminders'
import type { QuickNoteModalTemplateOption } from '~/lib/quicknote/modal-shell'
import type { useQuickNoteComposer } from '~/composables/useQuickNoteComposer'
import type {
  QuickNoteQuickReminderPreset,
  QuickNoteReminderKey,
} from '~/types/quicknote'

type QuickNoteComposer = ReturnType<typeof useQuickNoteComposer>
type Translate = (key: string, params?: Record<string, unknown>) => string

interface QuickNoteToast {
  info: (message: string, duration?: number) => void
}

export interface CreateQuickNoteEditorControllerOptions {
  t: Translate
  toast: QuickNoteToast
  confirmOverwrite: (message: string) => boolean
  templateOptions: Ref<QuickNoteModalTemplateOption[]> | ComputedRef<QuickNoteModalTemplateOption[]>
  templatePickerOpen: Ref<boolean>
  selectTemplateKind?: (kind: QuickNoteComposer['state']['templateKind']) => void
  save: () => void | Promise<void>
  cancel: () => void
}

export type QuickNoteEditorController = Omit<
  QuickNoteComposer,
  'applySnippet' | 'setQuickReminder' | 'handleReminderSet' | 'handleReminderClear' | 'save'
> & {
  templateOptions: ComputedRef<QuickNoteModalTemplateOption[]>
  templatePickerOpen: Ref<boolean>
  selectTemplateKind: (kind: QuickNoteComposer['state']['templateKind']) => void
  applyTemplate: (content: string) => void
  setQuickReminder: (preset: QuickNoteQuickReminderPreset) => void
  setReminder: (payload: { key: QuickNoteReminderKey; time: string }) => void
  clearReminder: (payload: { key: QuickNoteReminderKey }) => void
  setTemplatePickerOpen: (value: boolean) => void
  save: () => void | Promise<void>
  cancel: () => void
}

/**
 * Adapts the deep composer API to the editor's UI contract.
 * The editor owns rendering; consumers own only their save/cancel follow-up.
 */
export function createQuickNoteEditorController(
  composer: QuickNoteComposer,
  options: CreateQuickNoteEditorControllerOptions,
): QuickNoteEditorController {
  const templateOptions = computed(() => unref(options.templateOptions))

  function applyTemplate(content: string) {
    if (!content) return

    if (composer.state.content.trim()) {
      const replace = options.confirmOverwrite(options.t('quickDiary.confirm.templateOverwrite'))
      composer.applySnippet(content, replace)
      return
    }

    composer.applySnippet(content)
  }

  function setQuickReminder(preset: QuickNoteQuickReminderPreset) {
    composer.setQuickReminder(preset)
    options.toast.info(options.t('quickDiary.reminders.presetSet', {
      label: getQuickReminderLabel(preset, options.t),
    }))
  }

  function setReminder(payload: { key: QuickNoteReminderKey; time: string }) {
    composer.handleReminderSet(payload)
    options.toast.info(options.t('quickDiary.reminders.set'))
  }

  function clearReminder(payload: { key: QuickNoteReminderKey }) {
    composer.handleReminderClear(payload)
    options.toast.info(options.t('quickDiary.reminders.cleared'))
  }

  return {
    ...composer,
    templateOptions,
    templatePickerOpen: options.templatePickerOpen,
    selectTemplateKind: (kind: QuickNoteComposer['state']['templateKind']) => {
      if (options.selectTemplateKind) {
        options.selectTemplateKind(kind)
        return
      }
      composer.applyTemplateKind(kind)
    },
    applyTemplate,
    setQuickReminder,
    setReminder,
    clearReminder,
    setTemplatePickerOpen: (value: boolean) => {
      options.templatePickerOpen.value = value
    },
    save: options.save,
    cancel: options.cancel,
  }
}
