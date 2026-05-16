import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockGetQuery, mockReadBody, mockGetRouterParam } from '../vi-setup'

// Create mock functions
const mockPostFindMany = vi.fn()
const mockPostCount = vi.fn()
const mockPostFindUnique = vi.fn()
const mockPostFindFirst = vi.fn()
const mockPostCreate = vi.fn()
const mockPostUpdate = vi.fn()
const mockPostDelete = vi.fn()
const mockBlogLogError = vi.fn()
const mockBlogLog = {
  info: vi.fn(),
  warn: vi.fn(),
  error: mockBlogLogError,
}
const mockBlogWithRequestId = vi.fn(() => mockBlogLog)

// Mock modules
vi.mock('~/lib/prisma', () => ({
  default: {
    post: {
      findMany: mockPostFindMany,
      count: mockPostCount,
      findUnique: mockPostFindUnique,
      findFirst: mockPostFindFirst,
      create: mockPostCreate,
      update: mockPostUpdate,
      delete: mockPostDelete,
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  },
}))
vi.mock('~/lib/logger', () => ({
  logger: {
    blog: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      withRequestId: mockBlogWithRequestId,
    },
  },
}))

vi.mock('#imports', () => ({
  cachedEventHandler: (handler: Function) => handler,
}))

vi.mock('h3', () => ({
  createError: (params: { statusCode: number; statusMessage: string }) => {
    const error = new Error(params.statusMessage)
    ;(error as any).statusCode = params.statusCode
    ;(error as any).statusMessage = params.statusMessage
    return error
  },
  defineEventHandler: (handler: Function) => handler,
  cachedEventHandler: (handler: Function) => handler,
  getHeader: vi.fn(),
  sendRedirect: vi.fn(),
}))

describe('Blog API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBlogWithRequestId.mockReturnValue(mockBlogLog)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/blog', () => {
    it('should return paginated published posts', async () => {
      const mockPosts = [
        {
          id: 1,
          title: 'Test Post 1',
          slug: 'test-post-1',
          excerpt: 'Excerpt 1',
          status: 'PUBLISHED',
          publishedAt: new Date('2024-01-01'),
          author: { id: 1, name: 'Author 1', email: 'author1@test.com' },
        },
        {
          id: 2,
          title: 'Test Post 2',
          slug: 'test-post-2',
          excerpt: 'Excerpt 2',
          status: 'PUBLISHED',
          publishedAt: new Date('2024-01-02'),
          author: { id: 1, name: 'Author 1', email: 'author1@test.com' },
        },
      ]

      mockPostFindMany.mockResolvedValue(mockPosts)
      mockPostCount.mockResolvedValue(2)

      mockGetQuery.mockReturnValue({ page: 1, limit: 9 })

      const { default: handler } = await import('~/server/api/blog/index.get')
      const mockEvent = { context: { requestId: 'req-blog-index' } } as any

      const result = await handler(mockEvent)

      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('pagination')
      expect(result.data).toHaveLength(2)
      expect(result.pagination).toEqual({
        page: 1,
        limit: 9,
        total: 2,
        totalPages: 1,
      })
      expect(mockBlogWithRequestId).toHaveBeenCalledWith('req-blog-index')
    })

    it('should serialize bigint ids to avoid JSON response errors', async () => {
      mockPostFindMany.mockResolvedValue([
        {
          id: BigInt(101),
          title: 'BigInt Post',
          slug: 'bigint-post',
          excerpt: 'Excerpt',
          status: 'PUBLISHED',
          publishedAt: new Date('2024-01-01'),
          author: { id: BigInt(9), name: 'Author', email: 'author@test.com' },
        },
      ])
      mockPostCount.mockResolvedValue(1)
      mockGetQuery.mockReturnValue({})

      const { default: handler } = await import('~/server/api/blog/index.get')
      const mockEvent = { context: {} } as any

      const result = await handler(mockEvent)

      expect(result.data[0]?.id).toBe('101')
      expect(result.data[0]?.author?.id).toBe('9')
      expect(() => JSON.stringify(result)).not.toThrow()
    })

    it('should filter by category', async () => {
      const mockPosts = [
        {
          id: 1,
          title: 'Tech Post',
          slug: 'tech-post',
          category: 'technical',
          status: 'PUBLISHED',
          publishedAt: new Date('2024-01-01'),
          author: { id: 1, name: 'Author', email: 'author@test.com' },
        },
      ]

      mockPostFindMany.mockResolvedValue(mockPosts)
      mockPostCount.mockResolvedValue(1)

      mockGetQuery.mockReturnValue({ category: 'technical' })

      const { default: handler } = await import('~/server/api/blog/index.get')
      const mockEvent = { context: {} } as any

      await handler(mockEvent)

      expect(mockPostFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: expect.objectContaining({
              in: expect.arrayContaining(['technical']),
            }),
          }),
        })
      )
    })

    it('should filter by tag', async () => {
      mockPostFindMany.mockResolvedValue([])
      mockPostCount.mockResolvedValue(0)

      mockGetQuery.mockReturnValue({ tag: 'vue' })

      const { default: handler } = await import('~/server/api/blog/index.get')
      const mockEvent = { context: {} } as any

      await handler(mockEvent)

      expect(mockPostFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: { contains: 'vue' },
          }),
        })
      )
    })

    it('should search in title, excerpt and content', async () => {
      mockPostFindMany.mockResolvedValue([])
      mockPostCount.mockResolvedValue(0)

      mockGetQuery.mockReturnValue({ search: 'test keyword' })

      const { default: handler } = await import('~/server/api/blog/index.get')
      const mockEvent = { context: {} } as any

      await handler(mockEvent)

      expect(mockPostFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { search: 'test keyword' } },
              { excerpt: { search: 'test keyword' } },
            ],
          }),
        })
      )
    })

    it('should handle pagination correctly', async () => {
      mockPostFindMany.mockResolvedValue([])
      mockPostCount.mockResolvedValue(100)

      mockGetQuery.mockReturnValue({ page: 2, limit: 10 })

      const { default: handler } = await import('~/server/api/blog/index.get')
      const mockEvent = { context: {} } as any

      const result = await handler(mockEvent)

      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 100,
        totalPages: 10,
      })
    })

    it('should only return published posts', async () => {
      mockPostFindMany.mockResolvedValue([])
      mockPostCount.mockResolvedValue(0)

      mockGetQuery.mockReturnValue({})

      const { default: handler } = await import('~/server/api/blog/index.get')
      const mockEvent = { context: {} } as any

      await handler(mockEvent)

      expect(mockPostFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PUBLISHED',
            publishedAt: { not: null },
          }),
        })
      )
    })

    it('should reject invalid date filters with 400', async () => {
      mockGetQuery.mockReturnValue({ dateFrom: 'not-a-date' })

      const { default: handler } = await import('~/server/api/blog/index.get')
      const mockEvent = { context: {} } as any

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 400,
        statusMessage: 'Validation failed',
      })
    })

    it('should keep list payload lean while still returning author name', async () => {
      mockPostFindMany.mockResolvedValue([])
      mockPostCount.mockResolvedValue(0)
      mockGetQuery.mockReturnValue({})

      const { default: handler } = await import('~/server/api/blog/index.get')
      const mockEvent = { context: {} } as any

      await handler(mockEvent)

      const findManyArgs = mockPostFindMany.mock.calls[0]?.[0]

      expect(findManyArgs?.select).toMatchObject({
        title: true,
        excerpt: true,
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      })
      expect(findManyArgs?.select).not.toHaveProperty('content')
    })
  })

  describe('GET /api/blog/[slug]', () => {
    it('should return post by slug', async () => {
      const mockPost = {
        id: 1,
        title: 'Test Post',
        slug: 'test-post',
        content: 'Full content here',
        excerpt: 'Excerpt',
        status: 'PUBLISHED',
        publishedAt: new Date('2024-01-01'),
        author: { id: 1, name: 'Author', email: 'author@test.com' },
      }

      mockPostFindFirst.mockResolvedValue(mockPost)
      mockGetQuery.mockReturnValue({})

      const { default: handler } = await import('~/server/api/blog/[slug].get')
      const mockEvent = {
        context: {
          params: { slug: 'test-post' },
          requestId: 'req-blog-slug',
        },
      } as any

      const result = await handler(mockEvent)

      expect(result).toHaveProperty('id')
      expect(mockPostFindFirst).toHaveBeenCalled()
      expect(mockBlogWithRequestId).toHaveBeenCalledWith('req-blog-slug')
    })

    it('should serialize bigint ids in slug response', async () => {
      const mockPost = {
        id: BigInt(3),
        title: 'BigInt Slug Post',
        slug: 'bigint-slug-post',
        content: 'Full content here',
        excerpt: 'Excerpt',
        status: 'PUBLISHED',
        publishedAt: new Date('2024-01-01'),
        author: { id: BigInt(11), name: 'Author', email: 'author@test.com' },
      }

      mockPostFindFirst.mockResolvedValue(mockPost)
      mockGetQuery.mockReturnValue({})

      const { default: handler } = await import('~/server/api/blog/[slug].get')
      const mockEvent = {
        context: {
          params: { slug: 'bigint-slug-post' },
          requestId: 'req-blog-bigint-slug',
        },
      } as any

      const result = await handler(mockEvent)

      expect(result.id).toBe('3')
      expect(result.author.id).toBe('11')
      expect(() => JSON.stringify(result)).not.toThrow()
    })

    it('should return 404 for non-existent post', async () => {
      mockPostFindFirst.mockResolvedValue(null)

      const { default: handler } = await import('~/server/api/blog/[slug].get')
      const mockEvent = {
        context: {
          params: { slug: 'non-existent' },
          requestId: 'req-blog-404',
        },
      } as any

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 404,
      })
      expect(mockBlogWithRequestId).toHaveBeenCalledWith('req-blog-404')
    })
    it('should log unexpected failures when fetching by slug', async () => {
      mockPostFindFirst.mockRejectedValue(new Error('database failure'))

      const { default: handler } = await import('~/server/api/blog/[slug].get')
      const mockEvent = {
        context: {
          params: { slug: 'error-post' },
          requestId: 'req-blog-error',
        },
      } as any

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 500,
      })

      expect(mockBlogWithRequestId).toHaveBeenCalledWith('req-blog-error')
      expect(mockBlogLogError).toHaveBeenCalledWith(
        'Error fetching post',
        expect.objectContaining({
          slug: 'error-post',
          error: expect.stringContaining('database failure'),
        })
      )
    })

    it('should return 400 when slug is missing', async () => {
      mockGetRouterParam.mockReturnValue(undefined)

      const { default: handler } = await import('~/server/api/blog/[slug].get')
      const mockEvent = {
        context: {
          params: {},
        },
      } as any

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 400,
        statusMessage: 'Validation failed',
      })
    })
  })

  describe('GET /api/blog/admin', () => {
    it('should fetch admin post list without full content payload', async () => {
      mockPostFindMany.mockResolvedValue([])
      mockPostCount.mockResolvedValue(0)
      mockGetQuery.mockReturnValue({})

      const { default: handler } = await import('~/server/api/blog/admin/index.get')
      const mockEvent = {
        context: {
          user: { id: '1', email: 'admin@test.com', role: 'ADMIN' },
        },
      } as any

      await handler(mockEvent)

      const firstCall = mockPostFindMany.mock.calls[0]?.[0]
      expect(firstCall?.select).toMatchObject({
        id: true,
        title: true,
        slug: true,
        excerpt: true,
      })
      expect(firstCall?.select).not.toHaveProperty('content')
    })
  })

  describe('GET /api/blog/admin/[id]', () => {
    it('should fetch a single admin post by id with full content', async () => {
      const mockPost = {
        id: 42,
        title: 'Deep Post',
        slug: 'deep-post',
        content: 'Full article body',
        category: 'technical',
        status: 'DRAFT',
        author: { id: 1, name: 'Admin', email: 'admin@test.com' },
      }

      mockPostFindUnique.mockResolvedValue(mockPost)
      mockGetRouterParam.mockReturnValue('42')

      const { default: handler } = await import('~/server/api/blog/admin/[id].get')
      const mockEvent = {
        context: {
          user: { id: '1', email: 'admin@test.com', role: 'ADMIN' },
        },
      } as any

      const result = await handler(mockEvent)

      expect(result).toEqual(mockPost)
      expect(mockPostFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: BigInt(42) },
          include: expect.objectContaining({
            author: expect.any(Object),
          }),
        })
      )
    })
  })

  describe('POST /api/blog (admin)', () => {
    it('should create a new blog post', async () => {
      const mockPost = {
        id: 1,
        title: 'New Post',
        slug: 'new-post',
        content: 'Content',
        excerpt: 'Excerpt',
        status: 'DRAFT',
        authorId: 1,
      }

      mockPostFindUnique.mockResolvedValue(null)
      mockPostCreate.mockResolvedValue(mockPost)

      mockReadBody.mockResolvedValue({
        title: 'New Post',
        content: 'Content',
        excerpt: 'Excerpt',
        category: 'TECH',
        tags: 'vue,nuxt',
        status: 'DRAFT',
      })

      const { default: handler } = await import('~/server/api/blog/index.post')
      const mockEvent = {
        context: {
          user: { id: '1', email: 'admin@test.com', role: 'ADMIN' },
        },
      } as any

      const result = await handler(mockEvent)

      expect(result).toHaveProperty('id')
      expect(mockPostCreate).toHaveBeenCalled()
    })

    it('should validate required fields', async () => {
      mockReadBody.mockResolvedValue({
        // Missing title
        content: 'Content',
      })

      const { default: handler } = await import('~/server/api/blog/index.post')
      const mockEvent = {
        context: {
          user: { id: '1', email: 'admin@test.com', role: 'ADMIN' },
        },
      } as any

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 400,
      })
    })
  })

  describe('PUT /api/blog/[id]', () => {
    it('should update an existing blog post', async () => {
      const mockPost = {
        id: 1,
        title: 'Updated Post',
        slug: 'updated-post',
        content: 'Updated content',
        category: 'TECH',
        status: 'PUBLISHED',
      }

      mockPostFindUnique.mockResolvedValue(mockPost)
      mockPostUpdate.mockResolvedValue(mockPost)

      mockReadBody.mockResolvedValue({
        title: 'Updated Post',
        content: 'Updated content',
        category: 'TECH',
        status: 'PUBLISHED',
      })

      mockGetRouterParam.mockReturnValue('1')

      const { default: handler } = await import('~/server/api/blog/[id].put')
      const mockEvent = {
        context: {
          user: { id: '1', email: 'admin@test.com', role: 'ADMIN' },
        },
      } as any

      const result = await handler(mockEvent)

      expect(result).toHaveProperty('id')
      expect(mockPostUpdate).toHaveBeenCalled()
    })
  })

  describe('DELETE /api/blog/[id]', () => {
    it('should delete a blog post', async () => {
      const mockPost = {
        id: 1,
        title: 'Post to delete',
      }

      mockPostFindFirst.mockResolvedValue(mockPost)
      mockPostDelete.mockResolvedValue(mockPost)

      mockGetRouterParam.mockReturnValue('1')

      const { default: handler } = await import('~/server/api/blog/[id].delete')
      const mockEvent = {
        context: {
          user: { id: '1', email: 'admin@test.com', role: 'ADMIN' },
        },
      } as any

      const result = await handler(mockEvent)

      expect(result).toEqual({
        success: true,
        message: 'Post deleted successfully',
      })
    })
  })
})
