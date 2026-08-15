/**
 * GET /api/stats/export-trades
 *
 * 匯出已關閉交易為 CSV 格式。
 *
 * Query params:
 *   symbol?  - 只匯出特定股票（選填）
 *
 * Response:
 *   Content-Type: text/csv
 *   Content-Disposition: attachment; filename="trades-YYYY-MM-DD.csv"
 */
import { handleApiError } from '~/server/utils/error-handler'
import { requireUser } from '~/server/utils/auth'
import { matchTrades } from '~/lib/trade-analytics'
import { logger } from '~/lib/logger'
import { readPortfolioTransactions } from '~/server/utils/transaction-read'

/** 轉義 CSV 欄位：若含逗號、換行或雙引號則用雙引號包圍 */
function csvEscape(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value)
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function csvRow(fields: (string | number | null | undefined)[]): string {
  return fields.map(csvEscape).join(',')
}

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)
  const user = requireUser(event)
  const userId = BigInt(user.id)

  const query = getQuery(event)
  const symbolFilter = typeof query.symbol === 'string'
    ? query.symbol.trim().toUpperCase()
    : null

  try {
    const rawTxs = await readPortfolioTransactions(userId, { symbol: symbolFilter })

    const closedTrades = matchTrades(rawTxs)

    // 按賣出日期升序排列
    const sorted = [...closedTrades].sort(
      (a, b) => a.sellDate.getTime() - b.sellDate.getTime()
    )

    // 建構 CSV 內容
    const header = csvRow([
      'symbol',
      'sellDate',
      'sellQuantity',
      'sellPrice',
      'avgCostBasis',
      'realizedPnL',
      'realizedPnLPct',
    ])

    const rows = sorted.map((t) =>
      csvRow([
        t.symbol,
        t.sellDate.toISOString().slice(0, 10),
        t.sellQuantity,
        t.sellPrice,
        t.avgCostBasis,
        Math.round(t.realizedPnL * 100) / 100,
        Math.round(t.realizedPnLPct * 100) / 100,
      ])
    )

    const csv = [header, ...rows].join('\n')

    // 設定下載標頭
    const today = new Date().toISOString().slice(0, 10)
    const filename = symbolFilter
      ? `trades-${symbolFilter}-${today}.csv`
      : `trades-${today}.csv`

    setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
    setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)

    return csv
  } catch (error) {
    handleApiError(error, log)
  }
})
