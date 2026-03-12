export type TransactionInput = {
  symbol?: string | null
  type?: string | null
  quantity?: number | null
}

export const validateTransactions = (
  transactions?: TransactionInput[]
): string | null => {
  if (!transactions || transactions.length === 0) return null

  const holdings = new Map<string, number>()

  for (const tx of transactions) {
    if (!tx?.symbol?.trim()) continue

    const symbol = tx.symbol.trim().toUpperCase()
    const current = holdings.get(symbol) ?? 0
    const quantity = tx.quantity ?? 0

    if (tx.type === 'BUY') {
      holdings.set(symbol, current + quantity)
      continue
    }

    if (tx.type === 'SELL') {
      const available = holdings.get(symbol) ?? 0
      if (available <= 0) {
        return `股票 ${symbol} 沒有持股可賣，請先添加買入記錄`
      }
      if (quantity > available) {
        return `股票 ${symbol} 賣出數量 (${quantity}) 超過持股數量 (${available})`
      }
      holdings.set(symbol, available - quantity)
    }
  }

  return null
}
