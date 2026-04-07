import { computed, getCurrentInstance, onUnmounted, reactive, ref, toRef, watch } from 'vue'
import { generateTemplateDraft } from '~/lib/quicknote/generate-template-draft'
import { resolveQuickReminderTime } from '~/lib/quicknote/quick-reminders'
import { useQuickNoteDraft } from '~/composables/useQuickNoteDraft'
import { useQuickNoteReminders } from '~/composables/useQuickNoteReminders'
import { useQuickNoteSubmit } from '~/composables/useQuickNoteSubmit'
import { useQuickNoteTemplates } from '~/composables/useQuickNoteTemplates'
import {
  createEmptyQuickNoteTemplateData,
  type QuickNoteComposerState,
  type QuickNoteQuickReminderPreset,
  type QuickNoteReminderKey,
  type QuickNoteSaveMode,
  type QuickNoteTemplateData,
  type QuickNoteTemplateKind,
} from '~/types/quicknote'

interface UseQuickNoteComposerOptions {
  defaultTemplateKind?: QuickNoteTemplateKind
  defaultSaveMode?: QuickNoteSaveMode
}

function cloneTemplateData(data: QuickNoteTemplateData | undefined): QuickNoteTemplateData {
  return {
    ...createEmptyQuickNoteTemplateData(),
    ...(data || {}),
  }
}

function normalizeSymbols(symbols: string | undefined): string {
  if (!symbols) return ''
  return symbols
    .split(',')
    .map(symbol => symbol.trim().toUpperCase())
    .filter(Boolean)
    .join(', ')
}

export function useQuickNoteComposer(options: UseQuickNoteComposerOptions = {}) {
  const { getTodayDateString } = useTimezone()
  const i18n = useI18n() as { locale?: string | { value?: string }; t: (key: string, params?: Record<string, unknown>) => string }
  const locale = computed(() => {
    const rawLocale = i18n.locale
    if (typeof rawLocale === 'string') return rawLocale
    return rawLocale?.value || 'en'
  })
  const t = (key: string, params?: Record<string, unknown>) => i18n.t(key, params)
  const { draft, hasDraft, lastSavedAt, saveDraft, clearDraft } = useQuickNoteDraft()
  const { reminders, setReminder, clearReminder, checkReminders } = useQuickNoteReminders()
  const { templates } = useQuickNoteTemplates()
  const { submitQuickNote } = useQuickNoteSubmit()

  const defaultTemplateKind = options.defaultTemplateKind ?? 'blank'
  const defaultSaveMode = options.defaultSaveMode ?? 'create'

  const state = reactive<QuickNoteComposerState>({
    date: getTodayDateString(),
    saveMode: defaultSaveMode,
    templateKind: defaultTemplateKind,
    title: '',
    content: '',
    tags: [],
    reminders: reminders.value,
    templateData: createEmptyQuickNoteTemplateData(),
    titleTouched: false,
    contentTouched: false,
  })

  const readyForAutosave = ref(false)
  const restoredThisSession = ref(false)
  const nowTick = ref(Date.now())
  const appliedTemplateContent = ref('')
  let reminderTimer: ReturnType<typeof setInterval> | null = null

  const suggestedDraft = computed(() => generateTemplateDraft({
      templateKind: state.templateKind,
      date: state.date,
      locale: locale.value,
      templateData: state.templateData,
  }))

  const draftHint = computed(() => {
    if (!lastSavedAt.value) return ''
    return t('quickDiary.draft.saved')
  })

  const activeReminders = computed(() => {
    const now = nowTick.value
    return (['reminder1'] as QuickNoteReminderKey[])
      .map((key, index) => {
        const time = reminders.value[key]
        if (!time) return null
        const target = new Date(time).getTime()
        if (!Number.isFinite(target) || target <= now) return null
        const totalMinutes = Math.max(0, Math.floor((target - now) / 60000))
        const remaining = totalMinutes < 1
          ? t('quickDiary.reminders.remaining.lessThanMinute')
          : totalMinutes < 60
            ? t('quickDiary.reminders.remaining.minutes', { count: totalMinutes })
            : totalMinutes % 60
              ? t('quickDiary.reminders.remaining.hoursMinutes', {
                  hours: Math.floor(totalMinutes / 60),
                  minutes: totalMinutes % 60,
                })
              : t('quickDiary.reminders.remaining.hours', { count: Math.floor(totalMinutes / 60) })

        return {
          key,
          label: index === 0
            ? t('quickDiary.reminders.label')
            : t('quickDiary.reminders.labelIndexed', { index: index + 1 }),
          remaining,
        }
      })
      .filter(Boolean) as Array<{ key: string; label: string; remaining: string }>
  })

  const hasTemplateChangesPending = computed(() => {
    if (state.templateKind === 'blank') return false
    if (state.contentTouched && appliedTemplateContent.value !== suggestedDraft.value.content) return true
    return false
  })

  function syncSuggestedDraft(force = false) {
    if (force || !state.titleTouched) {
      state.title = suggestedDraft.value.title
    }
    if (force || !state.contentTouched) {
      state.content = suggestedDraft.value.content
      appliedTemplateContent.value = suggestedDraft.value.content
    }
  }

  watch(
    () => [state.templateKind, state.date, locale.value, JSON.stringify(state.templateData)],
    () => syncSuggestedDraft(),
    { immediate: true }
  )

  watch(
    () => [state.title, state.content, state.tags, state.date, state.saveMode, state.templateKind, state.templateData],
    () => {
      if (!readyForAutosave.value) return
      saveDraft({
        title: state.title,
        content: state.content,
        tags: state.tags,
        date: state.date,
        saveMode: state.saveMode,
        templateKind: state.templateKind,
        templateData: { ...state.templateData },
      })
    },
    { deep: true }
  )

  function applyTemplateKind(kind: QuickNoteTemplateKind) {
    state.templateKind = kind
    if (kind === 'blank') {
      Object.assign(state.templateData, createEmptyQuickNoteTemplateData())
    }
    syncSuggestedDraft()
  }

  function updateTemplateData(patch: Partial<QuickNoteTemplateData>) {
    const nextPatch = { ...patch }
    if (typeof nextPatch.symbols === 'string') {
      nextPatch.symbols = normalizeSymbols(nextPatch.symbols)
    }
    Object.assign(state.templateData, nextPatch)
    syncSuggestedDraft()
  }

  function setTitle(title: string) {
    state.title = title
    state.titleTouched = true
  }

  function setContent(content: string) {
    state.content = content
    state.contentTouched = true
  }

  function setTags(tags: string[]) {
    state.tags = tags
  }

  function setDate(date: string) {
    state.date = date
    syncSuggestedDraft()
  }

  function setSaveMode(saveMode: QuickNoteSaveMode) {
    state.saveMode = saveMode
  }

  function appendVoiceTranscript(text: string) {
    const next = [state.content, text].filter(Boolean).join(' ')
    setContent(next.trim())
  }

  function applySnippet(templateContent: string, replace = false) {
    if (!templateContent) return
    if (replace || !state.content.trim()) {
      setContent(templateContent)
      return
    }
    setContent([state.content, templateContent].filter(Boolean).join('\n\n').trim())
  }

  function mergeTemplateContent(currentContent: string, nextTemplateContent: string): string {
    const current = currentContent.trim()
    const nextTemplate = nextTemplateContent.trim()
    const previousTemplate = appliedTemplateContent.value.trim()

    if (!current) return nextTemplate

    if (previousTemplate && current.includes(previousTemplate)) {
      const updated = current.replace(previousTemplate, nextTemplate).trim()
      return updated || current
    }

    if (!nextTemplate || current === nextTemplate) {
      return current
    }

    return [current, nextTemplate].join('\n\n').trim()
  }

  function applyTemplateChanges() {
    state.content = mergeTemplateContent(state.content, suggestedDraft.value.content)
    state.contentTouched = true
    appliedTemplateContent.value = suggestedDraft.value.content
  }

  function regenerateFromTemplate() {
    applyTemplateChanges()
  }

  function setQuickReminder(preset: QuickNoteQuickReminderPreset) {
    const target = resolveQuickReminderTime(preset)
    setReminder('reminder1', target)
  }

  function handleReminderSet(payload: { key: QuickNoteReminderKey; time: string }) {
    setReminder(payload.key, payload.time)
  }

  function handleReminderClear(payload: { key: QuickNoteReminderKey }) {
    clearReminder(payload.key)
  }

  function clearAllReminders() {
    clearReminder('reminder1')
  }

  function resetState() {
    state.date = getTodayDateString()
    state.saveMode = defaultSaveMode
    state.templateKind = defaultTemplateKind
    state.tags = []
    Object.assign(state.templateData, createEmptyQuickNoteTemplateData())
    state.titleTouched = false
    state.contentTouched = false
    syncSuggestedDraft(true)
  }

  async function save() {
    const title = state.title.trim() || suggestedDraft.value.title
    const content = state.content.trim()

    if (!title) {
      throw new Error('TITLE_REQUIRED')
    }
    if (!content) {
      throw new Error('CONTENT_REQUIRED')
    }

    const result = await submitQuickNote({
      title,
      content,
      date: state.date,
      saveMode: state.saveMode,
      tags: state.tags,
    })

    clearDraft()
    clearAllReminders()
    resetState()

    return result
  }

  function restoreDraftIfAvailable(confirmRestore?: (message: string) => boolean) {
    if (restoredThisSession.value || !hasDraft.value) return false

    const shouldRestore = confirmRestore ? confirmRestore(t('quickDiary.draft.restorePrompt')) : true
    restoredThisSession.value = true

    if (!shouldRestore) {
      clearDraft()
      return false
    }

    state.title = draft.value.title || ''
    state.content = draft.value.content || ''
    state.tags = draft.value.tags || []
    state.date = draft.value.date || getTodayDateString()
    state.saveMode = draft.value.saveMode || defaultSaveMode
    state.templateKind = draft.value.templateKind || defaultTemplateKind
    Object.assign(state.templateData, cloneTemplateData(draft.value.templateData))
    state.titleTouched = Boolean(state.title)
    state.contentTouched = Boolean(state.content)
    appliedTemplateContent.value = state.templateKind === 'blank' ? '' : suggestedDraft.value.content
    return true
  }

  function initialize(confirmRestore?: (message: string) => boolean) {
    const restored = restoreDraftIfAvailable(confirmRestore)
    readyForAutosave.value = true
    checkReminders()
    reminderTimer = setInterval(() => {
      nowTick.value = Date.now()
      checkReminders()
    }, 30000)
    return restored
  }

  function dispose() {
    if (reminderTimer) clearInterval(reminderTimer)
    reminderTimer = null
  }

  if (getCurrentInstance()) {
    onUnmounted(() => {
      dispose()
    })
  }

  return {
    state,
    saveMode: toRef(state, 'saveMode'),
    title: toRef(state, 'title'),
    content: toRef(state, 'content'),
    tags: toRef(state, 'tags'),
    date: toRef(state, 'date'),
    templateKind: toRef(state, 'templateKind'),
    templates,
    reminders,
    draftHint,
    activeReminders,
    suggestedDraft,
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
  }
}
