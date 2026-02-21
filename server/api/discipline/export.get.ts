import { z } from 'zod'
import prisma from '~/lib/prisma'

const schema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  // query string 進來一定是 string，需要轉成 boolean
  includeAuthor: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === 'true')
})

export default defineEventHandler(async (event) => {
  const rawUserId = event.context.user?.id
  const userId = rawUserId ? BigInt(rawUserId) : undefined

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  try {
    const query = getQuery(event)
    const { title, description, includeAuthor } = schema.parse(query)

    // Fetch user's disciplines
    const disciplines = await prisma.discipline.findMany({
      where: { userId },
      orderBy: { order: 'asc' }
    })

    if (disciplines.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'No disciplines found'
      })
    }

    // Get user info if author should be included
    let author: string | undefined = undefined
    if (includeAuthor) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true }
      })
      author = user?.name || 'Anonymous'
    }

    // Export data
    const { exportDisciplines, shareDataToJSON } = await import('~/lib/disciplineShare')

    const normalized = disciplines.map(d => ({
      ...d,
      id: Number(d.id),
      userId: Number(d.userId),
      createdAt: d.createdAt.toISOString()
    }))

    const shareData = exportDisciplines(normalized, {
      author,
      title: title as string | undefined,
      description: description as string | undefined
    })

    return {
      success: true,
      data: shareData,
      json: shareDataToJSON(shareData)
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const first = error.issues?.[0]
      throw createError({
        statusCode: 400,
        statusMessage: first?.message || 'Invalid query parameters'
      })
    }
    throw error
  }
})
