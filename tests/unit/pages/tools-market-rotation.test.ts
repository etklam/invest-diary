import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('tools Market Rotation Monitor ui contract', () => {
  it('renders rotation monitor controls and indicator columns', () => {
    const filePath = resolve(process.cwd(), 'pages/tools/market-rotation.vue')
    const content = readFileSync(filePath, 'utf8')

    expect(content).toContain("t('marketRotation.title')")
    expect(content).toContain("t('marketRotation.scopes.sectors')")
    expect(content).toContain("t('marketRotation.columns.rsi')")
    expect(content).toContain("t('marketRotation.columns.rank')")
    expect(content).toContain("t('marketRotation.columns.maStatus')")
    expect(content).toContain("t('marketRotation.columns.signal')")
    expect(content).toContain("t('marketRotation.columns.trend2W')")
    expect(content).toContain("t('marketRotation.summary.exportPng')")
    expect(content).toContain("t('marketRotation.summary.copyTable')")
    expect(content).toContain("t('marketRotation.summary.currentTitle')")
    expect(content).toContain("t('marketRotation.summary.topImproving')")
    expect(content).toContain("t('marketRotation.summary.bottomWeakening')")
    expect(content).toContain('sticky top-0')
    expect(content).not.toContain('<MarketStateSection')
    expect(content).not.toContain("label: 'Core ETFs'")
    expect(content).toContain('formatRankDelta')
    expect(content).toContain('formatPointDelta')
    expect(content).toContain("marketRotation.export.marketSummary")
    expect(content).toContain("marketRotation.export.breadthCondition")
    expect(content).toContain("marketRotation.export.rankScope")
    expect(content).not.toContain('BetaCockpitCard')
    expect(content).not.toContain('betaAllocation')
  })
})
