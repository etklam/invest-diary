import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import { generateSlug } from '~/lib/blog'
import { ZodError } from 'zod'
import adminMiddleware from '~/server/middleware/admin'
import { AppError, Errors } from '~/lib/errors/factory'
import { blogPostInputSchema, resolveExcerpt } from '~/server/utils/blog-schemas'
import { serializeBlogPost } from '~/server/utils/blog-response'

export default defineEventHandler(async (event) => {
  await adminMiddleware(event)

  const userId = BigInt(event.context.user!.id)

  try {
    const body = await readBody(event)
    const input = blogPostInputSchema.parse(body)

    // Generate slug from title
    let slug = generateSlug(input.title)

    // Check if slug already exists, add suffix if needed
    const existingPost = await prisma.post.findUnique({
      where: { slug }
    })

    if (existingPost) {
      // Add timestamp suffix to make unique
      slug = `${slug}-${Date.now()}`
    }

    const finalExcerpt = resolveExcerpt(input)

    const post = await prisma.post.create({
      data: {
        authorId: userId,
        title: input.title,
        slug,
        content: input.content,
        excerpt: finalExcerpt,
        coverImage: input.coverImage || null,
        category: input.category,
        tags: input.tags || null,
        status: input.status,
        publishedAt: input.status === 'PUBLISHED' ? new Date() : null,
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

    logger.blog.info('Post created', { postId: post.id.toString(), userId: userId.toString() })
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
    logger.blog.error('Error creating post', { error })
    throw Errors.internalError(error).toH3Error()
  }
})
