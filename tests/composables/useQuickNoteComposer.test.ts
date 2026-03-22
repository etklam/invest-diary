import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'

const saveDraftMock = vi.fn()
const clearDraftMock = vi.fn()
const submitQuickNoteMock = vi.fn()
const setReminderMock = vi.fn()
const clearReminderMock = vi.fn()
const checkRemindersMock = vi.fn()

vi.mock('~/composables/useQuickNoteDraft', () => ({
  useQuickNoteDraft: () => ({
    draft: ref({
      title: '',
      content: '',
      tags: [],
      date: '',
      saveMode: 'create',
      templateKind: 'blank',
      templateData: {},
      savedAt: '',
    }),
    hasDraft: ref(false),
    lastSavedAt: ref(''),
    saveDraft: saveDraftMock,
    clearDraft: clearDraftMock,
  }),
}))

vi.mock('~/composables/useQuickNoteTemplates', () => ({
  useQuickNoteTemplates: () => ({
    templates: ref([]),
  }),
}))

vi.mock('~/composables/useQuickNoteReminders', () => ({
  useQuickNoteReminders: () => ({
    reminders: ref({
      reminder1: null,
      reminder2: null,
      reminder3: null,
    }),
    setReminder: setReminderMock,
    clearReminder: clearReminderMock,
    checkReminders: checkRemindersMock,
  }),
}))

vi.mock('~/composables/useQuickNoteSubmit', () => ({
  useQuickNoteSubmit: () => ({
    submitQuickNote: submitQuickNoteMock,
  }),
}))

describe('useQuickNoteComposer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    submitQuickNoteMock.mockResolvedValue({ id: '11' })
    vi.stubGlobal('useTimezone', () => ({
      getTodayDateString: () => '2026-03-22',
    }))
    vi.stubGlobal('useI18n', () => ({
      locale: ref('en'),
    }))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('auto-syncs generated title and content until the user edits manually', async () => {
    const { useQuickNoteComposer } = await import('~/composables/useQuickNoteComposer')
    const composer = useQuickNoteComposer({ defaultSaveMode: 'create' })

    composer.applyTemplateKind('trading')
    composer.updateTemplateData({ tradingType: 'buy', symbols: 'TSLA' })

    expect(composer.title.value).toContain('TSLA')
    expect(composer.content.value).toContain('Today\'s Operation')

    composer.setTitle('Manual title')
    composer.updateTemplateData({ symbols: 'NVDA' })

    expect(composer.title.value).toBe('Manual title')
    expect(composer.hasTemplateChangesPending.value).toBe(true)

    composer.applyTemplateChanges()

    expect(composer.title.value).toContain('NVDA')
    expect(composer.hasTemplateChangesPending.value).toBe(false)
  })

  it('saves through the shared quicknote submit contract and clears draft state', async () => {
    const { useQuickNoteComposer } = await import('~/composables/useQuickNoteComposer')
    const composer = useQuickNoteComposer({ defaultSaveMode: 'create' })

    composer.setTags(['watch', 'profit'])
    composer.setContent('A blank quicknote body')

    const result = await composer.save()

    expect(submitQuickNoteMock).toHaveBeenCalledWith({
      saveMode: 'create',
      title: '2026/03/22 Diary',
      content: 'A blank quicknote body',
      date: '2026-03-22',
      tags: ['watch', 'profit'],
    })
    expect(clearDraftMock).toHaveBeenCalled()
    expect(result).toEqual({ id: '11' })
  })
})
