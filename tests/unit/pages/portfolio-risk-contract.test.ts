import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('portfolio risk summary contract', () => {
  it('renders risk metrics on the stocks dashboard', () => {
    const content = readFileSync(resolve(process.cwd(), 'pages/stocks/index.vue'), 'utf8')

    expect(content).toContain('stock.riskSummary.title')
    expect(content).toContain('largestPositionPct')
    expect(content).toContain('top3ConcentrationPct')
    expect(content).toContain('activePositionCount')
    expect(content).toContain('concentrationWarning')
    expect(content).toContain('unrealizedAmount')
  })

  it('keeps risk summary deterministic and non-AI', () => {
    const content = readFileSync(resolve(process.cwd(), 'lib/stocks-view.ts'), 'utf8')

    expect(content).toContain('const pricedHoldings = holdings.filter(hasFiniteQuote)')
    expect(content).not.toContain('h.price * h.quantity : h.totalCost')
    expect(content).toContain('(largestPositionPct ?? 0) >= 25')
    expect(content).toContain('(top3ConcentrationPct ?? 0) >= 60')
    expect(content).not.toMatch(/openai|claude|gemini|llm|auto-summary/i)
  })
})
