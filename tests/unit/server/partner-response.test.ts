import { describe, expect, it } from 'vitest'
import { serializeDiaryForPartnerView } from '~/server/utils/partner-response'

describe('partner diary privacy', () => {
  it('serializes through an allowlist and never leaks structured review content', () => {
    const result = serializeDiaryForPartnerView({
      id: 1n,
      userId: 2n,
      title: 'Shared diary',
      content: 'Visible content',
      tagsString: 'watch',
      createdVia: 'WEB',
      createdByLabel: null,
      date: new Date('2026-08-09T12:00:00.000Z'),
      createdAt: new Date('2026-08-09T12:00:00.000Z'),
      updatedAt: new Date('2026-08-09T12:00:00.000Z'),
      thesis: 'Private thesis',
      reviewOutcome: 'INVALIDATED',
      reviewSummary: 'Private review',
      transactions: [{ id: 3n }],
    })

    expect(result).toMatchObject({ title: 'Shared diary', tags: ['watch'] })
    expect(result).not.toHaveProperty('thesis')
    expect(result).not.toHaveProperty('reviewOutcome')
    expect(result).not.toHaveProperty('reviewSummary')
    expect(result).not.toHaveProperty('transactions')
  })
})
