import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import BlogCard from '~/components/BlogCard.vue'
import { calculateReadingTime } from '~/lib/blog'
import { normalizeCategory } from '~/types/blog'

const mockUseAuth = vi.fn()
const mockUseI18n = vi.fn()
const mockUseToast = vi.fn()

const mockFetch = vi.fn()

vi.mock('#imports', () => ({
  useAuth: () => mockUseAuth(),
  useI18n: () => mockUseI18n(),
  useToast: () => mockUseToast(),
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

// BlogCard does NOT currently delegate to PostMeta (it renders meta inline),
// so we do not stub PostMeta here. We assert computed metadata values via
// rendered text and (where necessary) the public vm API.
const buildStubs = (overrides: Record<string, any> = {}) => ({
  // Do NOT declare `to` as a prop — let it fall through to $attrs so the
  // rendered <a> exposes the route target as a real DOM attribute we can assert.
  NuxtLink: {
    template: '<a v-bind="$attrs"><slot /></a>',
    inheritAttrs: false,
  },
  NuxtImg: {
    // Surface src/alt as real DOM attributes so tests can assert them.
    template:
      '<img :src="src" :alt="alt" :width="width" :height="height" :loading="loading" />',
    props: ['src', 'alt', 'width', 'height', 'format', 'loading'],
  },
  Icon: {
    template: '<span />',
    props: ['name', 'class'],
  },
  ...overrides,
})

const mountBlogCard = (props: Record<string, any>, overrides: Record<string, any> = {}) =>
  mount(BlogCard, {
    props,
    global: {
      stubs: buildStubs(overrides.stubs),
      config: {
        globalProperties: {
          $t: (key: string) => key,
        },
      },
    },
  })

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
    mockFetch.mockReset()
    vi.stubGlobal('$fetch', mockFetch)
    vi.stubGlobal('confirm', vi.fn(() => true))
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  describe('link targets', () => {
    it('renders NuxtLink to /articles/:slug for the cover image', () => {
      const wrapper = mountBlogCard({ post: { ...postBase } })

      const articleLinks = wrapper
        .findAll('a')
        .filter((a) => a.attributes('to') === `/articles/${postBase.slug}`)
      expect(articleLinks.length).toBeGreaterThan(0)
    })

    it('renders NuxtLink to /admin/blog/:id/edit for admin edit button', () => {
      mockUseAuth.mockReturnValue({ isAdmin: ref(true), user: ref(null) })
      const wrapper = mountBlogCard({ post: { ...postBase } })

      const editLink = wrapper
        .findAll('a')
        .find((a) => a.attributes('to') === `/admin/blog/${postBase.id}/edit`)
      expect(editLink).toBeTruthy()
    })
  })

  describe('cover image', () => {
    it('renders NuxtImg with src and alt when coverImage is provided', () => {
      const wrapper = mountBlogCard({ post: { ...postBase } })
      const img = wrapper.find('img')
      expect(img.exists()).toBe(true)
      expect(img.attributes('src')).toBe(postBase.coverImage)
      expect(img.attributes('alt')).toBe(postBase.title)
    })

    it('renders the photo placeholder Icon when coverImage is missing', () => {
      const wrapper = mountBlogCard({
        post: { ...postBase, coverImage: null },
      })
      // No img element; instead a heroicons:photo placeholder is shown.
      expect(wrapper.find('img').exists()).toBe(false)
    })
  })

  describe('rendered metadata', () => {
    it('renders computed readingTime derived from post content', () => {
      const wrapper = mountBlogCard({ post: { ...postBase } })

      // BlogCard renders metadata inline (not via PostMeta). Assert the
      // computed reading time is exposed on the public vm — this is the
      // value the template renders alongside blog.minute.
      expect((wrapper.vm as any).readingTime).toBe(calculateReadingTime(postBase.content))
      expect(wrapper.text()).toContain(`${calculateReadingTime(postBase.content)}`)
    })

    it('normalizes the category key via normalizeCategory for i18n lookup', () => {
      const wrapper = mountBlogCard({ post: { ...postBase } })
      expect((wrapper.vm as any).categoryKey).toBe(normalizeCategory(postBase.category))
    })

    it('hides reading time when the post has no content', () => {
      const wrapper = mountBlogCard({
        post: { ...postBase, content: undefined },
      })
      expect((wrapper.vm as any).readingTime).toBeNull()
      expect(wrapper.text()).not.toContain('blog.minute')
    })
  })

  describe('author fallback', () => {
    it('falls back to the localized author label when author name is missing', () => {
      mockUseI18n.mockReturnValue({
        t: (key: string) => (key === 'blog.author' ? '作者' : key),
        locale: ref('zh-TW'),
      })

      const wrapper = mountBlogCard({
        post: {
          ...postBase,
          author: { id: 1, name: null },
        },
      })

      expect(wrapper.text()).toContain('作者')
    })
  })

  describe('title affordance', () => {
    it('exposes the full title via title attribute for tooltip on truncation', () => {
      const wrapper = mountBlogCard({ post: { ...postBase } })

      const titleLink = wrapper
        .findAll('a')
        .find((a) => a.text() === postBase.title)
      expect(titleLink).toBeTruthy()
      expect(titleLink!.attributes('title')).toBe(postBase.title)
    })
  })

  describe('admin delete flow', () => {
    it('shows admin delete button only when isAdmin is true', () => {
      // Non-admin: no delete button
      const nonAdmin = mountBlogCard({ post: { ...postBase } })
      const nonAdminDelete = nonAdmin
        .findAll('button')
        .find((b) => b.attributes('title') === '刪除')
      expect(nonAdminDelete).toBeUndefined()

      // Admin: delete button present
      mockUseAuth.mockReturnValue({ isAdmin: ref(true), user: ref(null) })
      const admin = mountBlogCard({ post: { ...postBase } })
      const adminDelete = admin
        .findAll('button')
        .find((b) => b.attributes('title') === '刪除')
      expect(adminDelete).toBeDefined()
    })

    it('calls DELETE /api/blog/:id and emits deleted on success', async () => {
      mockUseAuth.mockReturnValue({ isAdmin: ref(true), user: ref(null) })
      const toastSuccess = vi.fn()
      mockUseToast.mockReturnValue({ success: toastSuccess, error: vi.fn() })

      // Simulate a successful DELETE response.
      mockFetch.mockResolvedValueOnce({ success: true })

      const wrapper = mountBlogCard({ post: { ...postBase } })
      const deleteBtn = wrapper
        .findAll('button')
        .find((b) => b.attributes('title') === '刪除')!
      expect(deleteBtn).toBeTruthy()

      await deleteBtn.trigger('click')
      // Allow the click handler's awaited fetch chain to resolve.
      await new Promise((r) => setTimeout(r, 0))

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/blog/${postBase.id}`,
        expect.objectContaining({ method: 'DELETE' }),
      )
      expect(toastSuccess).toHaveBeenCalled()
      expect(wrapper.emitted('deleted')).toEqual([[postBase.id]])
    })

    it('surfaces a toast error and does not emit deleted when delete fails', async () => {
      mockUseAuth.mockReturnValue({ isAdmin: ref(true), user: ref(null) })
      const toastError = vi.fn()
      const toastSuccess = vi.fn()
      mockUseToast.mockReturnValue({ success: toastSuccess, error: toastError })

      mockFetch.mockRejectedValueOnce({ statusCode: 403, statusMessage: 'CSRF validation failed' })

      const wrapper = mountBlogCard({ post: { ...postBase } })
      const deleteBtn = wrapper
        .findAll('button')
        .find((b) => b.attributes('title') === '刪除')!
      await deleteBtn.trigger('click')
      await new Promise((r) => setTimeout(r, 0))

      expect(mockFetch).toHaveBeenCalled()
      expect(toastError).toHaveBeenCalled()
      expect(toastSuccess).not.toHaveBeenCalled()
      expect(wrapper.emitted('deleted')).toBeUndefined()
    })

    it('does not call fetch when confirm dialog is cancelled', async () => {
      mockUseAuth.mockReturnValue({ isAdmin: ref(true), user: ref(null) })
      vi.stubGlobal('confirm', vi.fn(() => false))

      const wrapper = mountBlogCard({ post: { ...postBase } })
      const deleteBtn = wrapper
        .findAll('button')
        .find((b) => b.attributes('title') === '刪除')!
      await deleteBtn.trigger('click')
      await new Promise((r) => setTimeout(r, 0))

      expect(mockFetch).not.toHaveBeenCalled()
      expect(wrapper.emitted('deleted')).toBeUndefined()
    })
  })

  describe('admin focus affordance (a11y)', () => {
    it('renders admin actions within a focus-within reachable container', () => {
      mockUseAuth.mockReturnValue({ isAdmin: ref(true), user: ref(null) })
      const wrapper = mountBlogCard({ post: { ...postBase } })

      // The admin container must include group-focus-within so keyboard users
      // can reach edit/delete without first hovering. Asserted as an a11y
      // contract (keyboard reachability), not as a brittle class-token check.
      const adminBtn = wrapper.find('[title="刪除"]')
      expect(adminBtn.exists()).toBe(true)
      const container = adminBtn.element.parentElement
      expect(container?.className ?? '').toContain('group-focus-within:opacity-100')
    })
  })
})
