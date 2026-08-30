import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  isAuthenticated: { value: true },
  openQuickDiary: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('~/composables/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: mocks.isAuthenticated, user: { value: null } }),
}))

vi.mock('~/composables/useAppShell', () => ({
  useAppShell: () => ({ openQuickDiary: mocks.openQuickDiary }),
}))

const context = {
  sourceLabel: 'Market Rotation · XLK',
  suggestedInsight: 'Technology leadership continues to strengthen.',
  metadata: {
    sourceType: 'MARKET_ROTATION' as const,
    sourceTitle: 'Market Rotation',
    occurredAt: '2026-08-15T00:00:00.000Z',
    metadataJson: '{"rank":2}',
  },
  symbolPrefill: 'MSFT',
}

describe('useResearchCapture', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.isAuthenticated.value = true
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'capture-id-1') })
    vi.stubGlobal('useI18n', () => ({
      t: (key: string) => key,
      locale: { value: 'zh-TW' },
    }))
    vi.stubGlobal('useToast', () => ({
      success: mocks.toastSuccess,
      error: mocks.toastError,
    }))
    vi.stubGlobal('$fetch', vi.fn())
  })

  it('does not open or perform actions for unauthenticated users', async () => {
    mocks.isAuthenticated.value = false
    const { useResearchCapture } = await import('~/composables/useResearchCapture')
    const capture = useResearchCapture()

    expect(capture.open(context)).toBe(false)
    expect(capture.isOpen.value).toBe(false)
    expect(globalThis.crypto.randomUUID).not.toHaveBeenCalled()
    expect(capture.continueToQuickDiary('Should not open')).toBe(false)
    await expect(capture.saveEvidence('Should not save', 'MSFT')).resolves.toBe(false)
    expect(globalThis.$fetch).not.toHaveBeenCalled()
  })

  it('opens with source context and sends editable content to Quick Diary without saving', async () => {
    const { useResearchCapture } = await import('~/composables/useResearchCapture')
    const capture = useResearchCapture()

    expect(capture.open(context)).toBe(true)
    expect(capture.context.value).toEqual(context)
    expect(capture.continueToQuickDiary('  Edited insight  ', 'msft')).toBe(true)

    expect(mocks.openQuickDiary).toHaveBeenCalledWith({
      source: 'research',
      content: expect.stringContaining('Edited insight'),
      stockSymbols: ['MSFT'],
    })
    expect(mocks.openQuickDiary.mock.calls[0]?.[0].content).toContain('Market Rotation · XLK')
    expect(globalThis.$fetch).not.toHaveBeenCalled()
    expect(capture.isOpen.value).toBe(false)
  })

  it('posts Company Evidence with the structured metadata and idempotency key', async () => {
    const fetchMock = globalThis.$fetch as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue({ id: 'record-1' })
    const { useResearchCapture } = await import('~/composables/useResearchCapture')
    const capture = useResearchCapture()
    capture.open(context)

    await expect(capture.saveEvidence('  Human summary  ', ' msft ')).resolves.toBe(true)

    expect(fetchMock).toHaveBeenCalledWith('/api/stocks/MSFT/evidence', {
      method: 'POST',
      body: {
        summary: 'Human summary',
        sourceType: 'MARKET_ROTATION',
        sourceTitle: 'Market Rotation',
        sourceUrl: undefined,
        occurredAt: '2026-08-15T00:00:00.000Z',
        idempotencyKey: 'capture-id-1',
        metadataJson: '{"rank":2}',
      },
    })
    expect(capture.savedSymbol.value).toBe('MSFT')
    expect(mocks.toastSuccess).toHaveBeenCalledWith('researchCapture.evidenceSaved')
  })

  it('prevents a second evidence request while the first save is pending', async () => {
    let resolveRequest!: () => void
    const fetchMock = globalThis.$fetch as ReturnType<typeof vi.fn>
    fetchMock.mockReturnValue(new Promise<void>((resolve) => { resolveRequest = resolve }))
    const { useResearchCapture } = await import('~/composables/useResearchCapture')
    const capture = useResearchCapture()
    capture.open(context)

    const first = capture.saveEvidence('Insight', 'MSFT')
    const second = capture.saveEvidence('Insight', 'MSFT')

    expect(fetchMock).toHaveBeenCalledOnce()
    await expect(second).resolves.toBe(false)
    resolveRequest()
    await expect(first).resolves.toBe(true)
  })

  it('keeps the capture open and reports failure for a rejected evidence request', async () => {
    const fetchMock = globalThis.$fetch as ReturnType<typeof vi.fn>
    fetchMock.mockRejectedValue(new Error('network'))
    const { useResearchCapture } = await import('~/composables/useResearchCapture')
    const capture = useResearchCapture()
    capture.open(context)

    await expect(capture.saveEvidence('Insight that must remain available', 'MSFT')).resolves.toBe(false)

    expect(capture.isOpen.value).toBe(true)
    expect(capture.saveError.value).toBe('researchCapture.saveFailed')
    expect(capture.savedSymbol.value).toBeNull()
    expect(mocks.toastError).toHaveBeenCalledWith('researchCapture.saveFailed')
  })
})
