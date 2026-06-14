import { z } from 'zod'
import { requireUser } from '~/server/utils/auth'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'
import { handleApiError } from '~/server/utils/error-handler'
import { exportDisciplinesRaw } from '~/server/utils/discipline-queries'
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
  const log = logger.discipline.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)

    const query = getQuery(event)
    const { title, description, includeAuthor } = schema.parse(query)

    // Fetch raw disciplines via query layer
    const disciplines = await exportDisciplinesRaw(BigInt(user.id))

    if (disciplines.length === 0) {
      throw Errors.disciplineNotFound().toH3Error()
    }

    // Get user info if author should be included
    let author: string | undefined = undefined
    if (includeAuthor) {
      const userRow = await prisma.user.findUnique({
        where: { id: BigInt(user.id) },
        select: { name: true }
      })
      author = userRow?.name || 'Anonymous'
    }

    // Build share data — DisciplineItem only carries content and order,
    // so raw Prisma rows can be passed through without id/createdAt adapter.
    const { exportDisciplines, shareDataToJSON } = await import('~/lib/disciplineShare')

    const shareData = exportDisciplines(disciplines, {
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
