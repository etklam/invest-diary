import { ZodError } from 'zod'
import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import { generateSlug } from '~/lib/blog'
import adminMiddleware from '~/server/middleware/admin'
import { AppError, Errors } from '~/lib/errors/factory'
import { blogPostInputSchema, resolveExcerpt } from '~/server/utils/blog-schemas'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { serializeBlogPost } from '~/server/utils/blog-response'

export default defineEventHandler(async (event) => {
  await adminMiddleware(event)

  const postId = parsePositiveBigIntParam(event, 'id')

  try {
    const body = await readBody(event)
    const input = blogPostInputSchema.parse(body)

    // Check if post exists
    const existingPost = await prisma.post.findUnique({
      where: { id: postId }
    })

    if (!existingPost) {
      throw Errors.blogNotFound(postId.toString())
    }

    // Update slug only if title changed
    let slug = existingPost.slug
    if (input.title !== existingPost.title) {
      slug = generateSlug(input.title)

      // Check if new slug already exists (and it's not this post)
      const slugExists = await prisma.post.findFirst({
        where: {
          slug,
          NOT: { id: postId }
        }
      })

      if (slugExists) {
        slug = `${slug}-${Date.now()}`
      }
    }

    const finalExcerpt = resolveExcerpt(input)

    // If status is being changed to PUBLISHED and it wasn't before, set publishedAt
    let publishedAt = existingPost.publishedAt
    if (input.status === 'PUBLISHED' && existingPost.status !== 'PUBLISHED') {
      publishedAt = new Date()
    } else if (input.status !== 'PUBLISHED') {
      publishedAt = null
    }

    const post = await prisma.post.update({
      where: { id: postId },
      data: {
        title: input.title,
        slug,
        content: input.content,
        excerpt: finalExcerpt,
        coverImage: input.coverImage || null,
        category: input.category,
        tags: input.tags || null,
        status: input.status,
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

    logger.blog.info('Post updated', { postId: post.id.toString() })
    return serializeBlogPost(post)
  } catch (error) {
    if (error instanceof AppError) {
      throw error.toH3Error()
    }
    if (error instanceof ZodError) {
      throw Errors.validationError(
        error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }))
      ).toH3Error()
    }
    logger.blog.error('Error updating post', { error })
    throw Errors.internalError(error).toH3Error()
  }
})
