import { afterEach, describe, expect, it } from 'vitest'
import { getRateLimitIdentifier } from '~/lib/rate-limiter'

const makeEvent = (
  headers: Record<string, string | string[]> = {},
  remoteAddress = '203.0.113.7',
) => ({
  node: { req: { headers, socket: { remoteAddress } } },
})

describe('getRateLimitIdentifier', () => {
  const originalFlag = process.env.TRUST_X_FORWARDED_FOR

  afterEach(() => {
    if (originalFlag === undefined) delete process.env.TRUST_X_FORWARDED_FOR
    else process.env.TRUST_X_FORWARDED_FOR = originalFlag
  })

  it('ignores X-Forwarded-For by default and uses the socket address', () => {
    delete process.env.TRUST_X_FORWARDED_FOR

    expect(
      getRateLimitIdentifier(makeEvent({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })),
    ).toBe('203.0.113.7')
  })

  it('treats any value other than "true" as untrusted', () => {
    process.env.TRUST_X_FORWARDED_FOR = 'false'

    expect(
      getRateLimitIdentifier(makeEvent({ 'x-forwarded-for': '1.2.3.4' })),
    ).toBe('203.0.113.7')
  })

  it('uses the LAST XFF entry (the one our own proxy appended) when trust is enabled', () => {
    process.env.TRUST_X_FORWARDED_FOR = 'true'

    expect(
      getRateLimitIdentifier(makeEvent({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })),
    ).toBe('5.6.7.8')
  })

  it('uses a single trusted XFF entry directly', () => {
    process.env.TRUST_X_FORWARDED_FOR = 'true'

    expect(
      getRateLimitIdentifier(makeEvent({ 'x-forwarded-for': '198.51.100.9' })),
    ).toBe('198.51.100.9')
  })

  it('falls back to the socket address when the trusted XFF header is blank', () => {
    process.env.TRUST_X_FORWARDED_FOR = 'true'

    expect(
      getRateLimitIdentifier(makeEvent({ 'x-forwarded-for': '  ' })),
    ).toBe('203.0.113.7')
  })

  it('falls back to unknown when neither header nor socket address exists', () => {
    delete process.env.TRUST_X_FORWARDED_FOR

    expect(getRateLimitIdentifier({ node: { req: {} } })).toBe('unknown')
  })
})
