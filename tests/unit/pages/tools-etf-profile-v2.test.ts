import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('tools Market Rotation Monitor ui contract', () => {
  it('renders rotation monitor controls and indicator columns', () => {
    const filePath = resolve(process.cwd(), 'pages/tools/etf.vue')
    const content = readFileSync(filePath, 'utf8')

    expect(content).toContain('Market Rotation Monitor')
    expect(content).toContain('US Sectors')
    expect(content).toContain('RSI')
    expect(content).toContain('RANK')
    expect(content).toContain('MA Status')
    expect(content).toContain('Signal')
    expect(content).toContain('2W Trend')
    expect(content).toContain('Export PNG')
    expect(content).toContain('Copy Table')
    expect(content).toContain('Current Market Summary')
    expect(content).toContain('Top Improving')
    expect(content).toContain('Bottom Weakening')
    expect(content).toContain('sticky top-0')
    expect(content).not.toContain('<MarketStateSection')
    expect(content).not.toContain("label: 'Core ETFs'")
    expect(content).toContain('formatRankDelta')
    expect(content).toContain('formatPointDelta')
    expect(content).toContain('Market Summary')
    expect(content).toContain('Breadth Condition')
    expect(content).toContain('Rank Scope')
  })
})
