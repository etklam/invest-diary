import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const fetchMock = vi.fn()

describe('useQuickNoteSubmit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('$fetch', fetchMock)
    fetchMock.mockResolvedValue({ id: '1' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('maps create mode to the normal diary create payload', async () => {
    const { useQuickNoteSubmit } = await import('~/composables/useQuickNoteSubmit')
    const { submitQuickNote } = useQuickNoteSubmit()

    await submitQuickNote({
      saveMode: 'create',
      title: '2026/03/22 Diary',
      content: 'A short note',
      date: '2026-03-22',
      tags: ['watch', 'profit'],
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/diaries', {
      method: 'POST',
      body: {
        title: '2026/03/22 Diary',
        content: 'A short note',
        date: '2026-03-22T12:00:00.000Z',
        tags: ['watch', 'profit'],
      },
    })
  })

  it('maps append mode to appendToToday without changing the diary payload shape', async () => {
    const { useQuickNoteSubmit } = await import('~/composables/useQuickNoteSubmit')
    const { submitQuickNote } = useQuickNoteSubmit()

    await submitQuickNote({
      saveMode: 'append',
      title: 'Generated title',
      content: 'Generated content',
      date: '2026-03-23',
      tags: [],
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/diaries', {
      method: 'POST',
      body: {
        title: 'Generated title',
        content: 'Generated content',
        date: '2026-03-23T12:00:00.000Z',
        tags: [],
        appendToToday: true,
      },
    })
  })
})
