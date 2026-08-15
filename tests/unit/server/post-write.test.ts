import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AppError } from '~/lib/errors/factory'
import {
  resolvePublishedAt,
  createPostForAdmin,
  updatePostForAdmin,
  setPostStatus,
  bulkSetPostStatus,
  parsePostIds,
  POST_AUTHOR_INCLUDE,
} from '~/server/utils/post-write'

const {
  mockPostFindUnique,
  mockPostFindFirst,
  mockPostCreate,
  mockPostUpdate,
} = vi.hoisted(() => ({
  mockPostFindUnique: vi.fn(),
  mockPostFindFirst: vi.fn(),
  mockPostCreate: vi.fn(),
  mockPostUpdate: vi.fn(),
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    post: {
      findUnique: mockPostFindUnique,
      findFirst: mockPostFindFirst,
      create: mockPostCreate,
      update: mockPostUpdate,
    },
  },
}))

function makeInput(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Test Post',
    content: 'Some content',
    excerpt: undefined,
    coverImage: undefined,
    category: 'technical',
    tags: 'vue,nuxt',
    status: 'DRAFT',
    ...overrides,
  } as Parameters<typeof createPostForAdmin>[0]
}

describe('resolvePublishedAt (status machine)', () => {
  const firstDate = new Date('2024-01-01T00:00:00Z')

  it('sets a date on first transition DRAFT → PUBLISHED', () => {
    expect(resolvePublishedAt('DRAFT', null, 'PUBLISHED')).toBeInstanceOf(Date)
  })

  it('preserves the first publish date on re-publish (PUBLISHED → PUBLISHED)', () => {
    expect(resolvePublishedAt('PUBLISHED', firstDate, 'PUBLISHED')).toBe(firstDate)
  })

  it('repairs a PUBLISHED row with null publishedAt', () => {
    expect(resolvePublishedAt('PUBLISHED', null, 'PUBLISHED')).toBeInstanceOf(Date)
  })

  it('sets a new date on archive → re-publish', () => {
    const result = resolvePublishedAt('ARCHIVED', null, 'PUBLISHED')
    expect(result).toBeInstanceOf(Date)
    expect(result).not.toBe(firstDate)
  })

  it('clears publishedAt for any non-PUBLISHED target', () => {
    expect(resolvePublishedAt('PUBLISHED', firstDate, 'DRAFT')).toBeNull()
    expect(resolvePublishedAt('PUBLISHED', firstDate, 'ARCHIVED')).toBeNull()
    expect(resolvePublishedAt('DRAFT', null, 'DRAFT')).toBeNull()
  })
})

describe('createPostForAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPostCreate.mockImplementation(({ data }) => ({ id: 1n, ...data }))
  })

  it('creates a DRAFT post with null publishedAt and the unified author include', async () => {
    mockPostFindUnique.mockResolvedValue(null)

    await createPostForAdmin(makeInput(), 7n)

    expect(mockPostFindUnique).toHaveBeenCalledWith({ where: { slug: 'test-post' } })
    expect(mockPostCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        authorId: 7n,
        slug: 'test-post',
        status: 'DRAFT',
        publishedAt: null,
      }),
      include: POST_AUTHOR_INCLUDE,
    }))
  })

  it('creates as PUBLISHED with a publishedAt date', async () => {
    mockPostFindUnique.mockResolvedValue(null)

    await createPostForAdmin(makeInput({ status: 'PUBLISHED' }), 7n)

    const data = mockPostCreate.mock.calls[0]?.[0]?.data
    expect(data.status).toBe('PUBLISHED')
    expect(data.publishedAt).toBeInstanceOf(Date)
  })

  it('suffixes the slug on collision', async () => {
    mockPostFindUnique.mockResolvedValue({ id: 99n, slug: 'test-post' })

    await createPostForAdmin(makeInput(), 7n)

    const slug: string = mockPostCreate.mock.calls[0]?.[0]?.data?.slug
    expect(slug).toMatch(/^test-post-\d+$/)
  })
})

describe('updatePostForAdmin', () => {
  const existing = {
    id: 1n,
    title: 'Old Title',
    slug: 'old-title',
    status: 'PUBLISHED',
    publishedAt: new Date('2024-01-01T00:00:00Z'),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockPostUpdate.mockImplementation(({ data }) => ({ id: 1n, ...data }))
  })

  it('rejects with 404 blogNotFound when the post is missing', async () => {
    mockPostFindUnique.mockResolvedValue(null)

    await expect(updatePostForAdmin(1n, makeInput())).rejects.toMatchObject({
      statusCode: 404,
      code: 'BLOG_NOT_FOUND',
    })
  })

  it('keeps slug when the title is unchanged', async () => {
    mockPostFindUnique.mockResolvedValue(existing)

    await updatePostForAdmin(1n, makeInput({ title: 'Old Title' }))

    expect(mockPostFindFirst).not.toHaveBeenCalled()
    expect(mockPostUpdate.mock.calls[0]?.[0]?.data?.slug).toBe('old-title')
  })

  it('regenerates slug on title change, excluding itself from the collision check', async () => {
    mockPostFindUnique.mockResolvedValue(existing)
    mockPostFindFirst.mockResolvedValue(null)

    await updatePostForAdmin(1n, makeInput({ title: 'New Title' }))

    expect(mockPostFindFirst).toHaveBeenCalledWith({
      where: { slug: 'new-title', NOT: { id: 1n } },
    })
    expect(mockPostUpdate.mock.calls[0]?.[0]?.data?.slug).toBe('new-title')
  })

  it('preserves first publishedAt when editing an already-published post', async () => {
    mockPostFindUnique.mockResolvedValue(existing)

    await updatePostForAdmin(1n, makeInput({ status: 'PUBLISHED' }))

    expect(mockPostUpdate.mock.calls[0]?.[0]?.data?.publishedAt).toBe(existing.publishedAt)
  })

  it('clears publishedAt when a published post is drafted', async () => {
    mockPostFindUnique.mockResolvedValue(existing)

    await updatePostForAdmin(1n, makeInput({ status: 'DRAFT' }))

    expect(mockPostUpdate.mock.calls[0]?.[0]?.data?.publishedAt).toBeNull()
  })
})

describe('setPostStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPostUpdate.mockImplementation(({ data }) => ({ id: 1n, ...data }))
  })

  it('publish button keeps the first publishedAt (no reset)', async () => {
    const firstDate = new Date('2024-01-01T00:00:00Z')
    mockPostFindUnique.mockResolvedValue({ id: 1n, status: 'PUBLISHED', publishedAt: firstDate })

    await setPostStatus(1n, 'PUBLISHED')

    expect(mockPostUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 1n },
      data: { status: 'PUBLISHED', publishedAt: firstDate },
      include: POST_AUTHOR_INCLUDE,
    }))
  })

  it('archive → re-publish sets a new date', async () => {
    mockPostFindUnique.mockResolvedValue({ id: 1n, status: 'ARCHIVED', publishedAt: null })

    await setPostStatus(1n, 'PUBLISHED')

    expect(mockPostUpdate.mock.calls[0]?.[0]?.data?.publishedAt).toBeInstanceOf(Date)
  })

  it('archive clears publishedAt', async () => {
    mockPostFindUnique.mockResolvedValue({
      id: 1n,
      status: 'PUBLISHED',
      publishedAt: new Date('2024-01-01T00:00:00Z'),
    })

    await setPostStatus(1n, 'ARCHIVED')

    expect(mockPostUpdate.mock.calls[0]?.[0]?.data).toEqual({
      status: 'ARCHIVED',
      publishedAt: null,
    })
  })

  it('rejects with 404 when the post is missing', async () => {
    mockPostFindUnique.mockResolvedValue(null)

    await expect(setPostStatus(404n, 'PUBLISHED')).rejects.toMatchObject({
      statusCode: 404,
      code: 'BLOG_NOT_FOUND',
    })
  })
})

describe('bulkSetPostStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPostUpdate.mockImplementation(({ data }) => ({ id: 1n, ...data }))
    mockPostFindUnique.mockImplementation(({ where }) =>
      where.id === 2n ? null : { id: where.id, status: 'DRAFT', publishedAt: null })
  })

  it('applies the state machine per row and skips missing ids (updateMany semantics)', async () => {
    const count = await bulkSetPostStatus([1n, 2n, 3n], 'PUBLISHED')

    expect(count).toBe(2)
    expect(mockPostUpdate).toHaveBeenCalledTimes(2)
    expect(mockPostUpdate.mock.calls[0]?.[0]?.data?.publishedAt).toBeInstanceOf(Date)
  })

  it('propagates non-not-found errors', async () => {
    mockPostUpdate.mockRejectedValue(new Error('db down'))

    await expect(bulkSetPostStatus([1n], 'PUBLISHED')).rejects.toThrow('db down')
  })
})

describe('parsePostIds', () => {
  it('returns [] for non-array input', () => {
    expect(parsePostIds(undefined)).toEqual([])
    expect(parsePostIds(null)).toEqual([])
    expect(parsePostIds('1,2')).toEqual([])
  })

  it('parses string and number ids to BigInt', () => {
    expect(parsePostIds(['1', 2, 3n])).toEqual([1n, 2n, 3n])
  })

  it('rejects malformed ids with a 400 validation error', () => {
    try {
      parsePostIds(['1', 'abc'])
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).statusCode).toBe(400)
    }
  })
})
