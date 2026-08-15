import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { mergeDiariesById } from '~/composables/useTimelineDiaries'

describe('mergeDiariesById', () => {
  it('appends each diary exactly once across repeated pages', () => {
    const page1 = [{ id: 1 }, { id: 2 }]
    const page2 = [{ id: 3 }, { id: 4 }]

    // loadMore twice with page 2 delivered twice (double-fetch regression guard)
    const once = mergeDiariesById(page1, page2)
    const twice = mergeDiariesById(once, page2)

    expect(twice.map(d => String(d.id))).toEqual(['1', '2', '3', '4'])
  })

  it('skips items the server re-sends in a later page (overlap guard)', () => {
    const existing = [{ id: '1' }, { id: '2' }]
    const incoming = [{ id: '2' }, { id: '3' }]

    expect(mergeDiariesById(existing, incoming).map(d => d.id)).toEqual(['1', '2', '3'])
  })

  it('treats numeric and string ids as the same id', () => {
    const existing = [{ id: 1 }]
    const incoming = [{ id: '1' }, { id: 2 }]

    expect(mergeDiariesById(existing, incoming).map(d => String(d.id))).toEqual(['1', '2'])
  })
})

describe('timeline date filtering contract', () => {
  it('sends date filters with the initial and paginated server requests', () => {
    const source = readFileSync(resolve(process.cwd(), 'composables/useTimelineDiaries.ts'), 'utf8')

    expect(source).toContain('query: requestQuery')
    expect(source).toContain('{ query: { ...requestQuery.value, page: String(nextPage) } }')
    expect(source).not.toContain('return diaryYmd >= filters.dateFrom')
    expect(source).not.toContain('return diaryYmd <= filters.dateTo')
  })
})
