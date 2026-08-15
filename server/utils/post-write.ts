import prisma from '~/lib/prisma'
import { generateSlug } from '~/lib/blog'
import { AppError, Errors } from '~/lib/errors/factory'
import { ErrorCodes } from '~/lib/errors/codes'
import { resolveExcerpt, type BlogPostInput } from '~/server/utils/blog-schemas'

export type PostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

/** Unified author include — the single definition for admin write responses. */
export const POST_AUTHOR_INCLUDE = {
  author: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const

/**
 * `publishedAt` state machine (single source of truth for all write paths):
 *
 * - non-PUBLISHED target → null
 * - already PUBLISHED → keep first publish date (re-publish never resets)
 * - DRAFT/ARCHIVED → PUBLISHED → new date (archive→re-publish = fresh date)
 *
 * For creation pass `currentStatus = 'DRAFT'`, `currentPublishedAt = null`.
 */
export function resolvePublishedAt(
  currentStatus: PostStatus,
  currentPublishedAt: Date | null,
  nextStatus: PostStatus,
): Date | null {
  if (nextStatus !== 'PUBLISHED') return null
  if (currentStatus === 'PUBLISHED' && currentPublishedAt) return currentPublishedAt
  return new Date()
}

/**
 * Generate a slug from `title`, suffixing `Date.now()` on collision.
 * `excludeId` lets updates keep their own slug (PUT semantics).
 */
async function uniqueSlugFor(title: string, excludeId?: bigint): Promise<string> {
  const slug = generateSlug(title)
  const clash = excludeId === undefined
    ? await prisma.post.findUnique({ where: { slug } })
    : await prisma.post.findFirst({ where: { slug, NOT: { id: excludeId } } })
  return clash ? `${slug}-${Date.now()}` : slug
}

export async function createPostForAdmin(input: BlogPostInput, authorId: bigint) {
  const post = await prisma.post.create({
    data: {
      authorId,
      title: input.title,
      slug: await uniqueSlugFor(input.title),
      content: input.content,
      excerpt: resolveExcerpt(input),
      coverImage: input.coverImage || null,
      category: input.category,
      tags: input.tags || null,
      status: input.status,
      publishedAt: resolvePublishedAt('DRAFT', null, input.status),
    },
    include: POST_AUTHOR_INCLUDE,
  })
  return post
}

export async function updatePostForAdmin(postId: bigint, input: BlogPostInput) {
  const existing = await prisma.post.findUnique({ where: { id: postId } })
  if (!existing) {
    throw Errors.blogNotFound(postId.toString())
  }

  // Regenerate slug only when the title changed; exclude self from collision check
  const slug = input.title !== existing.title
    ? await uniqueSlugFor(input.title, postId)
    : existing.slug

  return await prisma.post.update({
    where: { id: postId },
    data: {
      title: input.title,
      slug,
      content: input.content,
      excerpt: resolveExcerpt(input),
      coverImage: input.coverImage || null,
      category: input.category,
      tags: input.tags || null,
      status: input.status,
      publishedAt: resolvePublishedAt(existing.status, existing.publishedAt, input.status),
    },
    include: POST_AUTHOR_INCLUDE,
  })
}

/**
 * Transition a post to `status`, applying the publishedAt state machine.
 * Covers publish / archive buttons and bulk operations.
 */
export async function setPostStatus(postId: bigint, status: PostStatus) {
  const existing = await prisma.post.findUnique({ where: { id: postId } })
  if (!existing) {
    throw Errors.blogNotFound(postId.toString())
  }

  return await prisma.post.update({
    where: { id: postId },
    data: {
      status,
      publishedAt: resolvePublishedAt(existing.status, existing.publishedAt, status),
    },
    include: POST_AUTHOR_INCLUDE,
  })
}

/**
 * Bulk status transition. Like updateMany, non-existent ids are skipped
 * (counted out) — but each existing row goes through setPostStatus so the
 * publishedAt invariant holds per-row.
 */
export async function bulkSetPostStatus(postIds: bigint[], status: PostStatus): Promise<number> {
  let count = 0
  for (const id of postIds) {
    try {
      await setPostStatus(id, status)
      count++
    } catch (error) {
      if (!(error instanceof AppError && error.code === ErrorCodes.BLOG_NOT_FOUND)) throw error
    }
  }
  return count
}

/** Validate raw JSON post ids into BigInt. Non-array input → []. */
export function parsePostIds(value: unknown): bigint[] {
  if (!Array.isArray(value)) return []
  return value.map((id, index) => {
    const normalized = typeof id === 'string' || typeof id === 'number' || typeof id === 'bigint'
      ? String(id)
      : ''
    if (!/^[1-9]\d*$/.test(normalized)) {
      throw Errors.validationError([{
        field: `ids.${index}`,
        message: `Post id must be a positive integer (got ${normalized})`,
      }])
    }
    return BigInt(normalized)
  })
}
