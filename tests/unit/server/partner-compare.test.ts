import { beforeEach, describe, expect, it, vi } from 'vitest'
import { aDiary, type DiaryFixture } from '../../fixtures/builders'

// ─── 測試用型別 ─────────────────────────────────────────────────────────────────

type TestDiary = DiaryFixture

interface CompareDay {
  dateKey: string
  ownerDiary: (Omit<TestDiary, 'transactions' | 'alerts'> & { tags: string[] }) | null
  partnerDiary: (Omit<TestDiary, 'transactions' | 'alerts'> & { tags: string[] }) | null
}

// ─── Mock formatYmdInTimezone ─────────────────────────────────────────────────

const mockFormatYmd = vi.fn()

vi.mock('~/lib/dates/format', () => ({
  formatYmdInTimezone: (...args: any[]) => mockFormatYmd(...args),
}))

// ─── 工廠函數 ─────────────────────────────────────────────────────────────────

function makeDiary(overrides: Partial<TestDiary> & { date: Date }): TestDiary {
  return aDiary(overrides)
}

// ─── 測試 ─────────────────────────────────────────────────────────────────────

describe('server/utils/partner-compare — buildCompareDays', () => {
  let buildCompareDays: (
    ownerDiaries: TestDiary[],
    partnerDiaries: TestDiary[],
    timeZone: string,
    limit: number,
  ) => CompareDay[]

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    mockFormatYmd.mockReset()

    const mod = await import('~/server/utils/partner-compare')
    buildCompareDays = mod.buildCompareDays
  })

  // 1. Happy path — owner + partner same day
  it('produces 1 CompareDay when both have diary on same date', () => {
    const ownerDiary = makeDiary({ id: 1n, date: new Date('2026-04-09T12:00:00.000Z') })
    const partnerDiary = makeDiary({ id: 2n, userId: 7n, date: new Date('2026-04-09T12:00:00.000Z') })

    mockFormatYmd.mockReturnValue('2026-04-09')

    const result = buildCompareDays([ownerDiary], [partnerDiary], 'Asia/Taipei', 20)

    expect(result).toHaveLength(1)
    expect(result[0].dateKey).toBe('2026-04-09')
    expect(result[0].ownerDiary).not.toBeNull()
    expect(result[0].partnerDiary).not.toBeNull()
    expect(result[0].ownerDiary!.id).toBe(1n)
    expect(result[0].partnerDiary!.id).toBe(2n)
  })

  // 2. Owner-only day
  it('returns ownerDiary and null partnerDiary for owner-only day', () => {
    const ownerDiary = makeDiary({ id: 1n, date: new Date('2026-04-09T12:00:00.000Z') })

    mockFormatYmd.mockReturnValue('2026-04-09')

    const result = buildCompareDays([ownerDiary], [], 'Asia/Taipei', 20)

    expect(result).toHaveLength(1)
    expect(result[0].ownerDiary).not.toBeNull()
    expect(result[0].partnerDiary).toBeNull()
  })

  // 3. Partner-only day
  it('returns partnerDiary and null ownerDiary for partner-only day', () => {
    const partnerDiary = makeDiary({ id: 2n, userId: 7n, date: new Date('2026-04-09T12:00:00.000Z') })

    mockFormatYmd.mockReturnValue('2026-04-09')

    const result = buildCompareDays([], [partnerDiary], 'Asia/Taipei', 20)

    expect(result).toHaveLength(1)
    expect(result[0].ownerDiary).toBeNull()
    expect(result[0].partnerDiary).not.toBeNull()
    expect(result[0].partnerDiary!.id).toBe(2n)
  })

  // 4. Multiple days sorted descending
  it('sorts compareDays descending by dateKey', () => {
    const d8 = makeDiary({ id: 1n, date: new Date('2026-04-08T12:00:00.000Z') })
    const d9 = makeDiary({ id: 2n, userId: 7n, date: new Date('2026-04-09T12:00:00.000Z') })
    const d10 = makeDiary({ id: 3n, date: new Date('2026-04-10T12:00:00.000Z') })

    mockFormatYmd.mockImplementation((date: Date) => {
      const iso = date.toISOString().slice(0, 10)
      if (iso === '2026-04-08') return '2026-04-08'
      if (iso === '2026-04-09') return '2026-04-09'
      if (iso === '2026-04-10') return '2026-04-10'
      return iso
    })

    const result = buildCompareDays([d8, d10], [d9], 'Asia/Taipei', 20)

    expect(result).toHaveLength(3)
    expect(result[0].dateKey).toBe('2026-04-10')
    expect(result[1].dateKey).toBe('2026-04-09')
    expect(result[2].dateKey).toBe('2026-04-08')
  })

  // 5. Limit enforced
  it('slices result to the given limit', () => {
    const diaries = Array.from({ length: 5 }, (_, i) =>
      makeDiary({ id: BigInt(i + 1), date: new Date(`2026-04-${String(i + 7).padStart(2, '0')}T12:00:00.000Z`) }),
    )

    mockFormatYmd.mockImplementation((date: Date) => {
      const d = date.toISOString().slice(0, 10)
      return d
    })

    const result = buildCompareDays(diaries, [], 'Asia/Taipei', 2)

    expect(result).toHaveLength(2)
  })

  // 6. Empty both
  it('returns empty array when both owner and partner diaries are empty', () => {
    const result = buildCompareDays([], [], 'Asia/Taipei', 20)

    expect(result).toEqual([])
  })

  // 7. Timezone — formatYmdInTimezone is called with correct arguments
  it('calls formatYmdInTimezone with each diary date and the provided timezone', () => {
    const ownerDiary = makeDiary({ id: 1n, date: new Date('2026-04-09T12:00:00.000Z') })
    const partnerDiary = makeDiary({ id: 2n, userId: 7n, date: new Date('2026-04-10T12:00:00.000Z') })

    mockFormatYmd.mockReturnValue('2026-04-09')

    buildCompareDays([ownerDiary], [partnerDiary], 'America/New_York', 20)

    expect(mockFormatYmd).toHaveBeenCalledWith(ownerDiary.date, 'America/New_York')
    expect(mockFormatYmd).toHaveBeenCalledWith(partnerDiary.date, 'America/New_York')
  })

  // 8. Transactions and alerts stripped
  it('strips transactions and alerts from diary output', () => {
    const ownerDiary = makeDiary({
      id: 1n,
      date: new Date('2026-04-09T12:00:00.000Z'),
      transactions: [{ symbol: 'AAPL', type: 'BUY' }],
      alerts: [{ message: 'Reminder' }],
    })

    mockFormatYmd.mockReturnValue('2026-04-09')

    const result = buildCompareDays([ownerDiary], [], 'Asia/Taipei', 20)

    expect(result).toHaveLength(1)
    expect(result[0].ownerDiary).not.toBeNull()
    expect(result[0].ownerDiary!.transactions).toBeUndefined()
    expect(result[0].ownerDiary!.alerts).toBeUndefined()
  })

  // 9. Tags attached from tagsString
  it('parses tagsString into tags array', () => {
    const ownerDiary = makeDiary({
      id: 1n,
      date: new Date('2026-04-09T12:00:00.000Z'),
      tagsString: 'watch,learning',
    })

    mockFormatYmd.mockReturnValue('2026-04-09')

    const result = buildCompareDays([ownerDiary], [], 'Asia/Taipei', 20)

    expect(result[0].ownerDiary!.tags).toEqual(['watch', 'learning'])
  })
})
