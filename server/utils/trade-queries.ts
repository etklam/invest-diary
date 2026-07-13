/**
 * server/utils/trade-queries.ts
 *
 * 共用的交易查詢與準備邏輯，供 stats endpoints 重複使用。
 *
 * 這個檔案保留舊 stats 呼叫端的相容名稱；實際 ownership/read contract
 * 已下沉到 transaction-read.ts，避免呼叫端自行拼 Prisma authorization。
 */
import {
  readExportTransactions,
  readRecentTradeTransactions,
  mapTransactionReadRow,
  type TransactionReadRow,
} from '~/server/utils/transaction-read'
import { normalizeSymbol } from '~/lib/position-state'

// ─── 型別定義 ─────────────────────────────────────────────────────────────

/** Legacy raw-row shape accepted by the matching preparation adapter. */
export interface RawTransactionRow {
  id: bigint | number | string
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: { valueOf(): number } | number
  price: { valueOf(): number } | number
  tradeDate: Date
  strategy?: string | null
  emotion?: string | null
}

// ─── 查詢函數 ─────────────────────────────────────────────────────────────

/**
 * findUserRawTransactions
 * Legacy compatibility wrapper. New code should call the purpose-specific
 * read functions in transaction-read.ts directly.
 *
 * @param userId - 用戶 ID（BigInt）
 * @param options.symbol - 可選，只查特定股票代碼
 * @returns Prisma 原始交易陣列（id 為 BigInt）
 */
export async function findUserRawTransactions(
  userId: bigint,
  options?: { symbol?: string },
): Promise<RawTransactionRow[]> {
  const symbol = options?.symbol?.trim() ? normalizeSymbol(options.symbol) : null
  return (symbol
    ? await readExportTransactions(userId, symbol)
    : await readRecentTradeTransactions(userId)) as RawTransactionRow[]
}

// ─── 轉換函數 ─────────────────────────────────────────────────────────────

/**
 * prepareTransactionsForMatching
 * 將 Prisma 原始交易列轉換為 matchTrades() 相容格式。
 *
 * - BigInt id → string（透過 .toString()）
 * - type 斷言為 'BUY' | 'SELL'
 *
 * @param rawTxs - Prisma 原始交易陣列
 * @returns matchTrades() 可用的交易陣列
 */
export function prepareTransactionsForMatching(rawTxs: RawTransactionRow[]) {
  return rawTxs.map(tx => mapTransactionReadRow(tx as TransactionReadRow))
}
