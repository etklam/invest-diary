import { z } from 'zod'
import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'
import { handleApiError } from '~/server/utils/error-handler'

const schema = z.object({
  json: z.string(),
  replaceExisting: z.boolean().optional().default(false)
})

export default defineEventHandler(async (event) => {
  const log = logger.discipline.withRequestId(event.context.requestId)
  const userId = event.context.user?.id

  if (!userId) {
    throw Errors.unauthorized().toH3Error()
  }

  try {
    const body = await readBody(event)
    const { json, replaceExisting } = schema.parse(body)

    // Parse and validate import data
    const { parseShareData } = await import('~/lib/disciplineShare')
    const preview = parseShareData(json)

    if (!preview.isValid) {
      throw Errors.validationError([{ field: 'json', message: 'Invalid import data' }]).toH3Error()
    }

    if (preview.disciplines.length === 0) {
      throw Errors.validationError([{ field: 'json', message: 'No valid disciplines to import' }]).toH3Error()
    }

    // If replace existing, delete all user's disciplines first
    if (replaceExisting) {
      await prisma.discipline.deleteMany({
        where: { userId: BigInt(userId) }
      })
    }

    // Get current max order
    const maxOrder = await prisma.discipline.findFirst({
      where: { userId: BigInt(userId) },
      orderBy: { order: 'desc' },
      select: { order: true }
    })

    const startOrder = replaceExisting ? 0 : (maxOrder?.order ?? -1) + 1

    // Import disciplines
    const imported = await prisma.discipline.createMany({
      data: preview.disciplines.map((d, index) => ({
        userId: BigInt(userId),
        content: d.content,
        order: startOrder + index
      }))
    })

    return {
      success: true,
      imported: imported.count,
      message: `Successfully imported ${imported.count} disciplines`
    }
  } catch (error: any) {
    handleApiError(error, log)
  }
})
