import { describe, expect, it } from 'vitest'
import {
  DIARY_REVIEW_STATUSES,
  DIARY_SORT_FIELDS,
  diaryListParamsSchema,
  type DiaryListResponse,
} from '~/types/diary'

describe('Diary list contract', () => {
  it('normalizes the current lax pagination and search behavior', () => {
    expect(diaryListParamsSchema.parse({
      page: 'not-a-page',
      limit: '101',
      search: `  ${'x'.repeat(501)}  `,
      sortBy: 'unknown',
    })).toEqual({
      page: 1,
      limit: 20,
      search: 'x'.repeat(500),
      sortBy: undefined,
    })
  })

  it('pins the query vocabulary and date format', () => {
    expect(DIARY_SORT_FIELDS).toEqual(['date-desc', 'date-asc', 'title-asc', 'title-desc'])
    expect(DIARY_REVIEW_STATUSES).toEqual(['none', 'pending', 'reviewed'])
    expect(diaryListParamsSchema.parse({
      page: '2.9',
      limit: '5.8',
      dateFrom: '2026-02-28',
      dateTo: '2026-03-01',
      reviewStatus: 'pending',
    })).toMatchObject({ page: 2, limit: 5 })
    expect(diaryListParamsSchema.safeParse({ dateFrom: '2026/02/28' }).success).toBe(false)
    expect(diaryListParamsSchema.safeParse({ reviewStatus: 'done' }).success).toBe(false)
  })

  it('pins the response envelope and pagination fields', () => {
    const response: DiaryListResponse = {
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    }

    expect(Object.keys(response)).toEqual(['data', 'pagination'])
    expect(Object.keys(response.pagination)).toEqual(['page', 'limit', 'total', 'totalPages'])
    expect(response).not.toHaveProperty('items')
    expect(response).not.toHaveProperty('cursor')
  })
})
