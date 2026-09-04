import { formatErrorContext, redactSensitiveText } from '~/lib/error-context'

/** Vendor-neutral payload accepted by an optional secondary error tracker. */
export interface SafeErrorEvent {
  error: string
  errorType: string
  stack?: string
}

export interface ErrorTrackingSink {
  captureException: (error: SafeErrorEvent, context: Record<string, unknown>) => void
}

let errorTrackingSink: ErrorTrackingSink | undefined

const SENSITIVE_CONTEXT_KEY = /password|secret|token|authorization|cookie|api[-_]?key/i

function sanitizeContextValue(value: unknown, key?: string, active: WeakSet<object> = new WeakSet()): unknown {
  if (typeof value === 'string') {
    return key && SENSITIVE_CONTEXT_KEY.test(key) ? '***' : redactSensitiveText(value)
  }
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Error) return formatErrorContext(value)
  if (value !== null && typeof value === 'object') {
    if (active.has(value)) return '[Circular]'
    active.add(value)
    const sanitized = Array.isArray(value)
      ? value.map(item => sanitizeContextValue(item, undefined, active))
      : Object.fromEntries(
          Object.entries(value).map(([entryKey, entryValue]) => [
            entryKey,
            sanitizeContextValue(entryValue, entryKey, active),
          ]),
        )
    active.delete(value)
    return sanitized
  }
  return value
}

function sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
  return sanitizeContextValue(context) as Record<string, unknown>
}

/** Configure an optional vendor adapter at application bootstrap. */
export function setErrorTrackingSink(sink: ErrorTrackingSink | undefined): void {
  errorTrackingSink = sink
}

/**
 * Report only sanitized error data; an unavailable tracker must not break the
 * request. Structured logger output remains the primary production signal.
 */
export function reportError(error: unknown, context: Record<string, unknown> = {}): void {
  if (!errorTrackingSink) return

  try {
    errorTrackingSink.captureException(formatErrorContext(error), sanitizeContext(context))
  } catch {
    // Error tracking is deliberately best-effort. Structured console logging
    // remains the primary signal when an adapter is absent or unavailable.
  }
}
