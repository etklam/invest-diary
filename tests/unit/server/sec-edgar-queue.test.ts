import { describe, expect, it } from 'vitest'
import { SecRequestQueue } from '~/server/utils/sec-edgar/queue'

describe('SEC request queue', () => {
  it('limits concurrency and spaces request starts', async () => {
    let now = 0
    let active = 0
    let maxActive = 0
    const starts: number[] = []
    const sleeps: number[] = []
    const queue = new SecRequestQueue({ concurrency: 2, minIntervalMs: 125, now: () => now, sleep: async ms => { sleeps.push(ms); now += ms } })
    let release!: () => void
    const blocker = new Promise<void>(resolve => { release = resolve })
    const operations = [0, 1, 2].map(index => queue.run(async () => {
      starts.push(now)
      active++
      maxActive = Math.max(maxActive, active)
      if (index < 2) await blocker
      active--
    }))
    await Promise.resolve()
    await Promise.resolve()
    release()
    await Promise.all(operations)
    expect(maxActive).toBeLessThanOrEqual(2)
    expect(starts).toHaveLength(3)
    expect(sleeps).toEqual([125, 125])
  })
})
