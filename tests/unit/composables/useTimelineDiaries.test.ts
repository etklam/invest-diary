import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mergeDiariesById, useTimelineDiaries } from '~/composables/useTimelineDiaries'

describe('mergeDiariesById', () => {
  it('appends each diary exactly once across repeated pages', () => {
    const page1 = [{ id: 1 }, { id: 2 }]
    const page2 = [{ id: 3 }, { id: 4 }]

    // loadMore twice with page 2 delivered twice (double-fetch regression guard)
    const once = mergeDiariesById(page1, page2)
    const twice = mergeDiariesById(once, page2)

    expect(twice.map(d => String(d.id))).toEqual(['1', '2', '3', '4'])
  })

  it('skips items the server re-sends in a later page (overlap guard)', () => {
    const existing = [{ id: '1' }, { id: '2' }]
    const incoming = [{ id: '2' }, { id: '3' }]

    expect(mergeDiariesById(existing, incoming).map(d => d.id)).toEqual(['1', '2', '3'])
  })

  it('treats numeric and string ids as the same id', () => {
    const existing = [{ id: 1 }]
    const incoming = [{ id: '1' }, { id: 2 }]

    expect(mergeDiariesById(existing, incoming).map(d => String(d.id))).toEqual(['1', '2'])
  })
})


import { mount } from '@vue/test-utils'
import { defineComponent, ref, nextTick } from 'vue'
import { api } from '~/lib/api-client'
vi.mock('~/lib/api-client', () => ({ api: { diaries: { list: vi.fn() } } }))
const response = (id: string, total = 4) => ({ data: [{ id, date: '2026-09-01' }], pagination: { total, page: 1, limit: 1, totalPages: total } })
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(r => { resolve = r })
  return { promise, resolve }
}

describe('timeline request generations', () => {
  let state: ReturnType<typeof useTimelineDiaries>
  let wrapper: ReturnType<typeof mount>
  let data: ReturnType<typeof ref>
  let refreshFetch: ReturnType<typeof vi.fn>
  let toastError: ReturnType<typeof vi.fn>
  beforeEach(() => {
    vi.mocked(api.diaries.list).mockReset()
    data = ref(response('initial'))
    toastError = vi.fn()
    vi.stubGlobal('useToast', () => ({ error: toastError }))
    refreshFetch = vi.fn(async () => { data.value = response('new') })
    vi.stubGlobal('useLazyFetch', () => ({ data, pending: ref(false), error: ref(null), refresh: refreshFetch }))
    wrapper = mount(defineComponent({ setup() { state = useTimelineDiaries({ limit: 1 }); return () => null } }))
  })
  afterEach(() => { wrapper.unmount(); vi.unstubAllGlobals() })

  it.each(['filter', 'reset', 'refresh'] as const)('discards old page after %s and requests the new second page', async (action) => {
    if (action === 'reset') { state.filters.dateFrom = '2026-09-01'; await nextTick() }
    const oldPage = deferred<any>()
    vi.mocked(api.diaries.list).mockReturnValueOnce(oldPage.promise)
    const oldLoad = state.loadMore()
    if (action === 'filter') { state.filters.dateFrom = '2026-09-02'; await nextTick() }
    else if (action === 'reset') { state.resetFilters(); await nextTick() }
    else await state.refresh()
    await nextTick()
    expect(state.loadingMore.value).toBe(false)
    const newPage = deferred<any>()
    vi.mocked(api.diaries.list).mockReturnValueOnce(newPage.promise)
    const newLoad = state.loadMore()
    oldPage.resolve({ data: response('old', 99) })
    await oldLoad
    expect(state.diaries.value.map(d => d.id)).toEqual(['new'])
    expect(state.pagination.value?.total).toBe(4)
    expect(state.loadingMore.value).toBe(true)
    newPage.resolve({ data: response('second') })
    await newLoad
    expect(state.diaries.value.map(d => d.id)).toEqual(['new', 'second'])
    expect(vi.mocked(api.diaries.list).mock.calls.at(-1)?.[0]).toEqual({ page: '2', limit: '1', ...(action === 'filter' ? { dateFrom: '2026-09-02' } : {}) })
    expect(state.loadingMore.value).toBe(false)
  })

  it('ignores stale request failures and waits for the first page before loading more', async () => {
    const oldPage = deferred<any>()
    vi.mocked(api.diaries.list).mockReturnValueOnce(oldPage.promise)
    const oldLoad = state.loadMore()
    const firstPage = deferred<void>()
    refreshFetch.mockImplementationOnce(async () => {
      state.pending.value = true
      await firstPage.promise
      data.value = response('fresh')
      state.pending.value = false
    })
    const refreshed = state.refresh()
    await state.loadMore()
    expect(api.diaries.list).toHaveBeenCalledTimes(1)
    oldPage.resolve({ error: new Error('stale offline response') })
    await oldLoad
    expect(toastError).not.toHaveBeenCalled()
    firstPage.resolve()
    await refreshed
    await nextTick()
    expect(state.diaries.value.map(d => d.id)).toEqual(['fresh'])
    expect(state.loadingMore.value).toBe(false)
  })

  it('uses latest filters after rapid switches and retries the same page after failure', async () => {
    state.filters.dateFrom = '2026-09-01'
    state.filters.dateFrom = '2026-09-02'
    state.filters.dateTo = '2026-09-03'
    await nextTick()
    vi.mocked(api.diaries.list).mockResolvedValueOnce({ error: new Error('offline') } as any)
    await state.loadMore()
    expect(state.loadingMore.value).toBe(false)
    expect(toastError).toHaveBeenCalledTimes(1)
    expect(state.diaries.value.map(d => d.id)).toEqual(['new'])
    vi.mocked(api.diaries.list).mockResolvedValueOnce({ data: response('second') } as any)
    await state.loadMore()
    expect(vi.mocked(api.diaries.list).mock.calls.map(c => c[0])).toEqual(Array(2).fill({ page: '2', limit: '1', dateFrom: '2026-09-02', dateTo: '2026-09-03' }))
  })
})
