import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = resolve(__dirname, '../..')

const read = (relativePath: string) =>
  readFileSync(resolve(projectRoot, relativePath), 'utf-8')

describe('CSP regression guardrails', () => {
  // Regression: SPA navigation to /articles/:slug showed "load failed" because
  // Shiki (via rehype-pretty-code) calls WebAssembly.instantiate() during
  // client-side markdown parsing. Production CSP blocked WASM.
  // Fix: add 'wasm-unsafe-eval' to production script-src.
  it('production CSP allows WebAssembly via wasm-unsafe-eval', () => {
    const source = read('nuxt.config.ts')

    // The production CSP ternary branch must include wasm-unsafe-eval so
    // Shiki can call WebAssembly.instantiate() during client-side markdown parsing.
    expect(source).toContain("'wasm-unsafe-eval'")
  })

  it('article detail page falls back to raw content when markdown parsing fails', () => {
    const source = read('pages/articles/[slug].vue')

    // The template must show raw article content (not just an error message)
    // when articleMarkdownError is truthy — degraded but functional.
    expect(source).toMatch(/v-else-if="articleMarkdownError"[^>]*>\{\{ articleContent \}\}/)
  })

  it('article detail page catches client-side parseMarkdown errors', () => {
    const source = read('pages/articles/[slug].vue')

    // The handler must try/catch so SSR errors propagate but client errors
    // are caught (allowing the template fallback to render).
    expect(source).toMatch(/catch\s*\(\s*parseError\s*\)/)
    expect(source).toContain('if (process.server) throw parseError')
  })
})
