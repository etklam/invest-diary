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

  it('always submits quick notes with append-if-exists behavior for the selected date', async () => {
    const { useQuickNoteSubmit } = await import('~/composables/useQuickNoteSubmit')
    const { submitQuickNote } = useQuickNoteSubmit()

    await submitQuickNote({
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
        appendToToday: true,
      },
    })
  })
})
