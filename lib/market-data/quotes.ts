import { fetchTwseRegularMarketPrice, isTwseEquitySymbol } from '~/lib/market-data/twse'
import { fetchYahooRegularMarketPrice } from '~/lib/market-data/yahoo'

interface FetchMarketPriceOptions {
  fetchYahooPrice?: (symbol: string) => Promise<number | null>
  fetchTwsePrice?: (symbol: string) => Promise<number | null>
}

export async function fetchMarketPrice(
  symbol: string,
  options: FetchMarketPriceOptions = {}
): Promise<number | null> {
  if (isTwseEquitySymbol(symbol)) {
    return (options.fetchTwsePrice ?? fetchTwseRegularMarketPrice)(symbol)
  }

  return (options.fetchYahooPrice ?? fetchYahooRegularMarketPrice)(symbol)
}
