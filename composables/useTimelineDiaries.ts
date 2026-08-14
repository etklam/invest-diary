import { computed, onMounted, ref, watch } from 'vue'
import { formatDateWithWeekday, formatYmdInTimezone } from '~/lib/dates'
import { resolveErrorMessage } from '~/composables/useErrorI18n'
import type {
  Diary,
  DiaryGroup,
  PaginationResponse,
  DiariesApiResponse
} from '~/types/diary'

/**
 * Id-deduplicated merge for paginated diary lists (same contract as pages/diaries loadMore).
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
  const userTimezone = computed(() => options?.timezone || user.value?.timezone || 'Asia/Taipei')

  // Hydration gate - ensures server and client initial render match
  const isHydrated = ref(false)

  onMounted(() => {
    isHydrated.value = true
  })

  // Pagination state
  const page = ref(1)
  const diaries = ref<Diary[]>([])
  const pagination = ref<PaginationResponse | null>(null)
  const loadingMore = ref(false)

  // Initial first-page fetch using useLazyFetch.
  // Fixed URL (page never in a reactive getter) so pagination cannot trigger
  // useFetch's auto-refetch — loadMore() owns pages >= 2 via manual $fetch.
  const { pending, error, refresh: refreshFetch } = useLazyFetch<DiariesApiResponse>(
    `/api/diaries?page=1&limit=${limit}`,
    {
      onResponse({ response }) {
        if (response._data?.data) {
          diaries.value = response._data.data
          pagination.value = response._data.pagination
        }
      }
    }
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
        `/api/diaries?page=${nextPage}&limit=${limit}`
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

  // Filter state
  const filters = reactive({
    dateFrom: '',
    dateTo: ''
  })

  // Reset filters (also resets pagination to page 1)
  const resetFilters = () => {
    filters.dateFrom = ''
    filters.dateTo = ''
    page.value = 1
    diaries.value = []
    pagination.value = null
  }

  // Filter diaries by date range
  const filteredDiaries = computed(() => {
    if (!diaries.value) return []

    let result = [...diaries.value]

    // Date from filter
    if (filters.dateFrom) {
      result = result.filter(d => {
        const diaryYmd = formatYmdInTimezone(d.date || d.createdAt, userTimezone.value)
        return diaryYmd >= filters.dateFrom
      })
    }

    // Date to filter
    if (filters.dateTo) {
      result = result.filter(d => {
        const diaryYmd = formatYmdInTimezone(d.date || d.createdAt, userTimezone.value)
        return diaryYmd <= filters.dateTo
      })
    }

    // Sort by date descending
    return result.sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt).getTime()
      const dateB = new Date(b.date || b.createdAt).getTime()
      return dateB - dateA
    })
  })

  // Group diaries by year and month
  const groupedDiaries = computed((): DiaryGroup[] => {
    const groups = new Map<string, DiaryGroup>()

    filteredDiaries.value.forEach(diary => {
      const ymd = formatYmdInTimezone(diary.date || diary.createdAt, userTimezone.value)
      const [yearStr, monthStr] = ymd.split('-')
      const year = Number(yearStr)
      const month = Number(monthStr)
      const period = `${year}-${String(month).padStart(2, '0')}`
      // Localized month name — avoid bare "{year} {month}" numbers on EN
      const periodLabel = new Intl.DateTimeFormat(locale.value || 'en', {
        year: 'numeric',
        month: 'long',
      }).format(new Date(year, month - 1, 1))

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
