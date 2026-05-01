import { z } from 'zod'
import { AppError, Errors } from '~/lib/errors/factory'

export function handleApiError(error: unknown, log?: { warn: Function; error: Function }): never {
  if (error instanceof z.ZodError) {
    if (log) log.warn('Validation failed', { issues: error.issues })
    throw Errors.validationError(
      error.issues.map(i => ({ field: i.path.join('.'), message: i.message }))
    ).toH3Error()
  }
  if (error instanceof AppError) {
    if (log) log.warn(error.message, { code: error.code })
    throw error.toH3Error()
  }
  if (error && typeof error === 'object' && 'statusCode' in error) {
    throw error
  }
  if (log) log.error('Unexpected error', { error: String(error) })
  throw Errors.internalError(error).toH3Error()
}
