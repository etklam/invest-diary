import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, readonly } from 'vue'

vi.unmock('~/composables/useToast')

const createUseState = () => {
  const store = new Map<string, ReturnType<typeof ref>>()
  return (key: string, init: () => any) => {
    if (!store.has(key)) {
      store.set(key, ref(init()))
    }
    return store.get(key)!
  }
}

describe('useToast composable', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetModules()
    vi.stubGlobal('useState', createUseState())
    vi.stubGlobal('readonly', readonly)
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('adds and removes toast entries', async () => {
    const { useToast } = await import('~/composables/useToast')

    const { toasts, addToast, removeToast } = useToast()
    const id = addToast('Hello', 'success', 0)

    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0].id).toBe(id)

    removeToast(id)
    expect(toasts.value).toHaveLength(0)
  })

  it('auto-removes toast after duration', async () => {
    const { useToast } = await import('~/composables/useToast')

    const { toasts, addToast } = useToast()
    addToast('Auto', 'info', 1000)

    expect(toasts.value).toHaveLength(1)

    vi.advanceTimersByTime(1000)
    expect(toasts.value).toHaveLength(0)
  })

  it('does not auto-remove when duration is 0', async () => {
    const { useToast } = await import('~/composables/useToast')

    const { toasts, addToast } = useToast()
    addToast('Persistent', 'warning', 0)

    vi.advanceTimersByTime(5000)
    expect(toasts.value).toHaveLength(1)
  })
})
