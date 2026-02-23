import { computed, onMounted, ref, watch } from 'vue'
import { formatDateWithWeekday } from '~/lib/utils'
import type {
  Diary,
  DiaryAlert,
  DiaryGroup,
  PaginationResponse,
  DiariesApiResponse
} from '~/types/diary'

export const useTimelineDiaries = (options?: { limit?: number; timezone?: string }) => {
  const { t } = useI18n()
  const { user } = useAuth()

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

  // Initial data fetch using useLazyFetch
  const { pending, error } = useLazyFetch<DiariesApiResponse>(
    () => `/api/diaries?page=${page.value}&limit=${limit}`,
    {
      onResponse({ response }) {
        if (response._data?.data) {
          // Assign on page 1, push on subsequent pages
          if (page.value === 1) {
            diaries.value = response._data.data
          } else {
            diaries.value.push(...response._data.data)
          }
          pagination.value = response._data.pagination
        }
      }
    }
  )

  // Check if more data available
  const hasMore = computed(() => {
    return diaries.value.length < (pagination.value?.total || 0)
  })

  // Load more diaries (client-only after hydration)
  const loadMore = async () => {
    if (!isHydrated.value || loadingMore.value || !hasMore.value) return

    loadingMore.value = true
    page.value++

    try {
      const response = await $fetch<DiariesApiResponse>(
        `/api/diaries?page=${page.value}&limit=${limit}`
      )

      if (response?.data) {
        diaries.value.push(...response.data)
        pagination.value = response.pagination
      }
    } catch (err) {
      console.error('Error loading more diaries:', err)
      page.value-- // Revert on error
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
      const fromDate = new Date(filters.dateFrom)
      fromDate.setHours(0, 0, 0, 0)
      result = result.filter(d => {
        const diaryDate = new Date(d.date || d.createdAt)
        return diaryDate >= fromDate
      })
    }

    // Date to filter
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo)
      toDate.setHours(23, 59, 59, 999)
      result = result.filter(d => {
        const diaryDate = new Date(d.date || d.createdAt)
        return diaryDate <= toDate
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
      const date = new Date(diary.date || diary.createdAt)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const period = `${year}-${String(month).padStart(2, '0')}`
      const periodLabel = t('timeline.periodLabel', { year, month })

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
    resetFilters,
    formatDate
  }
}
