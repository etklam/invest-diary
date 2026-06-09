/**
 * Regression test for: article body shows skeleton/loading instead of parsed markdown
 *
 * Root cause: The original `useArticleMarkdown` composable used `watch` + `void refresh()`
 * (fire-and-forget). During SSR, Vue does not await fire-and-forget promises, so the
 * markdown was never parsed before the HTML was sent — the page only ever rendered
 * the skeleton loading state.
 *
 * Fix: Use `useAsyncData` in the page component so Nuxt's SSR engine properly awaits
 * the markdown parsing before rendering.
 *
 * This file verifies:
 * 1. parseMarkdown correctly handles article content with YAML frontmatter
 * 2. The parse result has a `.body` that a renderer can use
 * 3. parseMarkdown does not throw on typical article content
 */
import { describe, expect, it } from 'vitest'
import { parseMarkdown } from '@nuxtjs/mdc/runtime'

const ARTICLE_WITH_FRONTMATTER = `---
title: "Thinking in Beta × Time"
---

# Thinking in Beta × Time

When people talk about investing, they often split themselves into two camps.

## The Problem

Most investors try to **time the market**. This rarely works.

> The best time to plant a tree was 20 years ago.

### Sub-section

- Bullet point one
- Bullet point two

\`\`\`typescript
const beta = 1.2
console.log(beta)
\`\`\`
`

const ARTICLE_PLAIN_MARKDOWN = `# Simple Article

This is a plain markdown article without any frontmatter.

## Section One

Some content here with **bold** and *italic* text.

- List item 1
- List item 2
`

describe('Article markdown parsing (SSR regression)', () => {
  it('parses article with YAML frontmatter and produces a renderable body', async () => {
    const result = await parseMarkdown(ARTICLE_WITH_FRONTMATTER, {
      toc: false,
      contentHeading: false,
    })

    // Must have a body for MDCRenderer to render
    expect(result.body).toBeDefined()
    expect(result.body.type).toBe('root')
    expect(result.body.children.length).toBeGreaterThan(0)

    // Frontmatter data should be extracted
    expect(result.data).toBeDefined()

    // Body should contain heading elements (not empty)
    const hasHeading = result.body.children.some(
      (child: any) => child.tag === 'h1' || child.tag === 'h2' || child.tag === 'h3',
    )
    expect(hasHeading).toBe(true)
  })

  it('parses plain markdown article without frontmatter', async () => {
    const result = await parseMarkdown(ARTICLE_PLAIN_MARKDOWN, {
      toc: false,
      contentHeading: false,
    })

    expect(result.body).toBeDefined()
    expect(result.body.type).toBe('root')
    expect(result.body.children.length).toBeGreaterThan(0)
  })

  it('does not throw on empty content', async () => {
    const result = await parseMarkdown('', {
      toc: false,
      contentHeading: false,
    })

    expect(result.body).toBeDefined()
    expect(result.data).toBeDefined()
  })

  it('parse result body is structured for MDCRenderer consumption', async () => {
    const result = await parseMarkdown(ARTICLE_WITH_FRONTMATTER, {
      toc: false,
      contentHeading: false,
    })

    // MDCRenderer expects body with type 'root' containing children
    const { body } = result
    expect(body).toHaveProperty('type', 'root')
    expect(body).toHaveProperty('children')
    expect(Array.isArray(body.children)).toBe(true)

    // Each child should have a type or tag property
    for (const child of body.children) {
      expect(child).toHaveProperty('type')
    }
  })

  it('handles real-world article content with mixed formatting', async () => {
    const realWorldContent = `---
title: "Gold Analysis"
---

# Why Gold Became the Ultimate Symbol of Wealth

A Systematic Analysis from Physical Laws to Digital Assets.

## Physical Properties

| Property | Value |
|----------|-------|
| Atomic Number | 79 |
| Density | 19.32 g/cm³ |

Gold's scarcity is not accidental — it results from [nuclear physics](https://example.com).

> Gold is money. Everything else is credit.

### Supply Constraints

1. **Above-ground stock**: ~200,000 tonnes
2. **Annual mining**: ~3,000 tonnes
3. Growth rate: ~1.5% per year

\`\`\`python
def gold_scarcity(stock, annual_mining):
    return annual_mining / stock * 100
\`\`\`
`

    const result = await parseMarkdown(realWorldContent, {
      toc: false,
      contentHeading: false,
    })

    expect(result.body).toBeDefined()
    expect(result.body.children.length).toBeGreaterThan(0)

    // Should contain varied element types
    const tags = new Set(
      result.body.children.map((c: any) => c.tag).filter(Boolean),
    )
    expect(tags.size).toBeGreaterThan(1)
  })
})
