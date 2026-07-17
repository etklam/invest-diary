import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'

describe('useDiaryMutation', () => {
  const stateStore = new Map<string, any>()

  beforeEach(() => {
    stateStore.clear()
    vi.stubGlobal('useState', (key: string, init: () => any) => {
      if (!stateStore.has(key)) {
        stateStore.set(key, ref(init()))
      }
      return stateStore.get(key)
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('notifies listeners when a diary is created or appended', async () => {
    const { useDiaryMutation } = await import('~/composables/useDiaryMutation')
    const bus = useDiaryMutation()
    const received: Array<{ id: string; date: string; mode: string }> = []

    bus.onDiaryMutation((payload) => {
      received.push(payload)
    })

    bus.notifyDiaryCreated({ id: '99', date: '2026-07-17', mode: 'create' })
    await nextTick()

    expect(received).toEqual([
      { id: '99', date: '2026-07-17', mode: 'create' },
    ])
    expect(bus.lastMutation.value?.mode).toBe('create')
    expect(bus.version.value).toBe(1)

    bus.notifyDiaryCreated({ id: '99', date: '2026-07-17', mode: 'append' })
    await nextTick()

    expect(received).toHaveLength(2)
    expect(received[1]?.mode).toBe('append')
    expect(bus.version.value).toBe(2)
  })
})
