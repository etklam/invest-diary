import { computed, onMounted, ref } from 'vue'
import type { InvestmentActivityItem, InvestmentActivityPage } from '~/lib/investment-activity'
import { resolveErrorMessage } from '~/composables/useErrorI18n'

export const useInvestmentActivity = (options: { limit?: number; symbol?: Ref<string | null | undefined> } = {}) => {
  const { t } = useI18n()
  const toast = useToast()
  const items = ref<InvestmentActivityItem[]>([])
  const nextCursor = ref<string | null>(null)
  const pending = ref(false)
  const loadingMore = ref(false)
  const error = ref<unknown>(null)
  const hasLoaded = ref(false)
  const limit = options.limit ?? 20
  const symbol = computed(() => options.symbol?.value?.trim() || '')

  const fetchPage = async (cursor: string | null, append: boolean) => {
    const params: Record<string, string | number> = { limit }
    if (cursor) params.cursor = cursor
    if (symbol.value) params.symbol = symbol.value
    const response = await $fetch<InvestmentActivityPage>('/api/investment-activity', { query: params })
    if (append) items.value.push(...response.items)
    else items.value = response.items
    nextCursor.value = response.nextCursor
    hasLoaded.value = true
    error.value = null
  }

  const refresh = async () => {
    pending.value = true
    try {
      await fetchPage(null, false)
    } catch (err) {
      error.value = err
    } finally {
      pending.value = false
    }
  }

  const loadMore = async () => {
    if (!nextCursor.value || loadingMore.value) return
    const cursorBeforeRequest = nextCursor.value
    loadingMore.value = true
    try {
      await fetchPage(cursorBeforeRequest, true)
    } catch (err) {
      error.value = err
      toast.error(resolveErrorMessage(err, t))
    } finally {
      loadingMore.value = false
    }
  }

  onMounted(() => { void refresh() })

  return {
    items,
    nextCursor,
    pending,
    loadingMore,
    error,
    hasLoaded,
    hasMore: computed(() => Boolean(nextCursor.value)),
    refresh,
    loadMore,
  }
}
