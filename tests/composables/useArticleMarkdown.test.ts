import { nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useArticleMarkdown } from '~/composables/useArticleMarkdown'

const flushPromises = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const createParsedMarkdown = (text: string) => ({
  data: {},
  body: {
    type: 'root',
    children: [
      {
        type: 'element',
        tag: 'p',
        props: {},
        children: [{ type: 'text', value: text }],
      },
    ],
  },
})

describe('useArticleMarkdown', () => {
  it('parses markdown when article content arrives after initial empty state', async () => {
    const content = ref('')
    const isHtmlContent = ref(false)
    const parsed = createParsedMarkdown('Loaded article')
    const parseArticleMarkdown = vi.fn(async () => parsed as any)

    const state = useArticleMarkdown(content, isHtmlContent, parseArticleMarkdown)

    expect(parseArticleMarkdown).not.toHaveBeenCalled()
    expect(state.parsed.value).toBeNull()

    content.value = '# Loaded article'
    await nextTick()
    await flushPromises()

    expect(parseArticleMarkdown).toHaveBeenCalledWith('# Loaded article')
    expect(state.parsed.value).toBe(parsed)
    expect(state.pending.value).toBe(false)
    expect(state.error.value).toBeNull()
  })

  it('does not parse HTML article content as markdown', async () => {
    const content = ref('<p>HTML body</p>')
    const isHtmlContent = ref(true)
    const parseArticleMarkdown = vi.fn()

    const state = useArticleMarkdown(content, isHtmlContent, parseArticleMarkdown)

    await nextTick()
    await flushPromises()

    expect(parseArticleMarkdown).not.toHaveBeenCalled()
    expect(state.parsed.value).toBeNull()
    expect(state.pending.value).toBe(false)
  })

  it('ignores stale parse results when content changes quickly', async () => {
    const content = ref('# First')
    const isHtmlContent = ref(false)
    let resolveFirst: ((value: any) => void) | undefined
    let resolveSecond: ((value: any) => void) | undefined
    const firstParsed = createParsedMarkdown('First')
    const secondParsed = createParsedMarkdown('Second')
    const parseArticleMarkdown = vi.fn((markdown: string) => new Promise((resolve) => {
      if (markdown === '# First') {
        resolveFirst = resolve
        return
      }
      resolveSecond = resolve
    }))

    const state = useArticleMarkdown(content, isHtmlContent, parseArticleMarkdown)

    await nextTick()
    content.value = '# Second'
    await nextTick()

    resolveSecond?.(secondParsed)
    await flushPromises()
    expect(state.parsed.value).toBe(secondParsed)

    resolveFirst?.(firstParsed)
    await flushPromises()
    expect(state.parsed.value).toBe(secondParsed)
  })
})
