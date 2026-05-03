import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('article content rendering contract', () => {
  it('keeps article content visible when MDC parsing does not return a body', () => {
    const content = readFileSync(resolve(process.cwd(), 'pages/articles/[slug].vue'), 'utf8')

    expect(content).toContain('v-slot="{ body, data }"')
    expect(content).toContain('v-if="body"')
    expect(content).toContain('markdownFallbackContent')
    expect(content).toContain('blog.contentUnavailable')
  })

  it('defines the empty-content fallback message for all locales', () => {
    for (const localeFile of ['en.json', 'zh-TW.json', 'zh-CN.json']) {
      const messages = JSON.parse(readFileSync(resolve(process.cwd(), 'i18n/locales', localeFile), 'utf8'))

      expect(messages.blog.contentUnavailable).toBeTruthy()
    }
  })
})
