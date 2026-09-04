/**
 * Guards for integration/E2E databases.
 *
 * Test suites that can mutate data must opt into an explicitly disposable
 * database name and a loopback connection. A generic `test` database is not
 * considered safe: it is too easy to point it at a developer or production
 * instance by accident.
 */

export const LOOPBACK_DATABASE_HOSTS = new Set(['127.0.0.1', 'localhost', '::1'])

export interface DisposableDatabaseGuardOptions {
  /** Exact database name required by the suite. */
  databaseName?: string
  /** Prefix accepted when each run creates a unique database. */
  databasePrefix?: string
}

export function getDatabaseName(databaseUrl: string): string {
  const parsed = new URL(databaseUrl)
  return decodeURIComponent(parsed.pathname.replace(/^\//, ''))
}

/**
 * Validate a test database URL and return its parsed URL.
 *
 * This function deliberately rejects all non-loopback hosts and requires an
 * exact name or an explicit disposable prefix. Keep this guard next to test
 * entry points; do not reuse it as a production database validator.
 */
export function assertDisposableDatabaseUrl(
  databaseUrl: string,
  options: DisposableDatabaseGuardOptions,
): URL {
  if (options.databaseName === undefined && options.databasePrefix === undefined) {
    throw new Error('Refusing test database: an exact database name or disposable prefix is required')
  }

  let parsed: URL
  try {
    parsed = new URL(databaseUrl)
  }
  catch {
    throw new Error('Refusing test database: DATABASE_URL is not a valid URL')
  }

  if (parsed.protocol !== 'mysql:' && parsed.protocol !== 'mariadb:') {
    throw new Error(`Refusing test database: unsupported protocol ${parsed.protocol}`)
  }

  if (!LOOPBACK_DATABASE_HOSTS.has(parsed.hostname)) {
    throw new Error(`Refusing test database outside loopback host: ${parsed.hostname}`)
  }

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''))
  if (!databaseName) {
    throw new Error('Refusing test database: database name is required')
  }

  const exactNameMatches = options.databaseName === undefined || databaseName === options.databaseName
  const prefixMatches = options.databasePrefix !== undefined && databaseName.startsWith(options.databasePrefix)
  if (!exactNameMatches && !prefixMatches) {
    const expected = [options.databaseName, options.databasePrefix && `${options.databasePrefix}*`]
      .filter(Boolean)
      .join(' or ')
    throw new Error(`Refusing test database ${databaseName}; expected ${expected}`)
  }

  return parsed
}
