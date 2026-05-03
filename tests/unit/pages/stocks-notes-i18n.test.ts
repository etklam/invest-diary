import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const stockNotesFiles = [
  'pages/stocks/[symbol].vue',
  'components/stocks/StockNoteItem.vue',
  'components/stocks/StockNoteList.vue',
]

describe('stock notes i18n keys', () => {
  it('uses the existing stock.notes namespace instead of the missing stocks.notes namespace', () => {
    for (const file of stockNotesFiles) {
      const content = readFileSync(resolve(process.cwd(), file), 'utf8')

      expect(content).toContain('stock.notes.')
      expect(content).not.toContain('stocks.notes.')
    }
  })
})
