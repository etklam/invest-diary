import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('Diary Decision Record contract', () => {
  it('keeps one semantic reading flow in decision order', () => {
    const page = source('pages/diaries/[id]/index.vue')
    const original = page.indexOf('heading-id="original-decision-title"')
    const plan = page.indexOf('heading-id="trade-plan-title"')
    const execution = page.indexOf('heading-id="actual-execution-title"')
    const review = page.indexOf('heading-id="decision-review-title"')

    expect(original).toBeGreaterThan(0)
    expect(original).toBeLessThan(plan)
    expect(plan).toBeLessThan(execution)
    expect(execution).toBeLessThan(review)
    expect(page).toContain('divide-y divide-dt-border')
    expect(source('components/DecisionRecordSection.vue')).toContain('<section :aria-labelledby="headingId"')
  })

  it('shows every real linked plan field while omitting empty values', () => {
    const page = source('pages/diaries/[id]/index.vue')

    expect(page).toContain('v-for="plan in tradePlans"')
    expect(page).toContain('tradePlanFields(plan).length')
    for (const field of [
      'setupType',
      'entryPrice',
      'entryZoneLow',
      'entryZoneHigh',
      'stopLoss',
      'targetPrice',
      'maxPositionSize',
      'invalidationCondition',
      'notes',
    ]) {
      expect(page).toContain(`plan.${field}`)
    }
    expect(page).toContain('hasValue(field.value)')
    expect(page).toContain('createTradePlanRoute')
  })

  it('separates intent from persisted execution and keeps holdings secondary', () => {
    const page = source('pages/diaries/[id]/index.vue')

    expect(page).toContain("diary.decisionRecord.executionIntent")
    expect(page).toContain('v-for="tx in transactions"')
    expect(page).toContain('transaction.notes')
    expect(page).toContain('transaction.strategy')
    expect(page).toContain('transaction.emotion')
    expect(page).toContain('<details class="group')
    expect(page).toContain('<HoldingsDisplay :transactions="holdingsTransactions"')
  })

  it('returns from a completed review to both Decision and Timeline', () => {
    const review = source('pages/diaries/[id]/review.vue')

    expect(review).toContain("review.page.nextActions")
    expect(review).toContain("review.page.viewDecision")
    expect(review).toContain("review.page.viewTimeline")
    expect(review).toContain('to="/timeline"')
  })
})
