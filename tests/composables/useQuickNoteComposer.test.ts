import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick, ref } from 'vue'

const localeRef = ref('en')
const fetchMock = vi.fn()

// In-memory storage to simulate useLocalStorage behavior
const storageMap = new Map<string, any>()

vi.mock('@vueuse/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vueuse/core')>()
  return {
    ...actual,
    useLocalStorage: (key: string, defaultValue: any) => {
      if (!storageMap.has(key)) {
        storageMap.set(key, ref(defaultValue))
      }
      return storageMap.get(key)!
    },
    useDebounceFn: (fn: Function, ms?: number) => fn,
  }
})

describe('useQuickNoteComposer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    localeRef.value = 'en'
    fetchMock.mockResolvedValue({ id: '11' })
    // Reset in-memory storage
    storageMap.clear()
    vi.stubGlobal('$fetch', fetchMock)
    vi.stubGlobal('useTimezone', () => ({
      getTodayDateString: () => '2026-03-22',
    }))
    vi.stubGlobal('useI18n', () => ({
      locale: localeRef,
      t: (key: string, params?: Record<string, unknown>) => {
        if (!params) return key
        return `${key}:${JSON.stringify(params)}`
      },
    }))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  // --- Template & auto-sync ---

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

  // --- Save (submit flow) ---

  it('saves through $fetch and clears draft state', async () => {
    const { useQuickNoteComposer } = await import('~/composables/useQuickNoteComposer')
    const composer = useQuickNoteComposer()

    composer.setTags(['watch', 'profit'])
    composer.setContent('A blank quicknote body')

    const result = await composer.save()

    expect(fetchMock).toHaveBeenCalledWith('/api/diaries', expect.objectContaining({
      method: 'POST',
      body: expect.objectContaining({
        title: '2026/03/22 Diary',
        content: 'A blank quicknote body',
        tags: ['watch', 'profit'],
        appendToToday: false,
      }),
    }))
    expect(result).toEqual({ id: '11' })
  })

  it('sends appendToToday=true when saveMode is append', async () => {
    const { useQuickNoteComposer } = await import('~/composables/useQuickNoteComposer')
    const composer = useQuickNoteComposer({ defaultSaveMode: 'append' })

    composer.setContent('Append to existing diary')
    composer.setSaveMode('append')

    await composer.save()

    expect(fetchMock).toHaveBeenCalledWith('/api/diaries', expect.objectContaining({
      method: 'POST',
      body: expect.objectContaining({
        appendToToday: true,
      }),
    }))
  })

  it('throws CONTENT_REQUIRED when saving without content', async () => {
    const { useQuickNoteComposer } = await import('~/composables/useQuickNoteComposer')
    const composer = useQuickNoteComposer()
    composer.initialize()
    composer.setTitle('Has title')
    composer.state.content = ''

    await expect(composer.save()).rejects.toThrow('CONTENT_REQUIRED')
    // $fetch may have been called for syncExistingDiaryForDate during initialize,
    // but should NOT have been called to submit a diary
    expect(fetchMock).not.toHaveBeenCalledWith('/api/diaries', expect.anything())
  })

  it('falls back to suggested title when user title is empty', async () => {
    const { useQuickNoteComposer } = await import('~/composables/useQuickNoteComposer')
    const composer = useQuickNoteComposer()
    composer.initialize()

    // User never sets title; suggestedDraft provides it from blank template
    composer.setContent('Just content no title')

    await composer.save()

    // The blank template auto-generates title like "2026/03/22 Diary"
    expect(fetchMock).toHaveBeenCalledWith('/api/diaries', expect.objectContaining({
      method: 'POST',
      body: expect.objectContaining({
        title: expect.stringContaining('Diary'),
        content: 'Just content no title',
      }),
    }))
  })

  it('uses suggested title from template when user has not set a title', async () => {
    const { useQuickNoteComposer } = await import('~/composables/useQuickNoteComposer')
    const composer = useQuickNoteComposer()

    composer.applyTemplateKind('trading')
    composer.updateTemplateData({ tradingType: 'sell', symbols: 'AAPL' })
    composer.setContent('Sold some shares')

    // title should come from suggestedDraft since user never called setTitle
    expect(composer.title.value).toContain('AAPL')
    const expectedTitle = composer.title.value

    await composer.save()

    expect(fetchMock).toHaveBeenCalledWith('/api/diaries', expect.objectContaining({
      method: 'POST',
      body: expect.objectContaining({
        title: expectedTitle,
        content: 'Sold some shares',
      }),
    }))
  })

  // --- Quick reminders ---

  it('sets semantic quick reminder presets using the first empty reminder slot', async () => {
    vi.setSystemTime(new Date('2026-03-22T08:30:00.000Z'))

    const { useQuickNoteComposer } = await import('~/composables/useQuickNoteComposer')
    const composer = useQuickNoteComposer()

    composer.setQuickReminder('nextWeek')

    // Reminder is stored in localStorage via useLocalStorage
    expect(composer.reminders.value.reminder1).toBe('2026-03-29T08:30:00.000Z')
  })

  it('sets a reminder for a specific time via handleReminderSet', async () => {
    const { useQuickNoteComposer } = await import('~/composables/useQuickNoteComposer')
    const composer = useQuickNoteComposer()

    composer.handleReminderSet({ key: 'reminder1', time: '2026-03-22T18:00:00.000Z' })

    expect(composer.reminders.value.reminder1).toBe('2026-03-22T18:00:00.000Z')
  })

  it('clears a specific reminder via handleReminderClear', async () => {
    const { useQuickNoteComposer } = await import('~/composables/useQuickNoteComposer')
    const composer = useQuickNoteComposer()

    composer.handleReminderSet({ key: 'reminder1', time: '2026-03-22T18:00:00.000Z' })
    composer.handleReminderClear({ key: 'reminder1' })

    expect(composer.reminders.value.reminder1).toBeNull()
  })

  it('clears all reminders during save', async () => {
    const { useQuickNoteComposer } = await import('~/composables/useQuickNoteComposer')
    const composer = useQuickNoteComposer()

    composer.handleReminderSet({ key: 'reminder1', time: '2099-01-01T00:00:00.000Z' })
    composer.setContent('Save and clear reminders')
    await composer.save()

    expect(composer.reminders.value.reminder1).toBeNull()
  })

  // --- Locale rebuilds ---

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

  // --- Draft autosave ---

  it('saves draft with current state fields via autosave watcher', async () => {
    const { useQuickNoteComposer } = await import('~/composables/useQuickNoteComposer')
    const composer = useQuickNoteComposer()
    composer.initialize()

    composer.setTitle('Draft title')
    composer.setContent('Draft body')
    composer.setTags(['tag1'])
    await nextTick()

    // Draft should be updated in the storage map (useDebounceFn is mocked to call immediately)
    const draftRef = storageMap.get('quick-note-draft')
    expect(draftRef.value.title).toBe('Draft title')
    expect(draftRef.value.content).toBe('Draft body')
    expect(draftRef.value.tags).toEqual(['tag1'])
  })

  it('does not autosave before initialize is called', async () => {
    const { useQuickNoteComposer } = await import('~/composables/useQuickNoteComposer')
    const composer = useQuickNoteComposer()

    composer.setTitle('Should not save')
    composer.setContent('Before init')
    await nextTick()

    const draftRef = storageMap.get('quick-note-draft')
    // Draft should not have been modified (no autosave before init)
    expect(draftRef.value.title).toBeFalsy()
  })

  // --- Draft restore ---

  it('restores draft when a valid draft exists and user confirms', async () => {
    // Pre-populate the in-memory draft storage
    storageMap.set('quick-note-draft', ref({
      title: 'Restored title',
      content: 'Restored content',
      tags: ['restored'],
      date: '2026-03-20',
      saveMode: 'append',
      templateKind: 'blank',
      templateData: {},
      savedAt: new Date().toISOString(),
    }))

    const { useQuickNoteComposer } = await import('~/composables/useQuickNoteComposer')
    const composer = useQuickNoteComposer()

    const restored = composer.initialize(() => true)

    expect(restored).toBe(true)
    expect(composer.title.value).toBe('Restored title')
    expect(composer.content.value).toBe('Restored content')
    expect(composer.tags.value).toEqual(['restored'])
  })

  it('declines draft restore and clears the draft', async () => {
    storageMap.set('quick-note-draft', ref({
      title: 'Old draft',
      content: 'Old body',
      tags: [],
      date: '2026-03-20',
      saveMode: 'create',
      templateKind: 'blank',
      templateData: {},
      savedAt: new Date().toISOString(),
    }))

    const { useQuickNoteComposer } = await import('~/composables/useQuickNoteComposer')
    const composer = useQuickNoteComposer()

    const restored = composer.initialize(() => false)

    expect(restored).toBe(false)
    // After declining, clearDraft resets the draft ref
    const draftRef = storageMap.get('quick-note-draft')
    expect(draftRef.value.title).toBe('')
    // After declining restore, syncSuggestedDraft populates from blank template
    expect(composer.title.value).toContain('2026')
  })

  // --- Draft persistence ---

  it('persists and restores explicit save mode choices', async () => {
    const { useQuickNoteComposer } = await import('~/composables/useQuickNoteComposer')
    const composer = useQuickNoteComposer({ defaultSaveMode: 'append' })

    composer.initialize()
    composer.setSaveMode('create')
    composer.setContent('Need a standalone entry')
    await nextTick()

    const draftRef = storageMap.get('quick-note-draft')
    expect(draftRef.value.saveMode).toBe('create')
  })

  // --- Existing diary sync ---

  it('auto-switches to append when the selected date already has a diary', async () => {
    fetchMock.mockResolvedValue({ id: 'today-diary' })
    const { useQuickNoteComposer } = await import('~/composables/useQuickNoteComposer')
    const composer = useQuickNoteComposer()

    const hasDiary = await composer.syncExistingDiaryForDate()

    expect(hasDiary).toBe(true)
    expect(composer.saveMode.value).toBe('append')
  })

  // --- Template draft generation ---

  it('resets template data when switching back to blank template', async () => {
    const { useQuickNoteComposer } = await import('~/composables/useQuickNoteComposer')
    const composer = useQuickNoteComposer()

    composer.applyTemplateKind('trading')
    composer.updateTemplateData({ tradingType: 'buy', symbols: 'NVDA' })
    expect(composer.state.templateData.tradingType).toBe('buy')

    composer.applyTemplateKind('blank')
    expect(composer.state.templateData.tradingType).toBe('')
    expect(composer.state.templateData.symbols).toBe('')
  })

  it('normalizes symbol input: trims, uppercases, joins with comma', async () => {
    const { useQuickNoteComposer } = await import('~/composables/useQuickNoteComposer')
    const composer = useQuickNoteComposer()

    composer.applyTemplateKind('trading')
    composer.updateTemplateData({ symbols: ' aapl ,  msft ,goog ' })

    expect(composer.state.templateData.symbols).toBe('AAPL, MSFT, GOOG')
  })

  it('shows hasTemplateChangesPending when content was manually edited and differs from template', async () => {
    const { useQuickNoteComposer } = await import('~/composables/useQuickNoteComposer')
    const composer = useQuickNoteComposer()

    composer.applyTemplateKind('trading')
    composer.updateTemplateData({ tradingType: 'buy', symbols: 'TSLA' })

    expect(composer.hasTemplateChangesPending.value).toBe(false)

    composer.setContent('My custom content here')
    composer.updateTemplateData({ symbols: 'NVDA' })

    expect(composer.hasTemplateChangesPending.value).toBe(true)

    composer.applyTemplateChanges()

    expect(composer.hasTemplateChangesPending.value).toBe(false)
  })

  // --- State reset ---

  it('resets all state to defaults via resetState', async () => {
    const { useQuickNoteComposer } = await import('~/composables/useQuickNoteComposer')
    const composer = useQuickNoteComposer()

    composer.setTitle('Some title')
    composer.setContent('Some content')
    composer.setTags(['tag1', 'tag2'])
    composer.setSaveMode('append')
    composer.applyTemplateKind('trading')

    expect(composer.title.value).toBe('Some title')
    expect(composer.tags.value).toEqual(['tag1', 'tag2'])

    composer.resetState()

    // After resetState, syncSuggestedDraft(true) repopulates title/content from blank template
    // So tags and templateKind reset cleanly; title/content come from suggestedDraft
    expect(composer.content.value).toBe('')
    expect(composer.tags.value).toEqual([])
    expect(composer.saveMode.value).toBe('create')
    expect(composer.state.templateKind).toBe('blank')
  })

  // --- Voice transcript and snippet ---

  it('appends voice transcript to existing content with a space', async () => {
    const { useQuickNoteComposer } = await import('~/composables/useQuickNoteComposer')
    const composer = useQuickNoteComposer()

    composer.setContent('Existing note')
    composer.appendVoiceTranscript('voice said this')

    expect(composer.content.value).toBe('Existing note voice said this')
  })

  it('applies snippet replacing empty content', async () => {
    const { useQuickNoteComposer } = await import('~/composables/useQuickNoteComposer')
    const composer = useQuickNoteComposer()

    composer.applySnippet('Snippet template content')

    expect(composer.content.value).toBe('Snippet template content')
  })

  it('applies snippet appending to existing content', async () => {
    const { useQuickNoteComposer } = await import('~/composables/useQuickNoteComposer')
    const composer = useQuickNoteComposer()

    composer.setContent('Original')
    composer.applySnippet('Added snippet', false)

    expect(composer.content.value).toBe('Original\n\nAdded snippet')
  })

  it('applies snippet replacing existing content when replace=true', async () => {
    const { useQuickNoteComposer } = await import('~/composables/useQuickNoteComposer')
    const composer = useQuickNoteComposer()

    composer.setContent('Original')
    composer.applySnippet('Replacement', true)

    expect(composer.content.value).toBe('Replacement')
  })

  // --- Date change triggers sync ---

  it('resets saveModeTouched and syncs existing diary when date changes', async () => {
    fetchMock.mockResolvedValue(null)
    const { useQuickNoteComposer } = await import('~/composables/useQuickNoteComposer')
    const composer = useQuickNoteComposer()

    composer.initialize()
    composer.setSaveMode('create')
    composer.setDate('2026-03-25')

    expect(composer.date.value).toBe('2026-03-25')
  })
})
