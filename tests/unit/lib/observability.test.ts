import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  reportError,
  setErrorTrackingSink,
} from '~/lib/observability'

describe('error tracking seam', () => {
  afterEach(() => {
    setErrorTrackingSink(undefined)
  })

  it('passes sanitized error context to an optional sink', () => {
    const sink = { captureException: vi.fn() }
    setErrorTrackingSink(sink)

    reportError(new Error('failed with PASSWORD=do-not-send'), {
      operation: 'test_operation',
      resourceId: '42',
    })

    expect(sink.captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'failed with PASSWORD=***',
        errorType: 'Error',
        stack: expect.any(String),
      }),
      { operation: 'test_operation', resourceId: '42' },
    )
  })

  it('redacts credentials and serializes BigInt in sink context', () => {
    const sink = { captureException: vi.fn() }
    setErrorTrackingSink(sink)

    reportError(new Error('failure'), {
      operation: 'test_operation',
      userId: 42n,
      password: 'do-not-send',
      nested: { token: 'also-do-not-send' },
    })

    expect(sink.captureException).toHaveBeenCalledWith(
      expect.anything(),
      {
        operation: 'test_operation',
        userId: '42',
        password: '***',
        nested: { token: '***' },
      },
    )
  })

  it('does not let an absent or failing sink break application code', () => {
    expect(() => reportError(new Error('no sink'))).not.toThrow()

    setErrorTrackingSink({
      captureException: () => { throw new Error('tracker unavailable') },
    })
    expect(() => reportError(new Error('request failed'))).not.toThrow()
  })

  it('sanitizes cyclic context without recursing forever', () => {
    const sink = { captureException: vi.fn() }
    setErrorTrackingSink(sink)
    const context: Record<string, unknown> = { operation: 'cycle-test' }
    context.self = context

    expect(() => reportError(new Error('cycle'), context)).not.toThrow()
    expect(sink.captureException).toHaveBeenCalledWith(
      expect.anything(),
      { operation: 'cycle-test', self: '[Circular]' },
    )
  })
})
