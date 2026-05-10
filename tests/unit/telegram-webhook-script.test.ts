import { describe, expect, it } from 'vitest'
import {
  getWebhookConfig,
  normalizeSiteUrl,
  parseEnvFile,
  redactToken,
} from '../../scripts/telegram-webhook.mjs'

describe('telegram webhook setup script', () => {
  it('parses quoted .env values and comments', () => {
    const parsed = parseEnvFile(`
      TELEGRAM_BOT_TOKEN="123:abc"
      TELEGRAM_WEBHOOK_SECRET=secret_123 # local comment
      NUXT_PUBLIC_SITE_URL='https://example.com/'
    `)

    expect(parsed).toEqual({
      TELEGRAM_BOT_TOKEN: '123:abc',
      TELEGRAM_WEBHOOK_SECRET: 'secret_123',
      NUXT_PUBLIC_SITE_URL: 'https://example.com/',
    })
  })

  it('builds the webhook URL from public site URL', () => {
    expect(getWebhookConfig({
      TELEGRAM_BOT_TOKEN: '123:abc',
      TELEGRAM_WEBHOOK_SECRET: 'secret_123',
      NUXT_PUBLIC_SITE_URL: 'https://trade-basic.com/',
    })).toEqual({
      token: '123:abc',
      secret: 'secret_123',
      webhookUrl: 'https://trade-basic.com/api/telegram/webhook',
    })
  })

  it('rejects non-HTTPS site URLs because Telegram cannot reach local HTTP webhooks', () => {
    expect(() => normalizeSiteUrl('http://localhost:3000')).toThrow(/HTTPS/)
  })

  it('redacts token secrets in command output', () => {
    expect(redactToken('123456:abcdef')).toBe('123456:***')
  })
})
