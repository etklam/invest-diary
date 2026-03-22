export interface AdminBlogFilters {
  status: string
  category: string
  search: string
  author: string
  dateFrom: string
  dateTo: string
  sortBy: string
}

interface AdminBlogQueryInput {
  page: number
  limit: number
  filters: AdminBlogFilters
}

export function buildAdminBlogQueryString(input: AdminBlogQueryInput): string {
  const params = new URLSearchParams({
    page: input.page.toString(),
    limit: input.limit.toString(),
  })

  const appendIfPresent = (key: string, value: string) => {
    const normalized = value.trim()
    if (normalized) {
      params.set(key, normalized)
    }
  }

  appendIfPresent('status', input.filters.status)
  appendIfPresent('category', input.filters.category)
  appendIfPresent('search', input.filters.search)
  appendIfPresent('author', input.filters.author)
  appendIfPresent('dateFrom', input.filters.dateFrom)
  appendIfPresent('dateTo', input.filters.dateTo)
  appendIfPresent('sortBy', input.filters.sortBy)

  return params.toString()
}

export function toggleSelectionId(current: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(current)

  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }

  return next
}

export function toggleSelectAllIds(ids: string[], current: ReadonlySet<string>): Set<string> {
  if (ids.length > 0 && ids.every(id => current.has(id))) {
    return new Set()
  }

  return new Set(ids)
}

export function getBlogStatusBadgeClass(status: string): string {
  switch (status) {
    case 'PUBLISHED':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'DRAFT':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 'ARCHIVED':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }
}

export function getBlogStatusLabel(status: string, t: (key: string) => string): string {
  switch (status) {
    case 'PUBLISHED':
      return t('blog.postStatuses.published')
    case 'DRAFT':
      return t('blog.postStatuses.draft')
    case 'ARCHIVED':
      return t('blog.postStatuses.archived')
    default:
      return status
  }
}
