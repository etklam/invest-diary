import { z } from 'zod'

/**
 * Runtime configuration is the single place where server environment variables
 * are read and converted into typed values. Keep this module free of Nitro
 * request context so it can also be used by batch entry points and tests.
 */

export const JWT_PLACEHOLDER_SECRET = 'CHANGE_THIS_RANDOM_SECRET'
export const TEST_DATABASE_URL = 'mysql://root:password@localhost:3306/test'
export const TEST_JWT_SECRET = 'test-only-jwt-secret-that-is-long-enough-32'

const KNOWN_JWT_PLACEHOLDERS = new Set([
  JWT_PLACEHOLDER_SECRET,
  'your-32-character-random-secret-key-change-this-in-production',
  'your-very-secure-random-32-character-secret-key-change-this',
  'your-very-secure-random-32-character-secret-key',
])

type RawEnv = Record<string, string | undefined>

const databaseUrlSchema = z.string().trim().min(1, 'is required').refine((value) => {
  try {
    const url = new URL(value)
    return (url.protocol === 'mysql:' || url.protocol === 'mariadb:')
      && url.hostname.length > 0
      && url.pathname.length > 1
  } catch {
    return false
  }
}, 'must be a valid MySQL/MariaDB connection URL')

const jwtSecretSchema = z.string()
  .min(32, 'must be at least 32 characters')
  .refine(value => !KNOWN_JWT_PLACEHOLDERS.has(value), 'must not use a repository placeholder')

const booleanEnv = (defaultValue: boolean) => z
  .enum(['true', 'false'])
  .default(defaultValue ? 'true' : 'false')
  .transform(value => value === 'true')

const runtimeSettingsSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_FORMAT: z.enum(['text', 'json']).default('text'),
  TRUST_X_FORWARDED_FOR: booleanEnv(false),
  NUXT_PUBLIC_SITE_URL: z.preprocess(
    value => value === '' || value === undefined ? undefined : value,
    z.string().trim().url('must be a valid URL').optional(),
  ),
  NUXT_PUBLIC_APP_NAME: z.string().trim().min(1).default('投資日記'),
  NUXT_PWA_DEV: booleanEnv(false),
  SEC_USER_AGENT: z.string().trim().default(''),
  MARKET_DATA_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(2),
  // These two fields are optional here because they are validated by the
  // full startup schema below. This keeps logger/cookie/config consumers
  // lazy without weakening startup validation.
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().optional(),
})

const serverEnvSchema = runtimeSettingsSchema
  .extend({
    DATABASE_URL: databaseUrlSchema,
    JWT_SECRET: jwtSecretSchema,
    SCHEDULER_ENABLED: booleanEnv(false),
    RUN_MIGRATIONS: booleanEnv(false),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === 'production' && !value.NUXT_PUBLIC_SITE_URL) {
      context.addIssue({
        code: 'custom',
        path: ['NUXT_PUBLIC_SITE_URL'],
        message: 'is required in production',
      })
    }
  })

export interface RuntimeSettings {
  nodeEnv: 'development' | 'test' | 'production'
  logFormat: 'text' | 'json'
  trustForwardedFor: boolean
  publicSiteUrl?: string
  appName: string
  pwaDev: boolean
  secUserAgent: string
  marketDataConcurrency: number
  databaseUrl?: string
  jwtSecret?: string
}

export interface ServerEnv extends RuntimeSettings {
  databaseUrl: string
  jwtSecret: string
  schedulerEnabled: boolean
  runMigrations: boolean
}

function isTestEnvironment(raw: RawEnv): boolean {
  return raw.NODE_ENV === 'test' || raw.VITEST !== undefined
}

function formatConfigError(error: z.ZodError): Error {
  const details = error.issues
    .map(issue => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
    .join('; ')
  return new Error(`Invalid server configuration: ${details}`)
}

function mapRuntimeSettings(value: z.infer<typeof runtimeSettingsSchema>): RuntimeSettings {
  return {
    nodeEnv: value.NODE_ENV,
    logFormat: value.LOG_FORMAT,
    trustForwardedFor: value.TRUST_X_FORWARDED_FOR,
    publicSiteUrl: value.NUXT_PUBLIC_SITE_URL,
    appName: value.NUXT_PUBLIC_APP_NAME,
    pwaDev: value.NUXT_PWA_DEV,
    secUserAgent: value.SEC_USER_AGENT,
    marketDataConcurrency: value.MARKET_DATA_CONCURRENCY,
    databaseUrl: value.DATABASE_URL,
    jwtSecret: value.JWT_SECRET,
  }
}

/** Parse only non-critical settings for logger, cookies, Nuxt config, etc. */
export function parseRuntimeSettings(raw: RawEnv = process.env): RuntimeSettings {
  const result = runtimeSettingsSchema.safeParse(raw)
  if (!result.success) throw formatConfigError(result.error)
  return mapRuntimeSettings(result.data)
}

/**
 * Parse all server-critical configuration. Test-only defaults are limited to
 * the Vitest runtime and never apply to production/deployment processes.
 */
export function parseServerEnv(
  raw: RawEnv = process.env,
  options: { allowTestDefaults?: boolean } = {},
): ServerEnv {
  const source: RawEnv = { ...raw }
  const allowTestDefaults = options.allowTestDefaults ?? isTestEnvironment(source)

  if (allowTestDefaults) {
    source.DATABASE_URL ??= TEST_DATABASE_URL
    source.JWT_SECRET ??= TEST_JWT_SECRET
  }

  const result = serverEnvSchema.safeParse(source)
  if (!result.success) throw formatConfigError(result.error)

  return {
    ...mapRuntimeSettings(result.data),
    databaseUrl: result.data.DATABASE_URL,
    jwtSecret: result.data.JWT_SECRET,
    schedulerEnabled: result.data.SCHEDULER_ENABLED,
    runMigrations: result.data.RUN_MIGRATIONS,
  }
}

/** Full startup validation. Do not log the returned object: it contains secrets. */
export function getServerEnv(): ServerEnv {
  return parseServerEnv(process.env)
}

/** Lazy database-only access for Prisma construction and CLI startup. */
export function getDatabaseUrl(options: { allowTestFallback?: boolean } = {}): string {
  const raw = process.env
  if (!raw.DATABASE_URL) {
    const allowTestFallback = options.allowTestFallback ?? isTestEnvironment(raw)
    if (allowTestFallback) return TEST_DATABASE_URL
    throw new Error('DATABASE_URL is required for Prisma client initialization')
  }

  const result = databaseUrlSchema.safeParse(raw.DATABASE_URL)
  if (!result.success) throw formatConfigError(result.error)
  return result.data
}

/** Lazy JWT-only access so importing unrelated server modules stays cheap. */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not defined')

  const result = jwtSecretSchema.safeParse(secret)
  if (!result.success) throw formatConfigError(result.error)
  return result.data
}

/** Nuxt config bridge; critical values are checked later by Nitro startup. */
export function getNuxtRuntimeConfig() {
  const runtime = parseRuntimeSettings(process.env)
  return {
    databaseUrl: runtime.databaseUrl,
    jwtSecret: runtime.jwtSecret,
    secUserAgent: runtime.secUserAgent,
    public: {
      appName: runtime.appName,
      siteUrl: runtime.publicSiteUrl ?? 'https://trade-basic.com',
    },
  }
}
