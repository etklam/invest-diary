import { ref, shallowRef, watch, type Ref } from 'vue'
import type { MDCParserResult } from '@nuxtjs/mdc'

type ArticleMarkdownParser = (content: string) => Promise<MDCParserResult>

/**
 * Uses Nuxt auto-imported parseMarkdown from @nuxtjs/mdc.
 * Do NOT use dynamic `import('@nuxtjs/mdc/runtime')` — the bare specifier
 * cannot be resolved by the browser, so it only works during SSR and fails
 * on the client with "Failed to resolve module specifier".
 */
const defaultParseArticleMarkdown: ArticleMarkdownParser = async (content) => {
  return parseMarkdown(content, {
    toc: false,
    contentHeading: false,
  })
}

export function useArticleMarkdown(
  content: Ref<string>,
  isHtmlContent: Ref<boolean>,
  parseArticleMarkdown: ArticleMarkdownParser = defaultParseArticleMarkdown,
) {
  const parsed = shallowRef<MDCParserResult | null>(null)
  const pending = ref(false)
  const error = shallowRef<unknown>(null)
  let parseRunId = 0

  const refresh = async () => {
    const currentRunId = ++parseRunId
    const markdown = content.value

    parsed.value = null
    error.value = null

    if (!markdown || isHtmlContent.value) {
      pending.value = false
      return
    }

    pending.value = true

    try {
      const nextParsed = await parseArticleMarkdown(markdown)
      if (currentRunId === parseRunId) {
        parsed.value = nextParsed
      }
    } catch (err) {
      if (currentRunId === parseRunId) {
        error.value = err
      }
    } finally {
      if (currentRunId === parseRunId) {
        pending.value = false
      }
    }
  }

  watch([content, isHtmlContent], () => {
    void refresh()
  }, { immediate: true })

  return {
    parsed,
    pending,
    error,
    refresh,
  }
}
