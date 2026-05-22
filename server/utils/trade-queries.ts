/**
 * server/utils/trade-queries.ts
 *
 * 共用的交易查詢與準備邏輯，供 stats endpoints 重複使用。
 *
 * 兩個 stats API（recent-trades、export-trades）共享完全相同的
 * Prisma 查詢 + 資料轉換 pipeline，抽出至此避免重複。
 */
import prisma from '~/lib/prisma'

// ─── 型別定義 ─────────────────────────────────────────────────────────────

/** Prisma 回傳的原始交易列（id 為 BigInt） */
export interface RawTransactionRow {
  id: bigint
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: { valueOf(): number } | number
  price: { valueOf(): number } | number
  tradeDate: Date
}

// ─── 查詢函數 ─────────────────────────────────────────────────────────────

/**
 * findUserRawTransactions
 * 查詢指定用戶的所有交易紀錄（直接持有 + 透過 diary 關聯）。
 *
 * @param userId - 用戶 ID（BigInt）
 * @param options.symbol - 可選，只查特定股票代碼
 * @returns Prisma 原始交易陣列（id 為 BigInt）
 */
export async function findUserRawTransactions(
  userId: bigint,
  options?: { symbol?: string },
): Promise<RawTransactionRow[]> {
  return prisma.transaction.findMany({
    where: {
      OR: [
        { userId },
        { diary: { userId } },
      ],
      ...(options?.symbol ? { symbol: options.symbol } : {}),
    },
    select: {
      id: true,
      symbol: true,
      type: true,
      quantity: true,
      price: true,
      tradeDate: true,
    },
    orderBy: { tradeDate: 'asc' },
  })
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
  return rawTxs.map(tx => ({
    ...tx,
    id: tx.id.toString(),
    type: tx.type as 'BUY' | 'SELL',
  }))
}
