import { computed, getCurrentInstance, nextTick, onUnmounted, reactive, ref, toRef, watch } from 'vue'
import { useDebounceFn, useLocalStorage } from '@vueuse/core'
import { toUtcNoonDate } from '~/lib/dates/normalize'
import { generateTemplateDraft } from '~/lib/quicknote/generate-template-draft'
import { resolveQuickReminderTime } from '~/lib/quicknote/quick-reminders'
import { useQuickNoteTemplates } from '~/composables/useQuickNoteTemplates'
import type { SerializedId } from '~/types/common'
import {
  createEmptyQuickNoteTemplateData,
  type QuickNoteComposerState,
  type QuickNoteQuickReminderPreset,
  type QuickNoteReminderKey,
  type QuickNoteReminders,
  type QuickNoteSaveMode,
  type QuickNoteTemplateData,
  type QuickNoteTemplateKind,
} from '~/types/quicknote'

// ---------------------------------------------------------------------------
// Internal helpers (inlined from deleted sub-composables)
// ---------------------------------------------------------------------------

function cloneQuickNoteTemplateData(data: QuickNoteTemplateData | undefined): QuickNoteTemplateData {
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

function normalizeQuickNoteDate(date: string | Date): string {
  return toUtcNoonDate(date).toISOString()
}

function deriveQuickNoteTitle(content: string, fallbackTitle: string): string {
  const firstLine = content
    .split(/\r?\n/)
    .map(line => line.replace(/^\s*#+\s*/, '').trim())
    .find(Boolean)

  if (!firstLine) return fallbackTitle

  const shortened = firstLine.length > 72
    ? `${firstLine.slice(0, 69).trimEnd()}…`
    : firstLine

  return `${shortened} — ${fallbackTitle}`.slice(0, 100)
}

// ---------------------------------------------------------------------------
// Draft interface (kept for autosave shape clarity)
// ---------------------------------------------------------------------------

interface QuickNoteDraft {
  title: string
  content: string
  tags: string[]
  stockSymbols: string[]
  date: string
  saveMode: QuickNoteSaveMode
  templateKind: QuickNoteTemplateKind
  templateData: QuickNoteTemplateData
  savedAt: string
}

// ---------------------------------------------------------------------------
// Composer options
// ---------------------------------------------------------------------------

interface UseQuickNoteComposerOptions {
  defaultTemplateKind?: QuickNoteTemplateKind
  defaultSaveMode?: QuickNoteSaveMode
}

// ---------------------------------------------------------------------------
// Draft storage keys & TTL
// ---------------------------------------------------------------------------

const DRAFT_KEY = 'quick-note-draft'
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000
const REMINDER_KEY = 'quick-note-reminders'

// ---------------------------------------------------------------------------
// useQuickNoteComposer — main orchestrator (deep module)
// ---------------------------------------------------------------------------

export function useQuickNoteComposer(options: UseQuickNoteComposerOptions = {}) {
  const { getTodayDateString } = useTimezone()
  const i18n = useI18n() as { locale?: string | { value?: string }; t: (key: string, params?: Record<string, unknown>) => string }
  const locale = computed(() => {
    const rawLocale = i18n.locale
    if (typeof rawLocale === 'string') return rawLocale
    return rawLocale?.value || 'en'
  })
  const t = (key: string, params?: Record<string, unknown>) => i18n.t(key, params)

  // --- Draft (inlined from useQuickNoteDraft) ---
  const draft = useLocalStorage<QuickNoteDraft>(DRAFT_KEY, {
    title: '',
    content: '',
    tags: [],
    stockSymbols: [],
    date: '',
    saveMode: 'create',
    templateKind: 'blank',
    templateData: createEmptyQuickNoteTemplateData(),
    savedAt: '',
  })

  const lastSavedAt = ref('')
  const draftStatus = ref<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  const pendingDraft = ref<Partial<QuickNoteDraft> | null>(null)
  let autosaveGeneration = 0

  const hasDraft = computed(() => {
    if (!draft.value.savedAt) return false
    const savedAt = new Date(draft.value.savedAt).getTime()
    if (!Number.isFinite(savedAt)) return false
    if (Date.now() - savedAt > DRAFT_TTL_MS) return false
    return Boolean(
      draft.value.title?.trim() ||
      draft.value.content?.trim() ||
      draft.value.tags?.length ||
      draft.value.stockSymbols?.length ||
      draft.value.templateKind !== 'blank',
    )
  })

  const saveDraft = useDebounceFn((data: Partial<QuickNoteDraft>, generation: number) => {
    if (generation !== autosaveGeneration) return
    pendingDraft.value = data
    try {
      draft.value = {
        ...draft.value,
        ...data,
        savedAt: new Date().toISOString(),
      }
      lastSavedAt.value = draft.value.savedAt
      draftStatus.value = 'saved'
    } catch {
      draftStatus.value = 'failed'
    }
  }, 1000)

  function retryDraftSave() {
    if (!pendingDraft.value) return
    draftStatus.value = 'saving'
    saveDraft(pendingDraft.value, autosaveGeneration)
  }

  function clearDraft() {
    draft.value = {
      title: '',
      content: '',
      tags: [],
      stockSymbols: [],
      date: '',
      saveMode: 'create',
      templateKind: 'blank',
      templateData: createEmptyQuickNoteTemplateData(),
      savedAt: '',
    }
    lastSavedAt.value = ''
    pendingDraft.value = null
    draftStatus.value = 'idle'
  }

  // --- Reminders (inlined from useQuickNoteReminders) ---
  const reminders = useLocalStorage<QuickNoteReminders>(REMINDER_KEY, {
    reminder1: null,
  })

  function setReminder(key: QuickNoteReminderKey, time: string | null) {
    reminders.value = { ...reminders.value, [key]: time }
  }

  function clearReminder(key: QuickNoteReminderKey) {
    reminders.value = { ...reminders.value, [key]: null }
  }

  function checkReminders() {
    if (!process.client) return
    const now = Date.now()
    const time = reminders.value.reminder1
    if (!time) return
    const target = new Date(time).getTime()
    if (!Number.isFinite(target)) {
      clearReminder('reminder1')
      return
    }
    if (now >= target) {
      showToast('快速筆記提醒：該記錄一下了')
      clearReminder('reminder1')
    }
  }

  function showToast(message: string) {
    if (!process.client) return
    const toast = useToast()
    toast.info(message, 6000)
  }

  // --- Submit (inlined from useQuickNoteSubmit) ---
  async function submitQuickNote(input: {
    title: string
    content: string
    date: string | Date
    saveMode?: QuickNoteSaveMode
    tags?: string[]
    stockSymbols?: string[]
  }) {
    const body = {
      title: input.title,
      content: input.content,
      date: normalizeQuickNoteDate(input.date),
      tags: input.tags ?? [],
      stockSymbols: input.stockSymbols ?? [],
      appendToToday: input.saveMode === 'append',
    }

    return await $fetch<{ id?: SerializedId | { toString: () => string } }>('/api/diaries', {
      method: 'POST',
      body,
    })
  }

  // --- Templates ---
  const { templates } = useQuickNoteTemplates()

  const defaultTemplateKind = options.defaultTemplateKind ?? 'blank'
  const defaultSaveMode = options.defaultSaveMode ?? 'create'

  // --- Core state ---
  const state = reactive<QuickNoteComposerState>({
    date: getTodayDateString(),
    saveMode: defaultSaveMode,
    templateKind: defaultTemplateKind,
    title: '',
    content: '',
    tags: [],
    stockSymbols: [],
    reminders: reminders.value,
    templateData: createEmptyQuickNoteTemplateData(),
    titleTouched: false,
    contentTouched: false,
  })

  const readyForAutosave = ref(false)
  const restoredThisSession = ref(false)
  const nowTick = ref(Date.now())
  const saveModeTouched = ref(false)
  const suppressAutosave = ref(false)
  const existingDiaryForDate = ref(false)
  const checkingExistingDiaryForDate = ref(false)
  let existingDiarySyncGeneration = 0
  let reminderTimer: ReturnType<typeof setInterval> | null = null

  // --- Template draft (inlined from useQuickNoteTemplateDraft) ---
  const appliedTemplateContent = ref('')

  const suggestedDraft = computed(() => generateTemplateDraft({
    templateKind: state.templateKind,
    date: state.date,
    locale: locale.value,
    templateData: state.templateData,
  }))

  const hasTemplateChangesPending = computed(() => {
    if (state.templateKind === 'blank') return false
    if (state.contentTouched && appliedTemplateContent.value !== suggestedDraft.value.content) return true
    return false
  })

  function syncSuggestedDraft(force = false) {
    if (force || !state.titleTouched) state.title = state.templateKind === 'blank' ? '' : suggestedDraft.value.title
    if (force || !state.contentTouched) {
      state.content = suggestedDraft.value.content
      appliedTemplateContent.value = suggestedDraft.value.content
    }
  }

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

  function setAppliedTemplateContent(content: string) {
    appliedTemplateContent.value = content
  }

  // --- Computed outputs ---
  const draftHint = computed(() => {
    if (draftStatus.value === 'saving') return t('quickDiary.draft.saving')
    if (draftStatus.value === 'failed') return t('quickDiary.draft.failed')
    if (draftStatus.value === 'saved' && lastSavedAt.value) return t('quickDiary.draft.saved')
    return ''
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

  // --- Watchers ---
  watch(
    () => [state.templateKind, state.date, locale.value, JSON.stringify(state.templateData)],
    () => syncSuggestedDraft(),
    { immediate: true },
  )

  watch(
    () => [state.title, state.content, state.tags, state.stockSymbols, state.date, state.saveMode, state.templateKind, state.templateData],
    () => {
      if (!readyForAutosave.value || suppressAutosave.value) return
      const hasMeaningfulDraft = Boolean(
        state.title.trim() ||
        state.content.trim() ||
        state.tags.length ||
        state.templateKind !== defaultTemplateKind,
      )
      if (!hasMeaningfulDraft) return
      draftStatus.value = 'saving'
      saveDraft({
        title: state.title,
        content: state.content,
        tags: state.tags,
        stockSymbols: state.stockSymbols,
        date: state.date,
        saveMode: state.saveMode,
        templateKind: state.templateKind,
        templateData: { ...state.templateData },
      }, autosaveGeneration)
    },
    { deep: true },
  )

  // --- Mutations ---
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

  function setStockSymbols(stockSymbols: string[]) {
    state.stockSymbols = [...new Set(stockSymbols.map(symbol => symbol.trim().toUpperCase()).filter(Boolean))].slice(0, 10)
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
    autosaveGeneration += 1
    suppressAutosave.value = true
    state.date = getTodayDateString()
    state.saveMode = defaultSaveMode
    state.templateKind = defaultTemplateKind
    state.tags = []
    state.stockSymbols = []
    Object.assign(state.templateData, createEmptyQuickNoteTemplateData())
    state.titleTouched = false
    state.contentTouched = false
    saveModeTouched.value = false
    syncSuggestedDraft(true)
    void nextTick(() => {
      suppressAutosave.value = false
    })
  }

  async function syncExistingDiaryForDate(date = state.date) {
    if (typeof $fetch !== 'function') return existingDiaryForDate.value

    const generation = ++existingDiarySyncGeneration
    checkingExistingDiaryForDate.value = true
    try {
      const diary = await $fetch('/api/diaries/by-date', {
        query: { date },
      })
      const hasDiary = Boolean(diary)
      if (generation !== existingDiarySyncGeneration || state.date !== date) {
        return existingDiaryForDate.value
      }
      existingDiaryForDate.value = hasDiary
      if (!saveModeTouched.value) {
        state.saveMode = hasDiary ? 'append' : defaultSaveMode
      }
      return hasDiary
    } catch {
      return existingDiaryForDate.value
    } finally {
      if (generation === existingDiarySyncGeneration) {
        checkingExistingDiaryForDate.value = false
      }
    }
  }

  async function save() {
    await syncExistingDiaryForDate(state.date)
    const content = state.content.trim()
    const title = state.title.trim() || deriveQuickNoteTitle(content, suggestedDraft.value.title)

    if (!content) {
      throw new Error('CONTENT_REQUIRED')
    }

    const result = await submitQuickNote({
      title,
      content,
      date: state.date,
      saveMode: state.saveMode,
      tags: state.tags,
      stockSymbols: state.stockSymbols,
    })

    clearDraft()
    clearAllReminders()
    resetState()
    await nextTick()

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
    state.stockSymbols = draft.value.stockSymbols || []
    state.date = draft.value.date || getTodayDateString()
    state.saveMode = draft.value.saveMode || defaultSaveMode
    state.templateKind = draft.value.templateKind || defaultTemplateKind
    Object.assign(state.templateData, cloneQuickNoteTemplateData(draft.value.templateData))
    state.titleTouched = Boolean(state.title)
    state.contentTouched = Boolean(state.content)
    saveModeTouched.value = false
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
    autosaveGeneration += 1
    existingDiarySyncGeneration += 1
    if (reminderTimer) clearInterval(reminderTimer)
    reminderTimer = null
    restoredThisSession.value = false
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
    stockSymbols: toRef(state, 'stockSymbols'),
    date: toRef(state, 'date'),
    templateKind: toRef(state, 'templateKind'),
    templates,
    reminders,
    draftHint,
    draftStatus,
    retryDraftSave,
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
    setStockSymbols,
    setDate,
    setSaveMode,
    appendVoiceTranscript,
    applySnippet,
    applyTemplateChanges,
    regenerateFromTemplate: applyTemplateChanges,
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
