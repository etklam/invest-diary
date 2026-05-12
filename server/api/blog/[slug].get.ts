import type { H3Event } from 'h3'
import prisma from '~/lib/prisma'
import { PostStatus } from '@prisma/client'
import { logger } from '~/lib/logger'
import { serializeBlogPost } from '~/server/utils/blog-response'
import { Errors } from '~/lib/errors/factory'

const resolveSlug = (event: H3Event) => {
  const rawFromParams = event.context.params?.slug
  const rawFromRouter = getRouterParam(event, 'slug')
  const rawFromPath = event.path?.split('/').filter(Boolean).pop()

  const rawSlug = rawFromParams ?? rawFromRouter ?? rawFromPath
  return rawSlug ? decodeURIComponent(String(rawSlug)) : undefined
}

export default defineEventHandler(async (event: H3Event) => {
  const log = logger.blog.withRequestId(event.context.requestId)
  const slug = resolveSlug(event)

  if (!slug) {
    throw Errors.validationError([{ field: 'slug', message: 'Slug is required' }]).toH3Error()
  }

  try {
    const query = getQuery(event)
    const view = (query.view as string) ?? 'full'
    log.info('Fetching blog post', { slug, view })

    const baseWhere = {
      slug,
      status: PostStatus.PUBLISHED,
      publishedAt: { not: null },
    }

    const post = view === 'meta'
      ? await prisma.post.findFirst({
          where: baseWhere,
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            coverImage: true,
            publishedAt: true,
          },
        })
      : await prisma.post.findFirst({
          where: baseWhere,
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        })

    if (!post) {
      throw Errors.blogNotFound(slug).toH3Error()
    }

    return serializeBlogPost(post)
  } catch (error: any) {
    if (error?.statusCode) {
      throw error
    }

    log.error('Error fetching post', { slug, error: String(error) })

    throw Errors.internalError(error).toH3Error()
  }
})
