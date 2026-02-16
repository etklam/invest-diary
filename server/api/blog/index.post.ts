import prisma from '~/lib/prisma'
import { generateSlug, generateExcerpt } from '~/lib/blog'
import adminMiddleware from '~/server/middleware/admin'

export default defineEventHandler(async (event) => {
  // Check admin permission
  await adminMiddleware(event)

  const userId = BigInt(event.context.user!.id)
  const body = await readBody(event)

  if (!body.title || !body.content || !body.category) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Title, content, and category are required',
    })
  }

  const { title, content, excerpt, coverImage, category, tags, status } = body

  try {
    // Generate slug from title
    let slug = generateSlug(title)

    // Check if slug already exists, add suffix if needed
    const existingPost = await prisma.post.findUnique({
      where: { slug }
    })

    if (existingPost) {
      // Add timestamp suffix to make unique
      slug = `${slug}-${Date.now()}`
    }

    // Generate excerpt if not provided
    const finalExcerpt = excerpt || generateExcerpt(content)

    const post = await prisma.post.create({
      data: {
        authorId: userId,
        title,
        slug,
        content,
        excerpt: finalExcerpt,
        coverImage: coverImage || null,
        category,
        tags: tags || null,
        status: status || 'DRAFT',
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
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

    console.log('[Blog] Post created:', post.id, 'by user:', userId)
    return post
  } catch (error) {
    console.error('[Blog] Error creating post:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create post',
    })
  }
})
