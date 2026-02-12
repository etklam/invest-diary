import YahooFinance from 'yahoo-finance2'

// yahoo-finance2 v3+ requires explicit instance
const yahooFinance = new YahooFinance()

type Body = {
  symbols: string[]
}

export default defineEventHandler(async (event) => {
  const body = await readBody<Body>(event)

  if (!body?.symbols || body.symbols.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No symbols provided' })
  }

  try {
    const quotes: any = await yahooFinance.quote(body.symbols)

    const result: Record<string, number> = {}
    const list = Array.isArray(quotes) ? quotes : [quotes]

    for (const quote of list) {
      if (quote?.symbol && typeof quote.regularMarketPrice === 'number') {
        result[quote.symbol] = quote.regularMarketPrice
      }
    }

    return result
  } catch (error) {
    console.error('Yahoo Finance error:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch stock prices' })
  }
})