/**
 * Behavior regression test for article SSR rendering.
 *
 * Root cause being guarded against: an earlier version of the article page used
 * a fire-and-forget `watch` + `void refresh()` in the `useArticleMarkdown`
 * composable. Vue does not await fire-and-forget promises during SSR, so the
 * markdown was never parsed before the HTML was streamed — the page only ever
 * rendered the loading skeleton.
 *
 * The fix routes markdown parsing through `useAsyncData` on the page component
 * so Nuxt's SSR engine awaits it.
 *
 * This file verifies the *behavior* by mounting the real `pages/articles/[slug].vue`
 * (wrapped in <Suspense>) and asserting:
 *   1. the parsed article title + body are visible in the DOM
 *   2. the page is NOT stuck on the loading skeleton
 *   3. when the fetch rejects with a 404, the not-found UI is shown
 *   4. when the fetch rejects with a 5xx, the retry path runs once before rendering
 */
import { describe, expect, it, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, defineComponent, h, defineAsyncComponent, Suspense } from 'vue'
import type { Component } from 'vue'

// ---- MDCRenderer stub: renders AST nodes to a real DOM tree ---------------

function textOf(node: any): string {
  if (!node) return ''
  if (typeof node.value === 'string') return node.value
  if (Array.isArray(node.children)) return node.children.map(textOf).join('')
  return ''
}

function astToVNodes(node: any): any {
  if (!node) return ''
  if (typeof node.value === 'string') return node.value
  if (node.tag) {
    const kids = (node.children ?? []).map(astToVNodes)
    return h(node.tag, {}, kids)
  }
  return ''
}

const MDCRendererStub = defineComponent({
  name: 'MDCRenderer',
  props: ['body', 'data'],
  render() {
    const children = (this.body?.children ?? []).map(astToVNodes)
    return h('div', { class: 'mdc-rendered' }, children)
  },
})

const baseStubs = {
  NuxtLink: {
    template: '<a v-bind="$attrs"><slot /></a>',
    props: ['to'],
    inheritAttrs: false,
  },
  NuxtImg: {
    template: '<img />',
    props: ['src', 'alt', 'width', 'height', 'loading'],
  },
  Icon: {
    template: '<span />',
    props: ['name', 'class'],
  },
  AppSkeleton: {
    template: '<div data-testid="skeleton">loading</div>',
    props: ['variant'],
  },
  MDCRenderer: MDCRendererStub,
}

// ---- Helper: install globals, mount the real page inside <Suspense> -------

const SAMPLE_POST = {
  id: 1,
  title: 'Thinking in Beta',
  slug: 'thinking-in-beta',
  excerpt: 'A short excerpt.',
  content: '# Thinking in Beta\n\nMost investors try to time the market.',
  category: '市場觀察',
  tags: 'beta',
  coverImage: null,
  publishedAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  author: { id: 1, name: 'Author Name' },
}

async function mountArticlePage({
  fetchImpl,
  isAdmin = false,
}: {
  fetchImpl: (url: string, opts?: any) => Promise<any>
  isAdmin?: boolean
}) {
  const mockFetch = vi.fn(fetchImpl) as any

  // useAsyncData must run the handler synchronously inside setup so the
  // returned `data` ref resolves before <Suspense> releases the component.
  const useAsyncData = async (_key: any, handler: any) => {
    try {
      const result = await handler()
      return {
        data: ref(result),
        pending: ref(false),
        error: ref(null),
        refresh: () => Promise.resolve(),
      }
    } catch (err: any) {
      return {
        data: ref(null),
        pending: ref(false),
        error: ref(err),
        refresh: () => Promise.resolve(),
      }
    }
  }

  Object.assign(globalThis, {
    useAuth: () => ({ isAdmin: ref(isAdmin), user: ref(null) }),
    useI18n: () => ({ t: (key: string) => key, locale: ref('zh-TW') }),
    useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }),
    useRouter: () => ({ push: vi.fn() }),
    useRoute: () => ({ params: { slug: 'thinking-in-beta' } }),
    useRuntimeConfig: () => ({ public: { siteUrl: 'https://example.test' } }),
    useAsyncData,
    $fetch: mockFetch,
    useHead: () => {},
    definePageMeta: () => {},
    usePerformance: () => ({ startMonitoring: () => {}, stopMonitoring: () => {} }),
    useStructuredData: () => ({
      injectBlogPostingSchema: () => {},
      injectBreadcrumbSchema: () => {},
    }),
  })

  // Import after globals are installed so the page's auto-imports resolve.
  const pageModule = await import('~/pages/articles/[slug].vue')
  const ArticlePage: Component = pageModule.default

  // Wrap in Suspense because the page uses top-level await on useAsyncData.
  const Wrapper = defineComponent({
    render() {
      return h(
        'div',
        { id: 'test-root' },
        [
          h(
            Suspense,
            {},
            {
              default: () => h(ArticlePage),
              fallback: () => h('div', { 'data-testid': 'suspense-fallback' }, 'suspended'),
            },
          ),
        ],
      )
    },
  })

  const wrapper = mount(Wrapper as any, {
    global: {
      stubs: baseStubs,
      config: {
        globalProperties: {
          $t: (key: string) => key,
        },
      },
    },
  })

  // Allow async setup + async component to resolve.
  await flushPromises()
  return wrapper
}

describe('Article page SSR markdown rendering (behavior)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders parsed article title and body content to the DOM', async () => {
    const wrapper = await mountArticlePage({ fetchImpl: async () => SAMPLE_POST })

    expect(wrapper.text()).toContain('Thinking in Beta')
    // Body content from parsed markdown — the regression guard.
    expect(wrapper.text()).toContain('Most investors try to time the market.')
  })

  it('does NOT remain stuck on the loading skeleton when data resolves', async () => {
    const wrapper = await mountArticlePage({ fetchImpl: async () => SAMPLE_POST })

    expect(wrapper.find('[data-testid="skeleton"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="suspense-fallback"]').exists()).toBe(false)
  })

  it('shows the not-found UI when the fetch rejects with a 404 (non-retriable)', async () => {
    const fetchImpl = vi.fn(async () => {
      const err: any = new Error('Not Found')
      err.statusCode = 404
      throw err
    })

    const wrapper = await mountArticlePage({ fetchImpl: fetchImpl as any })

    expect(wrapper.text()).toContain('blog.postNotFound')
    expect(wrapper.text()).not.toContain('Most investors try to time the market.')
  })

  it('retries once on a transient 5xx error and then renders content', async () => {
    let calls = 0
    const fetchImpl = vi.fn(async () => {
      calls++
      if (calls === 1) {
        const err: any = new Error('Server Error')
        err.statusCode = 503
        throw err
      }
      return SAMPLE_POST
    })

    const wrapper = await mountArticlePage({ fetchImpl: fetchImpl as any })

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Thinking in Beta')
    expect(wrapper.text()).toContain('Most investors try to time the market.')
  })
})
