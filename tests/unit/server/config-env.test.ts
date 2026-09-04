import { describe, expect, it } from 'vitest'
import {
  parseRuntimeSettings,
  parseServerEnv,
} from '~/server/config/env'

const validEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'mysql://diary_user:password@localhost:3306/invest_diary',
  JWT_SECRET: 'production-secret-that-is-long-enough-32',
  NUXT_PUBLIC_SITE_URL: 'https://trade-basic.com',
  SCHEDULER_ENABLED: 'true',
  RUN_MIGRATIONS: 'false',
  TRUST_X_FORWARDED_FOR: 'true',
  LOG_FORMAT: 'json',
  MARKET_DATA_CONCURRENCY: '4',
}

describe('centralized runtime configuration', () => {
  it('returns typed booleans and numeric market-data settings', () => {
    const env = parseServerEnv(validEnv, { allowTestDefaults: false })

    expect(env.schedulerEnabled).toBe(true)
    expect(env.runMigrations).toBe(false)
    expect(env.trustForwardedFor).toBe(true)
    expect(env.marketDataConcurrency).toBe(4)
    expect(env.logFormat).toBe('json')
  })

  it('applies safe defaults for optional runtime settings', () => {
    const runtime = parseRuntimeSettings({})

    expect(runtime.nodeEnv).toBe('development')
    expect(runtime.logFormat).toBe('text')
    expect(runtime.trustForwardedFor).toBe(false)
    expect(runtime.marketDataConcurrency).toBe(2)
    expect(runtime.pwaDev).toBe(false)
  })

  it('fails with a value-free error when critical production config is missing', () => {
    expect(() => parseServerEnv({ NODE_ENV: 'production' }, { allowTestDefaults: false }))
      .toThrow(/Invalid server configuration:.*DATABASE_URL.*JWT_SECRET/)

    try {
      parseServerEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'mysql://user:super-secret-password@localhost:3306/app',
        JWT_SECRET: 'short',
      }, { allowTestDefaults: false })
    } catch (error) {
      expect(String(error)).not.toContain('super-secret-password')
      expect(String(error)).not.toContain('short')
    }
  })

  it('rejects string booleans outside the explicit true/false contract', () => {
    expect(() => parseServerEnv({
      ...validEnv,
      SCHEDULER_ENABLED: 'yes',
    }, { allowTestDefaults: false })).toThrow(/SCHEDULER_ENABLED/)

    expect(() => parseServerEnv({
      ...validEnv,
      RUN_MIGRATIONS: '1',
    }, { allowTestDefaults: false })).toThrow(/RUN_MIGRATIONS/)
  })

  it('rejects the copy-paste JWT placeholder from .env.example', () => {
    expect(() => parseServerEnv({
      ...validEnv,
      JWT_SECRET: 'your-32-character-random-secret-key-change-this-in-production',
    }, { allowTestDefaults: false })).toThrow(/repository placeholder/)
  })

  it('requires an explicit public site URL in production', () => {
    const { NUXT_PUBLIC_SITE_URL: _siteUrl, ...missingSiteUrl } = validEnv

    expect(() => parseServerEnv(missingSiteUrl, { allowTestDefaults: false }))
      .toThrow(/NUXT_PUBLIC_SITE_URL.*required in production/)
  })
})
