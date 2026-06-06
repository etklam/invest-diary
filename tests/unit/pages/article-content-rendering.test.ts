import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('article content rendering contract', () => {
  it('parses markdown before rendering instead of delegating article content to nested MDC async state', () => {
    const content = readFileSync(resolve(process.cwd(), 'pages/articles/[slug].vue'), 'utf8')

    expect(content).toContain("import { useArticleMarkdown } from '~/composables/useArticleMarkdown'")
    expect(content).toContain('useArticleMarkdown(articleContent, isHtmlContent)')
    expect(content).toContain('v-else-if="articleMarkdown?.body"')
    expect(content).toContain(':body="articleMarkdown.body"')
    expect(content).not.toMatch(/<MDC(\s|>)/)
  })

  it('shows skeleton loader while markdown parsing is pending instead of raw markdown', () => {
    const content = readFileSync(resolve(process.cwd(), 'pages/articles/[slug].vue'), 'utf8')

    expect(content).toContain('v-else-if="articleMarkdownPending"')
    expect(content).toContain('animate-pulse')
    expect(content).toContain('blog.contentUnavailable')
  })

  it('defines the empty-content fallback message for all locales', () => {
    for (const localeFile of ['en.json', 'zh-TW.json', 'zh-CN.json']) {
      const messages = JSON.parse(readFileSync(resolve(process.cwd(), 'i18n/locales', localeFile), 'utf8'))

      expect(messages.blog.contentUnavailable).toBeTruthy()
    }
  })
})
