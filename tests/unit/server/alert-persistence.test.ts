import { describe, expect, it, vi } from 'vitest'
import { persistAlert } from '~/server/utils/alert-persistence'

describe('persistAlert', () => {
  it('links a recurring series using only rows created for that series', async () => {
    const create = vi.fn().mockResolvedValue({
      id: 101n,
      diaryId: 12n,
      message: 'Review trades',
      triggerAt: new Date('2026-06-03T09:30:00Z'),
    })
    const createMany = vi.fn().mockResolvedValue({ count: 2 })
    const update = vi.fn().mockResolvedValue({ count: 1 })
    const tx = {
      alert: {
        create,
        createMany,
        update,
        findMany: vi.fn(),
      },
    } as any

    const result = await persistAlert(tx, 12n, {
      message: 'Review trades',
      trigger_at: '2026-06-03T09:30:00Z',
      recurring_mode: 'WEEK',
    })

    expect(result.id).toBe(101n)
    expect(update).toHaveBeenCalledWith({
      where: { id: 101n },
      data: { parentId: 101n },
    })
    expect(createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ diaryId: 12n, parentId: 101n, instanceNumber: 2 }),
        expect.objectContaining({ diaryId: 12n, parentId: 101n, instanceNumber: 3 }),
      ]),
    })
    expect(tx.alert.findMany).not.toHaveBeenCalled()
  })
})
