import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('trade plan page contract', () => {
  it('defines the list, new, and detail pages', () => {
    for (const file of [
      'pages/trade-plans/index.vue',
      'pages/trade-plans/new.vue',
      'pages/trade-plans/[id].vue',
    ]) {
      const content = readFileSync(resolve(process.cwd(), file), 'utf8')
      expect(content).toContain("middleware: 'auth'")
    }
  })

  it('keeps the trade plan form deterministic and manual', () => {
    const content = readFileSync(resolve(process.cwd(), 'components/TradePlanForm.vue'), 'utf8')

    expect(content).toContain('tradePlan.fields.symbol')
    expect(content).toContain('tradePlan.fields.stopLoss')
    expect(content).toContain('tradePlan.fields.invalidationCondition')
    expect(content).not.toMatch(/ai|llm|generate|auto-summary/i)
  })

  it('links from an owned diary and only trusts structured route context', () => {
    const diary = readFileSync(resolve(process.cwd(), 'pages/diaries/[id]/index.vue'), 'utf8')
    const create = readFileSync(resolve(process.cwd(), 'pages/trade-plans/new.vue'), 'utf8')

    expect(diary).toContain("path: '/trade-plans/new'")
    expect(diary).toContain("query: { diaryId: String(diary.value?.id ?? id) }")
    expect(diary).toContain("tradePlan.actions.createFromDiary")
    expect(create).toContain("String(diary.id) === queryValue('diaryId')")
    expect(create).toContain('routeDiary.value ?? await $fetch(`/api/diaries/${encodeURIComponent(diaryId)}`)')
    expect(create).toContain('uniqueStructuredSymbol(ownedDiary)')
    expect(create).toContain('diary?.transactions')
    expect(create).toContain('symbols.size === 1')
    expect(create).not.toContain("queryValue('symbol')")
    expect(create).not.toMatch(/diary\.(content|title|thesis|risk|execution).*symbol/i)
  })

  it('keeps the context-free new-plan flow unlinked and position-sizing prefill intact', () => {
    const create = readFileSync(resolve(process.cwd(), 'pages/trade-plans/new.vue'), 'utf8')

    expect(create).toContain("diaryId: routePrefill.value?.diaryId ?? ''")
    expect(create).toContain("sessionStorage.getItem('tradePlanPrefill')")
    expect(create).toContain("statePrefill.value.symbol ?? ''")
  })

  it('resolves Diary route context before mounting a stable form prefill', () => {
    const create = readFileSync(resolve(process.cwd(), 'pages/trade-plans/new.vue'), 'utf8')

    expect(create).toContain('v-if="resolvingDiaryContext"')
    expect(create).toContain('routePrefill.value = {')
    expect(create).toContain('resolvingDiaryContext.value = false')
    expect(create).not.toContain('symbol: routeDiary.value ?')
  })

  it('shows compact Decision context only for linked Trade Plans', () => {
    const detail = readFileSync(resolve(process.cwd(), 'pages/trade-plans/[id].vue'), 'utf8')

    expect(detail).toContain('<template v-else-if="tradePlan">')
    expect(detail).toContain('<LedgerCard v-if="tradePlan.diary"')
    expect(detail).not.toContain('<TradePlanForm\n      v-else-if')
    expect(detail).toContain('tradePlan.decisionContext.title')
    expect(detail).toContain('tradePlan.decisionContext.recordedTransactions')
    expect(detail).toContain(':to="`/diaries/${tradePlan.diary.id}`"')
    expect(detail).toContain('tradePlan.decisionContext.viewDecision')
    expect(detail).not.toMatch(/tradePlan\.diary\.(content|thesis|risk|execution|reviewSummary|reviewLearning|reviewAdjustment|transactions)/)
    expect(detail).not.toMatch(/executed by|execution of this plan|produced by/i)
  })
})
