import { computed, onMounted, ref, watch } from 'vue'
import { formatDateWithWeekday, formatUserDateTime, formatYmdInTimezone } from '~/lib/dates'
import { resolveUserTimezone } from '~/lib/dates/user-tz'
import { resolveErrorMessage } from '~/composables/useErrorI18n'
import type {
  DiaryResponse,
  DiaryGroup,
  PaginationResponse,
  DiariesApiResponse
} from '~/lib/contracts/diary'

/**
 * Id-deduplicated merge for paginated diary lists.
 * Guards against a page being fetched twice or overlapping server-side inserts.
 */
export function mergeDiariesById<T extends { id: unknown }>(existing: T[], incoming: T[]): T[] {
  const seen = new Set(existing.map(diary => String(diary.id)))
  const additions = incoming.filter(diary => !seen.has(String(diary.id)))
  return [...existing, ...additions]
}

export const useTimelineDiaries = (options?: { limit?: number; timezone?: string }) => {
  const { t, locale } = useI18n()
  const { user } = useAuth()
  const toast = useToast()

  // Options
  const limit = options?.limit || 20
  const userTimezone = computed(() => options?.timezone || resolveUserTimezone(user.value))

  // Hydration gate - ensures server and client initial render match
  const isHydrated = ref(false)

  onMounted(() => {
    isHydrated.value = true
  })

  // Pagination state
  const page = ref(1)
  const diaries = ref<DiaryResponse[]>([])
  const pagination = ref<PaginationResponse | null>(null)
  const loadingMore = ref(false)

  // The API owns date filtering so every page uses the same result set.
  const filters = reactive({
    dateFrom: '',
    dateTo: ''
  })

  const requestQuery = computed(() => ({
    page: '1',
    limit: String(limit),
    ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
    ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
  }))

  // Initial first-page fetch using useLazyFetch.
  // Fixed URL (page never in a reactive getter) so pagination cannot trigger
  // useFetch's auto-refetch — loadMore() owns pages >= 2 via manual $fetch.
  const {
    data: diaryResponse,
    pending,
    error,
    refresh: refreshFetch,
  } = useLazyFetch<DiariesApiResponse>(
    '/api/diaries',
    {
      query: requestQuery,
      watch: false,
    }
  )

  // Read from useFetch data so Nuxt's SSR payload hydrates into the same list
  // on the client. The onResponse hook does not run during payload hydration.
  watch(
    diaryResponse,
    (response) => {
      if (response?.data) {
        diaries.value = response.data
        pagination.value = response.pagination
      }
    },
    { immediate: true },
  )

  watch(
    () => [filters.dateFrom, filters.dateTo],
    () => {
      page.value = 1
      diaries.value = []
      pagination.value = null
      void refreshFetch()
    },
  )

  // Reset to page 1 and re-fetch (used after Quick Diary create/append)
  const refresh = async () => {
    page.value = 1
    diaries.value = []
    pagination.value = null
    await refreshFetch()
  }

  // Check if more data available
  const hasMore = computed(() => {
    return diaries.value.length < (pagination.value?.total || 0)
  })

  // Load more diaries (client-only after hydration).
  // Page advances only on success; on failure the loaded list stays intact
  // and a retry re-requests the same page.
  const loadMore = async () => {
    if (!isHydrated.value || loadingMore.value || !hasMore.value) return

    const nextPage = page.value + 1
    loadingMore.value = true

    try {
      const response = await $fetch<DiariesApiResponse>(
        '/api/diaries',
        { query: { ...requestQuery.value, page: String(nextPage) } },
      )

      if (response?.data) {
        diaries.value = mergeDiariesById(diaries.value, response.data)
        pagination.value = response.pagination
      }
      page.value = nextPage
    } catch (err) {
      toast.error(resolveErrorMessage(err, t))
    } finally {
      loadingMore.value = false
    }
  }

  // Reset filters (the filter watcher also refreshes page 1)
  const resetFilters = () => {
    filters.dateFrom = ''
    filters.dateTo = ''
  }

  // Date filtering is server-side; sort only for presentation before grouping.
  const filteredDiaries = computed(() => {
    return [...diaries.value].sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      return dateB - dateA
    })
  })

  // Group diaries by year and month
  const groupedDiaries = computed((): DiaryGroup[] => {
    const groups = new Map<string, DiaryGroup>()

    filteredDiaries.value.forEach(diary => {
      const ymd = formatYmdInTimezone(diary.date, userTimezone.value)
      const [yearStr, monthStr] = ymd.split('-')
      const year = Number(yearStr)
      const month = Number(monthStr)
      const period = `${year}-${String(month).padStart(2, '0')}`
      // Localized month name — avoid bare "{year} {month}" numbers on EN
      const periodLabel = formatUserDateTime(new Date(Date.UTC(year, month - 1, 1, 12)), {
        timezone: userTimezone.value,
        locale: locale.value || 'en',
        format: { year: 'numeric', month: 'long' },
      })

      if (!groups.has(period)) {
        groups.set(period, {
          period,
          periodLabel,
          diaries: []
        })
      }

      groups.get(period)!.diaries.push(diary)
    })

    // Convert to array and sort by period descending
    return Array.from(groups.values()).sort((a, b) => b.period.localeCompare(a.period))
  })

  // Timezone-aware date formatter
  const formatDate = (date: Date | string) => formatDateWithWeekday(date, userTimezone.value)

  // Error logging
  watch(error, (err) => {
    if (err) {
      console.error('Error fetching diaries:', err)
    }
  })

  return {
    // State
    isHydrated,
    pending,
    error,
    loadingMore,
    filters,
    diaries,
    pagination,
    // Computed
    hasMore,
    filteredDiaries,
    groupedDiaries,
    // Methods
    loadMore,
    refresh,
    resetFilters,
    formatDate
  }
}
