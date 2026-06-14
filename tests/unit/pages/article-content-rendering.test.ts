import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('article content rendering contract', () => {
  it('parses markdown before rendering instead of delegating article content to nested MDC async state', () => {
    const content = readFileSync(resolve(process.cwd(), 'pages/articles/[slug].vue'), 'utf8')

    expect(content).toContain("import { parseMarkdown } from '@nuxtjs/mdc/runtime'")
    expect(content).toContain('useAsyncData(')
    expect(content).toContain('} = await useAsyncData(')
    expect(content).toContain('return await parseMarkdown(articleContent.value')
    expect(content).toContain('v-else-if="articleMarkdown?.body"')
    expect(content).toContain(':body="articleMarkdown.body"')
    expect(content).not.toMatch(/<MDC(\s|>)/)
  })

  it('never returns null or undefined from the markdown async handler', () => {
    const content = readFileSync(resolve(process.cwd(), 'pages/articles/[slug].vue'), 'utf8')
    const markdownHandler = content.slice(
      content.indexOf('} = await useAsyncData('),
      content.indexOf('const sanitizedContent')
    )

    expect(content).toContain('const emptyMarkdownDocument')
    expect(markdownHandler).toContain('return emptyMarkdownDocument')
    expect(markdownHandler).toContain('|| emptyMarkdownDocument')
    expect(markdownHandler).not.toMatch(/return\s+(null|undefined)\b/)
  })

  it('retries article fetch only for network or server errors', () => {
    const content = readFileSync(resolve(process.cwd(), 'pages/articles/[slug].vue'), 'utf8')

    expect(content).toContain('const fetchBlogPostWithRetry = async (slug: string) => {')
    expect(content).toContain('return statusCode === null || statusCode >= 500')
    expect(content).toContain('if (!isRetriableFetchError(err))')
    expect(content).toContain('throw err')
    expect(content).not.toMatch(/statusCode\s*===\s*404[^]*\$fetch/)
  })

  it('does not public-cache article detail SSR responses', () => {
    const content = readFileSync(resolve(process.cwd(), 'nuxt.config.ts'), 'utf8')
    const articleDetailRule = content.match(/'\/articles\/\*\*':\s*\{[\s\S]*?headers:\s*\{([\s\S]*?)\n\s*\}/)

    expect(articleDetailRule?.[1]).toContain("'Cache-Control': 'no-store'")
    expect(articleDetailRule?.[1]).toContain("Vary: 'Cookie, Accept-Language'")
    expect(articleDetailRule?.[1]).not.toMatch(/public,\s*max-age=300/)
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
