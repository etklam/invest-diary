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
})
