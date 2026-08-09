import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { createError, H3Error } from 'h3'
import { handleApiError } from '~/server/utils/error-handler'
import { Errors } from '~/lib/errors/factory'

describe('server/utils/error-handler — handleApiError', () => {
  // Helper: catch the thrown value so we can assert on its shape.
  const run = (error: unknown) => {
    try {
      handleApiError(error)
    } catch (e) {
      return e
    }
    throw new Error('handleApiError did not throw')
  }

  // ── ZodError → 400 with field-level details ──

  it('converts ZodError into a 400 validation error with field details', () => {
    const schema = z.object({
      email: z.string().email(),
      age: z.number().int().positive(),
    })
    const result = schema.safeParse({ email: 'not-email', age: -1 })
    if (!result.success) {
      const thrown = run(result.error) as H3Error
      expect(thrown.statusCode).toBe(400)
      expect(thrown.statusMessage).toBe('Validation failed')
      const data = thrown.data as { code: string; details: Array<{ field: string; message: string }> }
      expect(data.code).toBe('SYS_VALIDATION_ERROR')
      expect(data.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'email' }),
          expect.objectContaining({ field: 'age' }),
        ])
      )
    } else {
      throw new Error('fixture should have failed validation')
    }
  })

  it('passes the log callback the issues for ZodError path', () => {
    const schema = z.object({ x: z.number() })
    const result = schema.safeParse({ x: 'bad' })
    if (!result.success) {
      const log = { warn: vi.fn(), error: vi.fn() }
      expect(() => handleApiError(result.error, log)).toThrow()
      expect(log.warn).toHaveBeenCalledWith('Validation failed', expect.objectContaining({ issues: result.error.issues }))
      expect(log.error).not.toHaveBeenCalled()
    }
  })

  // ── AppError → toH3Error() with its own status ──

  it('passes AppError through toH3Error preserving statusCode and code', () => {
    const thrown = run(Errors.notFound('widget')) as H3Error
    expect(thrown.statusCode).toBe(404)
    expect(thrown.statusMessage).toBe('widget')
    expect((thrown.data as { code: string }).code).toBe('SYS_NOT_FOUND')
  })

  it('maps Errors.forbidden() to 403', () => {
    const thrown = run(Errors.forbidden()) as H3Error
    expect(thrown.statusCode).toBe(403)
  })

  it('maps Errors.unauthorized() to 401', () => {
    const thrown = run(Errors.unauthorized()) as H3Error
    expect(thrown.statusCode).toBe(401)
  })

  it('maps Errors.rateLimited() to 429', () => {
    const thrown = run(Errors.rateLimited(30)) as H3Error
    expect(thrown.statusCode).toBe(429)
  })

  it('passes AppError.code through to the H3 data', () => {
    const thrown = run(Errors.csrfFailed()) as H3Error
    expect(thrown.statusCode).toBe(403)
    expect((thrown.data as { code: string }).code).toBe('CSRF_FAILED')
  })

  it('logs AppError with code at warn level', () => {
    const log = { warn: vi.fn(), error: vi.fn() }
    expect(() => handleApiError(Errors.etfNotFound('SPY'), log)).toThrow()
    expect(log.warn).toHaveBeenCalledWith('ETF SPY not found', { code: 'ETF_NOT_FOUND' })
    expect(log.error).not.toHaveBeenCalled()
  })

  // ── H3Error with statusCode → pass-through, status preserved ──

  it('passes H3Error through unchanged (no re-wrapping)', () => {
    const original = createError({ statusCode: 418, statusMessage: "I'm a teapot" })
    const thrown = run(original)
    expect(thrown).toBe(original) // same reference — pass-through
  })

  it('passes a thrown error with statusCode property through without re-wrapping', () => {
    const custom = Object.assign(new Error('gateway down'), { statusCode: 502 })
    const thrown = run(custom)
    expect(thrown).toBe(custom)
  })

  // ── Unknown errors → 500 internalError ──

  it('wraps unknown Error as 500 internalError', () => {
    const thrown = run(new Error('boom')) as H3Error
    expect(thrown.statusCode).toBe(500)
    expect(thrown.statusMessage).toBe('Internal server error')
    expect((thrown.data as { code: string }).code).toBe('SYS_INTERNAL_ERROR')
  })

  it('wraps non-Error throws (string) as 500', () => {
    const thrown = run('just a string') as H3Error
    expect(thrown.statusCode).toBe(500)
  })

  it('logs unknown errors at error level', () => {
    const log = { warn: vi.fn(), error: vi.fn() }
    expect(() => handleApiError(new Error('boom'), log)).toThrow()
    expect(log.error).toHaveBeenCalledWith('Unexpected error', expect.objectContaining({ error: expect.any(String) }))
    expect(log.warn).not.toHaveBeenCalled()
  })

  it('tolerates missing log argument (no crash)', () => {
    expect(() => handleApiError(new Error('boom'))).toThrow()
  })

  // ── Contract: never returns ──

  it('always throws (return type is never)', () => {
    // If any branch accidentally returned, this would not throw and the test would fail.
    expect(() => handleApiError(new Error('x'))).toThrow()
    expect(() => handleApiError(Errors.notFound())).toThrow()
    expect(() => handleApiError(createError({ statusCode: 400, statusMessage: 'x' }))).toThrow()
  })
})
