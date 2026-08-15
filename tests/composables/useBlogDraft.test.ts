import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const storageMap = new Map<string, ReturnType<typeof ref>>()

vi.mock('@vueuse/core', () => ({
  useLocalStorage: (key: string, defaultValue: unknown) => {
    if (!storageMap.has(key)) storageMap.set(key, ref(defaultValue))
    return storageMap.get(key)
  },
  useDebounceFn: (fn: (...args: any[]) => unknown, delay: number) => {
    let timer: ReturnType<typeof setTimeout> | undefined
    return (...args: any[]) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => fn(...args), delay)
    }
  },
}))

const form = {
  title: 'Draft title',
  content: 'Draft content',
  excerpt: '',
  coverImage: '',
  category: 'strategy',
  tags: 'tag',
  status: 'DRAFT',
}

describe('useBlogDraft', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-15T12:00:00.000Z'))
    storageMap.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('persists the latest form after autosave is enabled and debounce expires', async () => {
    const { useBlogDraft } = await import('~/composables/useBlogDraft')
    const draft = useBlogDraft('blog-draft:test')

    expect(draft.persistDraftNow(form)).toBe(false)
    draft.enableAutosave()
    draft.persistDraft(form)

    vi.advanceTimersByTime(4999)
    expect(draft.draft.value.savedAt).toBe('')

    vi.advanceTimersByTime(1)
    expect(draft.draft.value).toEqual({
      ...form,
      savedAt: '2026-08-15T12:00:05.000Z',
    })
  })

  it('restores a draft when confirmed and clears it when declined', async () => {
    const { useBlogDraft } = await import('~/composables/useBlogDraft')
    const draft = useBlogDraft('blog-draft:test')
    draft.enableAutosave()
    draft.persistDraftNow(form)

    expect(draft.hasDraft.value).toBe(true)
    expect(draft.restoreDraft(true)).toMatchObject(form)

    expect(draft.restoreDraft(false)).toBeNull()
    expect(draft.hasDraft.value).toBe(false)
    expect(draft.draft.value).toEqual({
      title: '',
      content: '',
      excerpt: '',
      coverImage: '',
      category: '',
      tags: '',
      status: 'DRAFT',
      savedAt: '',
    })
  })

  it('clears the draft explicitly and invalidates pending autosave', async () => {
    const { useBlogDraft } = await import('~/composables/useBlogDraft')
    const draft = useBlogDraft('blog-draft:test')
    draft.enableAutosave()
    draft.persistDraft(form)
    draft.clearDraft()
    vi.advanceTimersByTime(5000)

    expect(draft.draft.value).toEqual({
      title: '',
      content: '',
      excerpt: '',
      coverImage: '',
      category: '',
      tags: '',
      status: 'DRAFT',
      savedAt: '',
    })
  })
})
