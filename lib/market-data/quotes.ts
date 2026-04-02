import { fetchTwseRegularMarketPrice, isTwseEquitySymbol } from '~/lib/market-data/twse'
import { fetchQuote } from '~/lib/yahoo-finance'

interface FetchMarketPriceOptions {
  fetchYahooPrice?: (symbol: string) => Promise<number | null>
  fetchTwsePrice?: (symbol: string) => Promise<number | null>
}

/**
 * @deprecated Use `fetchQuote` from `~/lib/yahoo-finance` instead.
 * This function is kept for backward compatibility and testing purposes only.
 * Will be removed in v2.0.0.
 */
export async function fetchMarketPrice(
  symbol: string,
  options: FetchMarketPriceOptions = {}
): Promise<number | null> {
  if (isTwseEquitySymbol(symbol)) {
    return (options.fetchTwsePrice ?? fetchTwseRegularMarketPrice)(symbol)
  }

  if (options.fetchYahooPrice) {
    return options.fetchYahooPrice(symbol)
  }

  try {
    const quote = await fetchQuote(symbol)
    return quote.regularMarketPrice
  } catch {
    return null
  }
}
