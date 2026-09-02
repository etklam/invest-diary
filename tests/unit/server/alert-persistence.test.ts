import { describe, expect, it, vi } from 'vitest'
import { persistAlert, persistAlerts } from '~/server/utils/alert-persistence'

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
      triggerAt: '2026-06-03T09:30:00Z',
      recurringMode: 'WEEK',
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

describe('persistAlerts', () => {
  it('rejects more than 50 alerts with a validation error before any write', async () => {
    const create = vi.fn()
    const tx = { alert: { create } } as any
    const alerts = Array.from({ length: 51 }, () => ({ message: 'Review' }))

    await expect(persistAlerts(tx, 12n, alerts as any, 'Asia/Taipei')).rejects.toMatchObject({
      code: 'SYS_VALIDATION_ERROR',
      statusCode: 400,
      details: [{ field: 'alerts', message: expect.stringContaining('50') }],
    })
    expect(create).not.toHaveBeenCalled()
  })

  it('persists within the cap', async () => {
    const create = vi.fn().mockResolvedValue({ id: 1n })
    const tx = { alert: { create } } as any
    const alerts = [
      { message: 'First', triggerAt: '2026-06-01T09:30:00Z' },
      { message: 'Second', triggerAt: '2026-06-02T09:30:00Z' },
    ]

    const persisted = await persistAlerts(tx, 12n, alerts as any, 'Asia/Taipei')

    expect(persisted).toHaveLength(2)
    expect(create).toHaveBeenCalledTimes(2)
  })
})
