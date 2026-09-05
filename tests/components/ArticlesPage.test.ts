import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, reactive, ref, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ArticlesPage from '~/pages/articles/index.vue'

vi.mock('@vueuse/core', () => ({ useMediaQuery: () => ref(false), useInfiniteScroll: vi.fn() }))
const payload = (id: string, page: number, totalPages = 1) => ({ data: [{ id, title: id }], pagination: { page, totalPages, total: totalPages * 9, limit: 9 } })
const Card = defineComponent({ props: ['post'], emits: ['deleted'], template: '<button class="card" @click="$emit(\'deleted\', post.id)">{{post.id}}</button>' })

describe('Articles deletion refresh', () => {
  let wrapper: ReturnType<typeof mount>
  let fetchMock: ReturnType<typeof vi.fn>
  let route: { query: Record<string, string> }
  let replace: ReturnType<typeof vi.fn>
  beforeEach(() => {
    route = reactive({ query: { page: '2' } })
    fetchMock = vi.fn()
    replace = vi.fn()
    vi.stubGlobal('definePageMeta', vi.fn())
    vi.stubGlobal('useHead', vi.fn())
    vi.stubGlobal('useRuntimeConfig', () => ({ public: {} }))
    vi.stubGlobal('useStructuredData', () => ({ injectBreadcrumbSchema: vi.fn() }))
    vi.stubGlobal('useRoute', () => route)
    vi.stubGlobal('useRouter', () => ({ replace }))
    vi.stubGlobal('$fetch', fetchMock)
  })
  afterEach(() => { wrapper?.unmount(); vi.unstubAllGlobals() })
  async function render() {
    wrapper = mount(defineComponent({ components: { ArticlesPage }, template: '<Suspense><ArticlesPage /></Suspense>' }), {
      global: {
        stubs: { BlogCard: Card, Icon: true, CategoryFilter: true, Transition: true },
        mocks: { $t: (key: string) => key },
      },
    })
    await flushPromises()
    return wrapper.findComponent(ArticlesPage).vm as any
  }

  it('returns to page one and refetches after deleting the last post on a later page', async () => {
    fetchMock.mockResolvedValueOnce(payload('deleted', 2, 2)).mockResolvedValueOnce(payload('remaining', 1))
    await render()
    await wrapper.find('.card').trigger('click')
    await flushPromises()
    expect(fetchMock.mock.calls.map(call => call[1].params.page)).toEqual([2, 1])
    expect(replace).toHaveBeenCalledWith({ query: { page: '1' } })
    expect(wrapper.findAll('.card').map(card => card.text())).toEqual(['remaining'])
  })

  it('discards in-flight old prefetch and rebuilds pagination cache after deletion', async () => {
    route.query.page = '1'
    let finishOld!: (value: unknown) => void
    fetchMock
      .mockResolvedValueOnce(payload('old-one', 1, 3))
      .mockResolvedValueOnce(payload('old-two', 2, 3))
      .mockReturnValueOnce(new Promise(resolve => { finishOld = resolve }))
      .mockResolvedValueOnce(payload('new-one', 1, 3))
      .mockResolvedValueOnce(payload('new-two', 2, 3))
      .mockResolvedValueOnce(payload('new-three', 3, 3))
    const page = await render()
    const oldLoad = page.loadMore()
    await nextTick()
    await wrapper.find('.card').trigger('click')
    await flushPromises()
    finishOld(payload('deleted-stale-three', 3, 3))
    await oldLoad
    await page.loadMore()
    await page.loadMore()
    await nextTick()
    expect(wrapper.findAll('.card').map(card => card.text())).toEqual(['new-one', 'new-two', 'new-three'])
    expect(fetchMock.mock.calls.map(call => call[1].params.page)).toEqual([1, 2, 3, 1, 2, 3])
  })
})
