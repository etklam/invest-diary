import { describe, expect, it } from 'vitest'
import { uniqueSymbols } from '~/lib/marketbee/seed-universe-utils'

describe('uniqueSymbols', () => {
  it('修剪空白、轉大寫、去重並排序', () => {
    expect(uniqueSymbols([' msft ', 'AAPL', 'msft', '', '  ', 'brk-b'])).toEqual(['AAPL', 'BRK-B', 'MSFT'])
  })
})
