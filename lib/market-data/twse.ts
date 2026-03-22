const TWSE_QUOTE_HEADERS = {
  Accept: 'application/json',
}

export function normalizeTwseSymbol(symbol: string): string {
  return symbol.replace(/\.TW$/i, '').trim()
}

export function isTwseEquitySymbol(symbol: string): boolean {
  return /^\d{4}(\.TW)?$/i.test(symbol.trim())
}

export function buildTwseQuoteUrl(symbol: string): string {
  return `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_${normalizeTwseSymbol(symbol)}.tw`
}

export function parseTwseQuotePrice(text: string): number | null {
  const jsonStart = text.indexOf('{')
  if (jsonStart < 0) return null

  const payload = JSON.parse(text.slice(jsonStart))
  const rawPrice = payload?.msgArray?.[0]?.z
  const price = Number.parseFloat(rawPrice)

  if (!Number.isFinite(price) || price <= 0) {
    return null
  }

  return price
}

async function defaultFetchTwseText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: TWSE_QUOTE_HEADERS,
  })

  return response.text()
}

export async function fetchTwseRegularMarketPrice(
  symbol: string,
  fetchText: (url: string) => Promise<string> = defaultFetchTwseText
): Promise<number | null> {
  try {
    const text = await fetchText(buildTwseQuoteUrl(symbol))
    return parseTwseQuotePrice(text)
  } catch {
    return null
  }
}
