import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('tools etf profile v2 ui contract', () => {
  it('renders risk/valuation/rs sections', () => {
    const filePath = resolve(process.cwd(), 'pages/tools/etf.vue')
    const content = readFileSync(filePath, 'utf8')

    expect(content).toContain("tools.etf.profile.riskTitle")
    expect(content).toContain("tools.etf.profile.valuationTitle")
    expect(content).toContain("tools.etf.profile.rsTitle")
  })
})
