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

vi.mock('h3', () => ({
  createError: (params: { statusCode: number; statusMessage: string }) => {
    const error = new Error(params.statusMessage)
    ;(error as any).statusCode = params.statusCode
    ;(error as any).statusMessage = params.statusMessage
    return error
  },
  defineEventHandler: (handler: Function) => handler,
  getHeader: vi.fn(),
  sendRedirect: vi.fn(),
}))

describe('Blog API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
      const mockEvent = { context: {} } as any

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

      const result = await handler(mockEvent)

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
              { title: { contains: 'test keyword' } },
              { excerpt: { contains: 'test keyword' } },
              { content: { contains: 'test keyword' } },
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
        },
      } as any

      const result = await handler(mockEvent)

      expect(result).toHaveProperty('id')
      expect(mockPostFindFirst).toHaveBeenCalled()
    })

    it('should return 404 for non-existent post', async () => {
      mockPostFindFirst.mockResolvedValue(null)

      const { default: handler } = await import('~/server/api/blog/[slug].get')
      const mockEvent = {
        context: {
          params: { slug: 'non-existent' },
        },
      } as any

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 404,
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
