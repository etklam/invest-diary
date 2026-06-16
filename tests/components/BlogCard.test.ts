import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import BlogCard from '~/components/BlogCard.vue'
import { calculateReadingTime } from '~/lib/blog'
import { normalizeCategory } from '~/types/blog'

const mockUseAuth = vi.fn()
const mockUseI18n = vi.fn()
const mockUseToast = vi.fn()
const mockRefreshNuxtData = vi.fn()
const mockFetch = vi.fn()

vi.mock('#imports', () => ({
  useAuth: () => mockUseAuth(),
  useI18n: () => mockUseI18n(),
  useToast: () => mockUseToast(),
  refreshNuxtData: () => mockRefreshNuxtData(),
  $fetch: (...args: any[]) => mockFetch(...args),
}))

const postBase = {
  id: 1,
  title: 'Test Blog Post',
  slug: 'test-blog-post',
  excerpt: 'This is a test excerpt',
  content: 'This is some content for reading time calculation.',
  category: '市場觀察',
  tags: 'vue,nuxt',
  coverImage: '/cover.jpg',
  publishedAt: new Date('2026-01-01T00:00:00.000Z'),
  author: {
    id: 1,
    name: 'Test Author',
    email: 'author@test.com',
  },
}

const stubs = {
  NuxtLink: {
    template: '<a v-bind="$attrs"><slot /></a>',
    props: ['to'],
    inheritAttrs: false,
  },
  NuxtImg: {
    template: '<img />',
    props: ['src', 'alt', 'width', 'height', 'format', 'loading'],
  },
  PostMeta: {
    template: '<div />',
    props: ['author', 'date', 'readingTime'],
  },
  Icon: {
    template: '<span />',
    props: ['name', 'class'],
  },
}

describe('BlogCard Component', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      isAdmin: ref(false),
      user: ref(null),
    })
    mockUseI18n.mockReturnValue({
      t: (key: string) => key,
      locale: ref('zh-TW'),
    })
    mockUseToast.mockReturnValue({
      success: vi.fn(),
      error: vi.fn(),
    })
    mockRefreshNuxtData.mockClear()
    mockFetch.mockClear()
    vi.stubGlobal('confirm', vi.fn(() => true))
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('uses calculateReadingTime for readingTime computed', () => {
    const wrapper = mount(BlogCard, {
      props: { post: { ...postBase } },
      global: {
        stubs,
        config: {
          globalProperties: {
            $t: (key: string) => key,
          },
        },
      },
    })

    expect((wrapper.vm as any).readingTime).toBe(calculateReadingTime(postBase.content))
  })

  it('normalizes category using normalizeCategory', () => {
    const wrapper = mount(BlogCard, {
      props: { post: { ...postBase } },
      global: {
        stubs,
        config: {
          globalProperties: {
            $t: (key: string) => key,
          },
        },
      },
    })

    expect((wrapper.vm as any).categoryKey).toBe(normalizeCategory(postBase.category))
  })

  it('hides reading time when list data does not include content', () => {
    const wrapper = mount(BlogCard, {
      props: {
        post: {
          ...postBase,
          content: undefined,
        },
      },
      global: {
        stubs,
        config: {
          globalProperties: {
            $t: (key: string) => key,
          },
        },
      },
    })

    expect((wrapper.vm as any).readingTime).toBeNull()
    expect(wrapper.text()).not.toContain('blog.minute')
  })

  it('falls back to localized author label when author name is missing', () => {
    mockUseI18n.mockReturnValue({
      t: (key: string) => (key === 'blog.author' ? '作者' : key),
      locale: ref('zh-TW'),
    })

    const wrapper = mount(BlogCard, {
      props: {
        post: {
          ...postBase,
          author: {
            id: 1,
            name: null,
          },
        },
      },
      global: {
        stubs,
        config: {
          globalProperties: {
            $t: (key: string) => (key === 'blog.author' ? '作者' : key),
          },
        },
      },
    })

    expect(wrapper.text()).toContain('作者')
  })

  it('exposes the full title via title attribute on the title link for tooltip on truncation', () => {
    const wrapper = mount(BlogCard, {
      props: { post: { ...postBase } },
      global: {
        stubs,
        config: {
          globalProperties: {
            $t: (key: string) => key,
          },
        },
      },
    })

    const titleLink = wrapper.findAll('a').find((a) => a.text() === postBase.title)
    expect(titleLink).toBeTruthy()
    expect(titleLink!.attributes('title')).toBe(postBase.title)
  })

  it('reveals admin buttons on keyboard focus inside the card, not only on hover', () => {
    mockUseAuth.mockReturnValue({
      isAdmin: ref(true),
      user: ref(null),
    })

    const wrapper = mount(BlogCard, {
      props: { post: { ...postBase } },
      global: {
        stubs,
        config: {
          globalProperties: {
            $t: (key: string) => key,
          },
        },
      },
    })

    // The admin button container must include group-focus-within so keyboard
    // users can reach the edit/delete buttons without first hovering.
    const adminSection = wrapper.find('[class*="admin-btn"]').element.parentElement
    expect(adminSection?.className ?? '').toContain('group-focus-within:opacity-100')
  })
})
