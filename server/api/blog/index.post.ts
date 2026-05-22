import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import { generateSlug } from '~/lib/blog'
import adminMiddleware from '~/server/middleware/admin'
import { handleApiError } from '~/server/utils/error-handler'
import { blogPostInputSchema, resolveExcerpt } from '~/server/utils/blog-schemas'
import { serializeBlogPost } from '~/server/utils/blog-response'

export default defineEventHandler(async (event) => {
  await adminMiddleware(event)

  const log = logger.blog.withRequestId(event.context.requestId)
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

    log.info('Post created', { postId: String(post.id), userId: String(userId) })
    return serializeBlogPost(post)
  } catch (error) {
    handleApiError(error, log)
  }
})
