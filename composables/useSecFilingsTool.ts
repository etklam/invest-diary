import type { SecApiResponse, SecBatchMode, SecCompanySearchResult, SecFilingDetail, SecFilingFilters, SecFilingPage } from '~/types/sec-filings'

export function useSecFilingsTool() {
  const companies = ref<SecCompanySearchResult[]>([])
  const selectedCompany = ref<SecCompanySearchResult | null>(null)
  const filingPage = ref<SecFilingPage | null>(null)
  const detail = ref<SecFilingDetail | null>(null)
  const loading = ref(false)
  const stale = ref(false)
  const errorCode = ref<string | null>(null)
  const selectedAccessions = ref<string[]>([])
  const cursorStack = ref<Array<string | undefined>>([undefined])
  const pageIndex = ref(0)
  const filters = reactive<SecFilingFilters>({ forms: [], amendments: 'include', limit: 50 })

  const captureError = (error: unknown) => {
    const value = error as { data?: { data?: { code?: string }; code?: string }; statusCode?: number }
    errorCode.value = value.data?.data?.code ?? value.data?.code ?? (value.statusCode === 429 ? 'SEC_RATE_LIMITED' : 'SEC_UPSTREAM_UNAVAILABLE')
  }

  async function searchCompanies(query: string) {
    if (!query.trim()) { companies.value = []; return }
    loading.value = true; errorCode.value = null
    try {
      const response = await $fetch<SecApiResponse<SecCompanySearchResult[]>>('/api/tools/sec-filings/companies', { params: { q: query, limit: 10 } })
      companies.value = response.data
      stale.value = response.meta.stale
    } catch (error) { captureError(error); companies.value = [] } finally { loading.value = false }
  }

  async function selectCompany(company: SecCompanySearchResult) {
    selectedCompany.value = company
    selectedAccessions.value = []
    cursorStack.value = [undefined]
    pageIndex.value = 0
    await loadFilings()
  }

  async function loadFilings(cursor = cursorStack.value[pageIndex.value]) {
    if (!selectedCompany.value) return
    loading.value = true; errorCode.value = null
    try {
      const params: Record<string, string | number | undefined> = {
        forms: filters.forms.length ? filters.forms.join(',') : undefined,
        filedFrom: filters.filedFrom,
        filedTo: filters.filedTo,
        periodFrom: filters.periodFrom,
        periodTo: filters.periodTo,
        amendments: filters.amendments,
        limit: filters.limit,
        cursor,
      }
      const response = await $fetch<SecApiResponse<SecFilingPage>>(`/api/tools/sec-filings/companies/${selectedCompany.value.cik}/filings`, { params })
      filingPage.value = response.data
      stale.value = response.meta.stale
    } catch (error) { captureError(error); filingPage.value = null } finally { loading.value = false }
  }

  async function applyFilters() {
    cursorStack.value = [undefined]; pageIndex.value = 0; selectedAccessions.value = []; await loadFilings()
  }

  async function nextPage() {
    const cursor = filingPage.value?.nextCursor
    if (!cursor) return
    cursorStack.value = [...cursorStack.value.slice(0, pageIndex.value + 1), cursor]
    pageIndex.value++
    await loadFilings(cursor)
  }

  async function previousPage() {
    if (pageIndex.value === 0) return
    pageIndex.value--
    await loadFilings(cursorStack.value[pageIndex.value])
  }

  function toggleSelection(accession: string) {
    if (selectedAccessions.value.includes(accession)) selectedAccessions.value = selectedAccessions.value.filter(value => value !== accession)
    else if (selectedAccessions.value.length < 10) selectedAccessions.value = [...selectedAccessions.value, accession]
  }

  function batchUrl(mode: SecBatchMode): string {
    if (!selectedCompany.value || !selectedAccessions.value.length) return '#'
    const params = new URLSearchParams({ cik: selectedCompany.value.cik, mode })
    selectedAccessions.value.forEach(accession => params.append('accessions', accession))
    return `/api/tools/sec-filings/batch?${params.toString()}`
  }

  async function loadDetail(cik: string, accession: string) {
    loading.value = true; errorCode.value = null
    try {
      const response = await $fetch<SecApiResponse<SecFilingDetail>>(`/api/tools/sec-filings/companies/${cik}/filings/${accession}`)
      detail.value = response.data; stale.value = response.meta.stale
    } catch (error) { captureError(error); detail.value = null } finally { loading.value = false }
  }

  return { companies, selectedCompany, filingPage, detail, filters, loading, stale, errorCode, selectedAccessions, pageIndex, searchCompanies, selectCompany, loadFilings, applyFilters, nextPage, previousPage, toggleSelection, batchUrl, loadDetail }
}
