import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('Timeline-first page contracts', () => {
  it('keeps the selected Pair View partner in the route query without a duplicate refresh', () => {
    const compare = source('pages/timeline/compare.vue')
    expect(compare).toContain("...(value ? { partnerId: value } : { partnerId: undefined })")
    expect(compare).toContain("watch(() => data.value?.selectedPartnerId")
    expect(compare).not.toContain('refresh()')
  })

  it('uses the shared Quick Diary launcher while preserving Calendar context', () => {
    const calendar = source('pages/calendar.vue')
    expect(calendar).toContain("source: 'calendar'")
    expect(calendar).toContain('...(date ? { date } : {})')
    expect(calendar).not.toContain('<QuickDiaryModal')
  })

  it('keeps Diaries focused on library behavior instead of dashboard summary data', () => {
    const diaries = source('pages/diaries/index.vue')
    expect(diaries).not.toContain("'/api/diaries/summary'")
    expect(diaries).not.toContain('desk.nextMove')
    expect(diaries).not.toContain('desk.rules')
    expect(diaries).toContain("$t('desk.filter.title')")
  })

  it('teaches the Timeline-first workflow on How to Use', () => {
    const guide = source('pages/how-to-use.vue')
    expect(guide).toContain('AUTHENTICATED_HOME_ROUTE')
    expect(guide).toContain("timeline: { link: '/timeline'")
    expect(guide).toContain("'/timeline/compare'")
    expect(guide).not.toContain("isAuthenticated.value ? '/diaries'")
  })
})
