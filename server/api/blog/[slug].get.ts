import type { H3Event } from 'h3'
import prisma from '~/lib/prisma'
import { PostStatus } from '@prisma/client'
import { logger } from '~/lib/logger'
import { serialize } from '~/server/utils/serialize'
import { Errors } from '~/lib/errors/factory'
import { handleApiError } from '~/server/utils/error-handler'

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
              // Public endpoint — never expose author email (the query layer
              // gates it behind includeEmail for admin paths only).
              select: {
                id: true,
                name: true,
              },
            },
          },
        })

    if (!post) {
      throw Errors.blogNotFound(slug).toH3Error()
    }

    setHeader(event, 'Cache-Control', 'no-store')
    return serialize(post)
  } catch (error) {
    setHeader(event, 'Cache-Control', 'no-store')
    handleApiError(error, log)
  }
})
