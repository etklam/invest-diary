import { describe, expect, it } from 'vitest'
import { reconciliationSection, type DiaryRow } from '../../../scripts/diary-reconcile-duplicates'

function aDiary(overrides: Partial<DiaryRow> = {}): DiaryRow {
  return {
    id: 2n,
    userId: 1n,
    title: 'Merged title',
    content: 'Merged body',
    tagsString: 'review',
    date: new Date('2026-08-20T12:00:00.000Z'),
    createdAt: new Date('2026-08-20T13:00:00.000Z'),
    thesis: 'Original thesis',
    risk: 'Original risk',
    execution: 'Original execution',
    reviewDueAt: new Date('2026-09-01T12:00:00.000Z'),
    reviewStatus: 'reviewed',
    reviewedAt: new Date('2026-08-25T12:00:00.000Z'),
    reviewOutcome: 'PARTIAL',
    reviewSummary: 'Summary from merged diary',
    reviewLearning: 'Learning from merged diary',
    reviewAdjustment: 'Adjustment from merged diary',
    ...overrides,
  }
}

describe('diary duplicate reconciliation content', () => {
  it('preserves every current structured review field in the auditable section', () => {
    const section = reconciliationSection(aDiary())

    expect(section).toContain('Original reviewOutcome: PARTIAL')
    expect(section).toContain('Original reviewSummary: Summary from merged diary')
    expect(section).toContain('Original reviewLearning: Learning from merged diary')
    expect(section).toContain('Original reviewAdjustment: Adjustment from merged diary')
    expect(section).toContain('Merged body')
  })

  it('remains valid on a legacy schema where later review fields are unavailable', () => {
    const section = reconciliationSection(aDiary({
      reviewOutcome: undefined,
      reviewSummary: undefined,
      reviewLearning: undefined,
      reviewAdjustment: undefined,
    }))

    expect(section).toContain('Original reviewOutcome: ')
    expect(section).toContain('Original reviewSummary: ')
  })
})
