import { computed, getCurrentInstance, onUnmounted, reactive, ref, toRef, watch } from 'vue'
import { resolveQuickReminderTime } from '~/lib/quicknote/quick-reminders'
import { useQuickNoteDraft } from '~/composables/useQuickNoteDraft'
import { useQuickNoteReminders } from '~/composables/useQuickNoteReminders'
import { useQuickNoteSubmit } from '~/composables/useQuickNoteSubmit'
import { cloneQuickNoteTemplateData, useQuickNoteTemplateDraft } from '~/composables/useQuickNoteTemplateDraft'
import { useQuickNoteTemplates } from '~/composables/useQuickNoteTemplates'
import {
  createEmptyQuickNoteTemplateData,
  type QuickNoteComposerState,
  type QuickNoteQuickReminderPreset,
  type QuickNoteReminderKey,
  type QuickNoteSaveMode,
  type QuickNoteTemplateKind,
} from '~/types/quicknote'

interface UseQuickNoteComposerOptions {
  defaultTemplateKind?: QuickNoteTemplateKind
  defaultSaveMode?: QuickNoteSaveMode
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
  const saveModeTouched = ref(false)
  const existingDiaryForDate = ref(false)
  const checkingExistingDiaryForDate = ref(false)
  let reminderTimer: ReturnType<typeof setInterval> | null = null

  const {
    suggestedDraft,
    hasTemplateChangesPending,
    syncSuggestedDraft,
    applyTemplateKind,
    updateTemplateData,
    applyTemplateChanges,
    regenerateFromTemplate,
    setAppliedTemplateContent,
  } = useQuickNoteTemplateDraft(state, locale)

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
    saveModeTouched.value = false
    syncSuggestedDraft()
    void syncExistingDiaryForDate(date)
  }

  function setSaveMode(saveMode: QuickNoteSaveMode) {
    state.saveMode = saveMode
    saveModeTouched.value = true
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
    saveModeTouched.value = false
    syncSuggestedDraft(true)
  }

  async function syncExistingDiaryForDate(date = state.date) {
    if (typeof $fetch !== 'function') return existingDiaryForDate.value

    checkingExistingDiaryForDate.value = true
    try {
      const diary = await $fetch('/api/diaries/by-date', {
        query: { date },
      })
      const hasDiary = Boolean(diary)
      existingDiaryForDate.value = hasDiary
      if (!saveModeTouched.value) {
        state.saveMode = hasDiary ? 'append' : defaultSaveMode
      }
      return hasDiary
    } catch {
      return existingDiaryForDate.value
    } finally {
      checkingExistingDiaryForDate.value = false
    }
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
    Object.assign(state.templateData, cloneQuickNoteTemplateData(draft.value.templateData))
    state.titleTouched = Boolean(state.title)
    state.contentTouched = Boolean(state.content)
    saveModeTouched.value = Boolean(draft.value.saveMode)
    setAppliedTemplateContent(state.templateKind === 'blank' ? '' : suggestedDraft.value.content)
    return true
  }

  function initialize(confirmRestore?: (message: string) => boolean) {
    const restored = restoreDraftIfAvailable(confirmRestore)
    readyForAutosave.value = true
    checkReminders()
    void syncExistingDiaryForDate()
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
    existingDiaryForDate,
    checkingExistingDiaryForDate,
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
    syncExistingDiaryForDate,
    save,
    initialize,
    dispose,
    resetState,
  }
}
