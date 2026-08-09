import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

describe('useAppShell', () => {
  const state = new Map<string, ReturnType<typeof ref>>()

  beforeEach(() => {
    state.clear()
    vi.stubGlobal('useState', (key: string, init: () => unknown) => {
      if (!state.has(key)) state.set(key, ref(init()))
      return state.get(key)
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('opens and closes the shared Quick Diary with context intact', async () => {
    const { useAppShell } = await import('~/composables/useAppShell')
    const shell = useAppShell()

    shell.openQuickDiary({ source: 'calendar', date: '2026-08-05' })

    expect(shell.showQuickDiary.value).toBe(true)
    expect(shell.quickDiaryContext.value).toEqual({ source: 'calendar', date: '2026-08-05' })

    shell.closeQuickDiary()

    expect(shell.showQuickDiary.value).toBe(false)
    expect(shell.quickDiaryContext.value).toBeNull()
  })

  it('shares navigation state across callers', async () => {
    const { useAppShell } = await import('~/composables/useAppShell')
    const opener = useAppShell()
    const drawer = useAppShell()

    opener.openMobileNavigation()
    expect(drawer.showMobileNavigation.value).toBe(true)

    drawer.closeMobileNavigation()
    expect(opener.showMobileNavigation.value).toBe(false)
  })
})
