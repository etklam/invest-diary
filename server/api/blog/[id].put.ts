import prisma from '~/lib/prisma'
import { generateSlug, generateExcerpt } from '~/lib/blog'
import adminMiddleware from '~/server/middleware/admin'

export default defineEventHandler(async (event) => {
  // Check admin permission
  await adminMiddleware(event)

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID is required',
    })
  }

  if (!body.title || !body.content || !body.category) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Title, content, and category are required',
    })
  }

  const { title, content, excerpt, coverImage, category, tags, status } = body

  try {
    // Check if post exists
    const existingPost = await prisma.post.findUnique({
      where: { id: BigInt(id) }
    })

    if (!existingPost) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Post not found',
      })
    }

    // Update slug only if title changed
    let slug = existingPost.slug
    if (title !== existingPost.title) {
      slug = generateSlug(title)

      // Check if new slug already exists (and it's not this post)
      const slugExists = await prisma.post.findFirst({
        where: {
          slug,
          NOT: { id: BigInt(id) }
        }
      })

      if (slugExists) {
        slug = `${slug}-${Date.now()}`
      }
    }

    // Generate excerpt if not provided
    const finalExcerpt = excerpt || generateExcerpt(content)

    // If status is being changed to PUBLISHED and it wasn't before, set publishedAt
    let publishedAt = existingPost.publishedAt
    if (status === 'PUBLISHED' && existingPost.status !== 'PUBLISHED') {
      publishedAt = new Date()
    } else if (status !== 'PUBLISHED') {
      publishedAt = null
    }

    const post = await prisma.post.update({
      where: { id: BigInt(id) },
      data: {
        title,
        slug,
        content,
        excerpt: finalExcerpt,
        coverImage: coverImage || null,
        category,
        tags: tags || null,
        status,
        publishedAt,
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

    console.log('[Blog] Post updated:', post.id)
    return post
  } catch (error) {
    console.error('[Blog] Error updating post:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update post',
    })
  }
})
