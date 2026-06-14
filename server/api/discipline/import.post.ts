import { defineEventHandler } from 'h3'
import { requireUser } from '~/server/utils/auth'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'
import { handleApiError } from '~/server/utils/error-handler'
import { importDisciplines } from '~/server/utils/discipline-queries'

export default defineEventHandler(async (event) => {
  const log = logger.discipline.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)

    const body = await readBody<{ json?: string; replaceExisting?: boolean }>(event)

    if (!body?.json || typeof body.json !== 'string') {
      throw Errors.validationError([{ field: 'json', message: 'json string is required' }]).toH3Error()
    }

    // Parse and validate import data via the existing share lib
    const { parseShareData } = await import('~/lib/disciplineShare')
    const preview = parseShareData(body.json)

    if (!preview.isValid) {
      throw Errors.validationError([{ field: 'json', message: 'Invalid import data' }]).toH3Error()
    }

    if (preview.disciplines.length === 0) {
      throw Errors.validationError([{ field: 'json', message: 'No valid disciplines to import' }]).toH3Error()
    }

    // Delegate to query layer for DB operations
    const result = await importDisciplines(BigInt(user.id), {
      disciplines: preview.disciplines,
      replaceExisting: body.replaceExisting ?? false,
    })

    log.info('Disciplines imported', { count: result.count, userId: String(user.id) })

    return {
      success: true,
      imported: result.count,
      message: `Successfully imported ${result.count} disciplines`
    }
  } catch (error: any) {
    handleApiError(error, log)
  }
})
