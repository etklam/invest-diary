/** Remove credentials accidentally embedded in an upstream error message. */
export function redactSensitiveText(value: string): string {
  return value
    .replace(/((?:mysql|mariadb):\/\/[^\s:@/]+:)[^\s@]+(@)/gi, '$1***$2')
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, '$1***')
    .replace(/((?:"|')?(?:password|secret|token|authorization|cookie|api[-_]?key)(?:"|')?\s*:\s*["'])[^"']*(["'])/gi, '$1***$2')
    .replace(/((?:JWT_SECRET|DATABASE_URL|API_KEY|PASSWORD|SECRET|TOKEN|AUTHORIZATION|COOKIE)\s*[:=]\s*)[^\s,;]+/gi, '$1***')
}

/** Convert unknown thrown values into a safe, structured logging context. */
export function formatErrorContext(error: unknown): {
  error: string
  errorType: string
  stack?: string
} {
  if (error instanceof Error) {
    return {
      error: redactSensitiveText(error.message || error.name),
      errorType: error.name || 'Error',
      ...(error.stack ? { stack: redactSensitiveText(error.stack) } : {}),
    }
  }

  let message: string
  if (typeof error === 'string') {
    message = error
  } else {
    try {
      const serialized = JSON.stringify(error)
      message = serialized === undefined ? String(error) : serialized
    } catch {
      message = String(error)
    }
  }

  return {
    error: redactSensitiveText(message),
    errorType: error === null ? 'null' : typeof error,
  }
}
