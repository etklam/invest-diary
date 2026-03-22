import { describe, expect, it } from 'vitest'
import { buildAdminBlogQueryString, toggleSelectionId, toggleSelectAllIds } from '~/lib/admin/blog-management'
import { buildAdminUsersQueryString, resolveReloadPageAfterDelete } from '~/lib/admin/user-management'

describe('admin page helpers', () => {
  it('builds users query strings without empty search values', () => {
    expect(buildAdminUsersQueryString({
      page: 2,
      limit: 10,
      search: ' alice@example.com ',
    })).toBe('page=2&limit=10&search=alice%40example.com')

    expect(buildAdminUsersQueryString({
      page: 1,
      limit: 20,
      search: '   ',
    })).toBe('page=1&limit=20')
  })

  it('computes the correct reload page after deleting the last visible row', () => {
    expect(resolveReloadPageAfterDelete({
      currentPage: 3,
      totalPages: 3,
      visibleCount: 1,
    })).toBe(2)

    expect(resolveReloadPageAfterDelete({
      currentPage: 2,
      totalPages: 3,
      visibleCount: 4,
    })).toBe(2)
  })

  it('builds admin blog query strings from active filters only', () => {
    expect(buildAdminBlogQueryString({
      page: 1,
      limit: 20,
      filters: {
        status: 'PUBLISHED',
        category: '',
        search: 'alpha',
        author: '',
        dateFrom: '2026-01-01',
        dateTo: '',
        sortBy: 'createdAt_desc',
      },
    })).toBe('page=1&limit=20&status=PUBLISHED&search=alpha&dateFrom=2026-01-01&sortBy=createdAt_desc')
  })

  it('toggles per-row and select-all selection sets immutably', () => {
    const selected = toggleSelectionId(new Set(['1']), '2')
    expect(Array.from(selected).sort()).toEqual(['1', '2'])

    const cleared = toggleSelectionId(selected, '1')
    expect(Array.from(cleared)).toEqual(['2'])

    expect(Array.from(toggleSelectAllIds(['1', '2'], new Set(['1']))).sort()).toEqual(['1', '2'])
    expect(Array.from(toggleSelectAllIds(['1', '2'], new Set(['1', '2'])))).toEqual([])
  })
})
