interface AdminUsersQueryInput {
  page: number
  limit: number
  search?: string
}

interface ReloadPageInput {
  currentPage: number
  totalPages: number
  visibleCount: number
}

export function buildAdminUsersQueryString(input: AdminUsersQueryInput): string {
  const params = new URLSearchParams({
    page: input.page.toString(),
    limit: input.limit.toString(),
  })

  const search = input.search?.trim()
  if (search) {
    params.set('search', search)
  }

  return params.toString()
}

export function resolveReloadPageAfterDelete(input: ReloadPageInput): number {
  const isLastPage = input.currentPage === input.totalPages
  const isEmptyPage = input.visibleCount <= 1

  if (isLastPage && isEmptyPage && input.currentPage > 1) {
    return input.currentPage - 1
  }

  return input.currentPage
}
