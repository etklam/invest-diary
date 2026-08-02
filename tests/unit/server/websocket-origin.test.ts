import { describe, expect, it } from 'vitest'
import { isAllowedWebSocketOrigin } from '~/server/utils/websocket-origin'

describe('WebSocket origin policy', () => {
  it('allows the configured origin and its www alias in production', () => {
    expect(isAllowedWebSocketOrigin('https://trade-basic.com', 'https://trade-basic.com', true)).toBe(true)
    expect(isAllowedWebSocketOrigin('https://www.trade-basic.com', 'https://trade-basic.com', true)).toBe(true)
    expect(isAllowedWebSocketOrigin('https://trade-basic.com', 'https://www.trade-basic.com', true)).toBe(true)
  })

  it('normalizes trailing slashes in the configured site URL', () => {
    expect(isAllowedWebSocketOrigin('https://www.trade-basic.com', 'https://trade-basic.com/', true)).toBe(true)
  })

  it('allows same-origin requests without an Origin header', () => {
    expect(isAllowedWebSocketOrigin(undefined, undefined, true)).toBe(true)
  })

  it('still rejects unrelated production origins', () => {
    expect(isAllowedWebSocketOrigin('https://evil.example', 'https://trade-basic.com', true)).toBe(false)
  })

  it('allows localhost development origins outside production', () => {
    expect(isAllowedWebSocketOrigin('http://localhost:3000', undefined, false)).toBe(true)
    expect(isAllowedWebSocketOrigin('http://127.0.0.1:3000', undefined, false)).toBe(true)
  })
})
