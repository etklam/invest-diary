import { describe, expect, it } from 'vitest'
import { assertDisposableDatabaseUrl, getDatabaseName } from '~/scripts/test-database-guard'

describe('test database guard', () => {
  it('requires callers to declare the disposable database name or prefix', () => {
    expect(() => assertDisposableDatabaseUrl(
      'mysql://root:secret@127.0.0.1:33123/any_loopback_db',
      {},
    )).toThrow(/exact database name or disposable prefix is required/)
  })

  it('accepts the exact loopback database assigned to a suite', () => {
    const parsed = assertDisposableDatabaseUrl(
      'mysql://root:secret@127.0.0.1:33123/backend_http_test',
      { databaseName: 'backend_http_test' },
    )

    expect(parsed.hostname).toBe('127.0.0.1')
    expect(getDatabaseName(parsed.toString())).toBe('backend_http_test')
  })

  it('accepts a unique run database through an explicit prefix', () => {
    expect(() => assertDisposableDatabaseUrl(
      'mariadb://root:secret@localhost:3306/diary_e2e_20260904_1234',
      { databasePrefix: 'diary_e2e_' },
    )).not.toThrow()
  })

  it.each([
    ['remote host', 'mysql://root:secret@example.com:3306/backend_http_test'],
    ['generic database', 'mysql://root:secret@127.0.0.1:3306/test'],
    ['wrong suite database', 'mysql://root:secret@127.0.0.1:3306/invest_diary'],
    ['missing database', 'mysql://root:secret@127.0.0.1:3306/'],
  ])('rejects %s', (_label, url) => {
    expect(() => assertDisposableDatabaseUrl(url, { databaseName: 'backend_http_test' })).toThrow(
      /Refusing test database/,
    )
  })
})
