import type { H3Event } from 'h3'
import prisma from '~/lib/prisma'
import { PostStatus } from '@prisma/client'

const resolveSlug = (event: H3Event) => {
  const rawFromParams = event.context.params?.slug
  const rawFromRouter = getRouterParam(event, 'slug')
  const rawFromPath = event.path?.split('/').filter(Boolean).pop()

  const rawSlug = rawFromParams ?? rawFromRouter ?? rawFromPath
  return rawSlug ? decodeURIComponent(String(rawSlug)) : undefined
}

export default defineEventHandler(async (event: H3Event) => {
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

    return post
  } catch (error: any) {
    console.error('[Blog] Error fetching post:', error)

    if (error?.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch post',
    })
  }
})
