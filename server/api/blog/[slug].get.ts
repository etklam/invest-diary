import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  // ✅ 極度保險的 slug 解析：依序嘗試 params / routerParam / URL path
  const rawFromParams = (event.context as any)?.params?.slug
  const rawFromRouter = getRouterParam(event, 'slug')
  const rawFromPath = event.path?.split('/').filter(Boolean).pop()

  const rawSlug = rawFromParams ?? rawFromRouter ?? rawFromPath
  const slug = rawSlug ? decodeURIComponent(String(rawSlug)) : undefined

  console.log('[Blog API] slug sources =', {
    rawFromParams,
    rawFromRouter,
    rawFromPath,
    finalSlug: slug,
  })

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Slug is required',
    })
  }

  try {
    const post = await prisma.post.findFirst({
      where: {
        slug,
        status: 'PUBLISHED',
        publishedAt: {
          not: null
        }
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
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
