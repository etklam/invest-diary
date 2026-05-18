import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('tools ETF sector trend board ui contract', () => {
  it('renders sector matrix controls and indicator columns', () => {
    const filePath = resolve(process.cwd(), 'pages/tools/etf.vue')
    const content = readFileSync(filePath, 'utf8')

    expect(content).toContain('ETF Sector Trend Board')
    expect(content).toContain('US Sectors')
    expect(content).toContain('RSI')
    expect(content).toContain('10d EMA')
    expect(content).toContain('20d EMA')
    expect(content).toContain('50d SMA')
    expect(content).toContain('Export PNG')
    expect(content).toContain('Copy Table')
    expect(content).toContain('Mini Chart')
    expect(content).toContain('sticky top-0')
  })
})
