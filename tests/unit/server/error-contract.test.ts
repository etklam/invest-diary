import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Errors } from '~/lib/errors/factory'
import { handleApiError } from '~/server/utils/error-handler'

describe('server error contract', () => {
  let errorHook: (error: any, context: { event: any }) => void

  beforeEach(async () => {
    vi.resetModules()
    vi.stubGlobal('defineNitroPlugin', (plugin: any) => plugin)

    const plugin = (await import('~/server/plugins/error-contract')).default
    plugin({
      hooks: {
        hook: (_name: string, callback: typeof errorHook) => {
          errorHook = callback
          return () => {}
        },
      },
    } as any)
  })

  const applyRequestId = (error: any, requestId: string) => {
    errorHook(error, { event: { context: { requestId } } })
    return error
  }

  const fromHandleApiError = (error: unknown) => {
    try {
      handleApiError(error)
    } catch (thrown) {
      return thrown
    }
    throw new Error('handleApiError did not throw')
  }

  it.each([
    {
      name: '400 validation handler throw',
      requestId: 'req-400',
      error: Errors.validationError([{ field: 'email', message: 'Invalid email' }]).toH3Error(),
      expected: {
        statusCode: 400,
        statusMessage: 'Validation failed',
        code: 'SYS_VALIDATION_ERROR',
        details: [{ field: 'email', message: 'Invalid email' }],
      },
    },
    {
      name: '401 middleware throw',
      requestId: 'req-401',
      error: Errors.unauthorized().toH3Error(),
      expected: {
        statusCode: 401,
        statusMessage: 'Authentication required',
        code: 'AUTH_UNAUTHORIZED',
        details: null,
      },
    },
    {
      name: '404 handler throw',
      requestId: 'req-404',
      error: Errors.notFound('Widget not found').toH3Error(),
      expected: {
        statusCode: 404,
        statusMessage: 'Widget not found',
        code: 'SYS_NOT_FOUND',
        details: null,
      },
    },
    {
      name: '409 handleApiError',
      requestId: 'req-409',
      error: fromHandleApiError(Errors.diaryAlreadyExists('2026-08-30')),
      expected: {
        statusCode: 409,
        statusMessage: 'Diary already exists for 2026-08-30',
        code: 'DIARY_ALREADY_EXISTS',
        details: null,
      },
    },
    {
      name: '500 handleApiError',
      requestId: 'req-500',
      error: fromHandleApiError(new Error('database unavailable')),
      expected: {
        statusCode: 500,
        statusMessage: 'Internal server error',
        code: 'SYS_INTERNAL_ERROR',
        details: null,
      },
    },
  ])('$name preserves the H3 wire shape and adds requestId', ({ error, requestId, expected }) => {
    const result = applyRequestId(error, requestId)

    expect({
      statusCode: result.statusCode,
      statusMessage: result.statusMessage,
      data: {
        code: result.data.code,
        details: result.data.details,
        requestId: result.data.requestId,
      },
    }).toEqual({
      statusCode: expected.statusCode,
      statusMessage: expected.statusMessage,
      data: {
        code: expected.code,
        details: expected.details,
        requestId,
      },
    })
  })

  it('preserves existing error data while injecting requestId', () => {
    const error = Errors.validationError([{ field: 'title', message: 'Required' }]).toH3Error()

    applyRequestId(error, 'req-preserve-data')

    expect(error.data).toEqual({
      code: 'SYS_VALIDATION_ERROR',
      details: [{ field: 'title', message: 'Required' }],
      requestId: 'req-preserve-data',
    })
  })
})
