import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('admin ETF page route guard contract', () => {
  it('declares admin route middleware explicitly', () => {
    const filePath = resolve(process.cwd(), 'pages/admin/etf.vue')
    const content = readFileSync(filePath, 'utf8')

    expect(content).toContain("middleware: 'admin'")
  })
})
