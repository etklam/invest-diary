import type { H3Event } from 'h3'
import prisma from '~/lib/prisma'
import { PostStatus } from '@prisma/client'
import { logger } from '~/lib/logger'
import { serializeBlogPost } from '~/server/utils/blog-response'

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
    throw createError({
      statusCode: 400,
      statusMessage: 'Slug is required',
    })
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
      throw createError({
        statusCode: 404,
        statusMessage: 'Post not found',
      })
    }

    return serializeBlogPost(post)
  } catch (error: any) {
    if (error?.statusCode) {
      throw error
    }

    log.error('Error fetching post', { slug, error: String(error) })

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch post',
    })
  }
})
