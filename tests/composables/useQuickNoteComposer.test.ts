import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick, ref } from 'vue'

const saveDraftMock = vi.fn()
const clearDraftMock = vi.fn()
const submitQuickNoteMock = vi.fn()
const setReminderMock = vi.fn()
const clearReminderMock = vi.fn()
const checkRemindersMock = vi.fn()
const localeRef = ref('en')

vi.mock('~/composables/useQuickNoteDraft', () => ({
  useQuickNoteDraft: () => ({
    draft: ref({
      title: '',
      content: '',
      tags: [],
      date: '',
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
    localeRef.value = 'en'
    submitQuickNoteMock.mockResolvedValue({ id: '11' })
    vi.stubGlobal('useTimezone', () => ({
      getTodayDateString: () => '2026-03-22',
    }))
    vi.stubGlobal('useI18n', () => ({
      locale: localeRef,
    }))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('auto-syncs generated title and content until the user edits manually', async () => {
    const { useQuickNoteComposer } = await import('~/composables/useQuickNoteComposer')
    const composer = useQuickNoteComposer()

    composer.applyTemplateKind('trading')
    composer.updateTemplateData({ tradingType: 'buy', symbols: 'TSLA' })

    expect(composer.title.value).toContain('TSLA')
    expect(composer.content.value).toContain('Today\'s Operation')

    composer.setTitle('Manual title')
    composer.setContent('My own note')
    composer.updateTemplateData({ symbols: 'NVDA' })

    expect(composer.title.value).toBe('Manual title')
    expect(composer.content.value).toBe('My own note')
    expect(composer.hasTemplateChangesPending.value).toBe(true)

    composer.applyTemplateChanges()

    expect(composer.title.value).toBe('Manual title')
    expect(composer.content.value).toContain('My own note')
    expect(composer.content.value).toContain('NVDA')
    expect(composer.hasTemplateChangesPending.value).toBe(false)
  })

  it('replaces only the previously applied template block instead of duplicating it', async () => {
    const { useQuickNoteComposer } = await import('~/composables/useQuickNoteComposer')
    const composer = useQuickNoteComposer()

    composer.applyTemplateKind('trading')
    composer.updateTemplateData({ tradingType: 'buy', symbols: 'TSLA' })
    composer.setContent('Desk note\n\n## Today\'s Operation\n\n- Operation: Buy\n- Symbols: TSLA')
    composer.updateTemplateData({ symbols: 'NVDA' })

    composer.applyTemplateChanges()

    expect(composer.content.value).toContain('Desk note')
    expect(composer.content.value).toContain('NVDA')
    expect(composer.content.value).not.toContain('TSLA')
    expect(composer.content.value.match(/## Today's Operation/g)).toHaveLength(1)
  })

  it('saves through the shared quicknote submit contract and clears draft state', async () => {
    const { useQuickNoteComposer } = await import('~/composables/useQuickNoteComposer')
    const composer = useQuickNoteComposer()

    composer.setTags(['watch', 'profit'])
    composer.setContent('A blank quicknote body')

    const result = await composer.save()

    expect(submitQuickNoteMock).toHaveBeenCalledWith({
      title: '2026/03/22 Diary',
      content: 'A blank quicknote body',
      date: '2026-03-22',
      tags: ['watch', 'profit'],
    })
    expect(clearDraftMock).toHaveBeenCalled()
    expect(result).toEqual({ id: '11' })
  })

  it('sets semantic quick reminder presets using the first empty reminder slot', async () => {
    vi.setSystemTime(new Date('2026-03-22T08:30:00.000Z'))

    const { useQuickNoteComposer } = await import('~/composables/useQuickNoteComposer')
    const composer = useQuickNoteComposer()

    composer.setQuickReminder('nextWeek')

    expect(setReminderMock).toHaveBeenCalledWith('reminder1', '2026-03-29T08:30:00.000Z')
  })

  it('rebuilds structured template copy when the locale changes', async () => {
    const { useQuickNoteComposer } = await import('~/composables/useQuickNoteComposer')
    const composer = useQuickNoteComposer()

    composer.applyTemplateKind('reflection')
    composer.updateTemplateData({ marketCondition: 'gapUpAndGo', rating: 3 })

    expect(composer.content.value).toContain('Gap up and go')

    composer.applyTemplateKind('observation')
    composer.updateTemplateData({ observationType: 'sectorMomentum' })

    expect(composer.content.value).toContain('Sector momentum')

    localeRef.value = 'zh-TW'
    await nextTick()

    expect(composer.content.value).toContain('板塊熱點')
  })
})
