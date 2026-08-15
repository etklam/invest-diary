import { describe, expect, it } from 'vitest'
import { aDiary, aPost, aStockNote, aTransaction, aUser, anAlert } from './builders'

describe('domain fixture builders', () => {
  it('builds complete current rows while callers provide only overrides', () => {
    const user = aUser({ id: 7n })
    const diary = aDiary({ userId: user.id, reviewOutcome: 'PARTIAL' })
    const transaction = aTransaction({ diaryId: diary.id })
    const alert = anAlert({ diaryId: diary.id })
    const stockNote = aStockNote({ userId: user.id })
    const post = aPost({ authorId: user.id })

    expect(user).toMatchObject({ id: 7n, expectedMonthlyTrades: 20, timezone: 'Asia/Taipei' })
    expect(diary).toMatchObject({
      userId: 7n,
      reviewOutcome: 'PARTIAL',
      reviewSummary: null,
      reviewLearning: null,
      reviewAdjustment: null,
    })
    expect(diary.date).toBeInstanceOf(Date)
    expect(transaction).toMatchObject({ diaryId: diary.id, userId: 1n, quantity: 1, price: 100 })
    expect(alert).toMatchObject({ diaryId: diary.id, isDismissed: false, instanceNumber: 1 })
    expect(stockNote).toMatchObject({ userId: 7n, createdVia: 'USER' })
    expect(post).toMatchObject({ authorId: 7n, status: 'DRAFT' })
    expect(post.createdAt).toBeInstanceOf(Date)
  })
})
