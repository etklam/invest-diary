import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import BlogCard from '~/components/BlogCard.vue'
import { calculateReadingTime } from '~/lib/blog'
import { normalizeCategory } from '~/types/blog'

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
    template: '<a><slot /></a>',
    props: ['to'],
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
    vi.stubGlobal('useAuth', () => ({
      isAdmin: ref(false),
      user: ref(null),
    }))
    vi.stubGlobal('useI18n', () => ({
      t: (key: string) => key,
    }))
    vi.stubGlobal('useToast', () => ({
      success: vi.fn(),
      error: vi.fn(),
    }))
    vi.stubGlobal('refreshNuxtData', vi.fn())
    vi.stubGlobal('$fetch', vi.fn())
    vi.stubGlobal('confirm', vi.fn(() => true))
  })

  afterEach(() => {
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
})
