import { z } from 'zod'
import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'
import { handleApiError } from '~/server/utils/error-handler'

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
  const log = logger.discipline.withRequestId(event.context.requestId)
  const rawUserId = event.context.user?.id
  const userId = rawUserId ? BigInt(rawUserId) : undefined

  if (!userId) {
    throw Errors.unauthorized().toH3Error()
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
      throw Errors.disciplineNotFound().toH3Error()
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

    const normalized = disciplines.map((d: any) => ({
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
    handleApiError(error, log)
  }
})
