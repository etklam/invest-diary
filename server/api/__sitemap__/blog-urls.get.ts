import prisma from '~/lib/prisma'

export default defineEventHandler(async () => {
  try {
    const posts = await prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { not: null }
      },
      select: {
        slug: true,
        updatedAt: true
      }
    })

    return posts.map(post => ({
      loc: `/articles/${post.slug}`,
      changefreq: 'weekly',
      priority: 0.8,
      lastmod: post.updatedAt.toISOString()
    }))
  } catch {
    return []
  }
})
