import { rateLimiters } from '~/lib/rate-limiter'
import { requireUser } from '~/server/utils/auth'

type Body = {
  symbols: string[]
}

const MAX_SYMBOLS_PER_REQUEST = 25

// Helper function to fetch Taiwan stock prices from TWSE
async function fetchTWStockPrice(symbol: string): Promise<number | null> {
  try {
    // Remove .TW suffix if present
    const stockNo = symbol.replace('.TW', '').replace('.tw', '')

    // Use TWSE real-time API
    const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_${stockNo}.tw`

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      }
    })

    const text = await response.text()
    const jsonStart = text.indexOf('{')
    const data = JSON.parse(text.substring(jsonStart))

    if (data.msgArray && data.msgArray.length > 0) {
      const stock = data.msgArray[0]
      // 'z' is the close price
      const price = parseFloat(stock.z)
      return price > 0 ? price : null
    }

    return null
  } catch (error) {
    console.error(`Failed to fetch TWSE price for ${symbol}:`, error)
    return null
  }
}

// Helper function to fetch US/Intl stock prices from Yahoo Finance
async function fetchYahooFinancePrice(symbol: string): Promise<number | null> {
  try {
    // Try using the search endpoint which is more reliable
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      }
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    if (data.chart?.result?.[0]?.meta?.regularMarketPrice) {
      return data.chart.result[0].meta.regularMarketPrice
    }

    return null
  } catch (error) {
    console.error(`Failed to fetch Yahoo Finance price for ${symbol}:`, error)
    return null
  }
}

export default defineEventHandler(async (event) => {
  requireUser(event)

  const body = await readBody<Body>(event)

  if (!body?.symbols || body.symbols.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No symbols provided' })
  }

  if (body.symbols.length > MAX_SYMBOLS_PER_REQUEST) {
    throw createError({
      statusCode: 400,
      statusMessage: `Maximum ${MAX_SYMBOLS_PER_REQUEST} symbols per request`,
    })
  }

  const ip = getRequestIP(event) || 'unknown'
  try {
    await rateLimiters.generalApi(ip)
  } catch {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many requests. Please try again later.',
    })
  }

  const result: Record<string, number> = {}
  const errors: string[] = []

  // Process symbols in parallel
  await Promise.all(
    body.symbols.map(async (symbol) => {
      try {
        let price: number | null = null

        // Check if it's a Taiwan stock (4-digit number with .TW suffix)
        const isTWStock = /^\d{4}(\.TW)?$/i.test(symbol)

        if (isTWStock) {
          // Use TWSE API for Taiwan stocks
          price = await fetchTWStockPrice(symbol)
        } else {
          // Use Yahoo Finance for US/Intl stocks
          price = await fetchYahooFinancePrice(symbol)
        }

        if (price !== null && price > 0) {
          result[symbol] = price
        } else {
          errors.push(symbol)
        }
      } catch (error) {
        console.error(`Error processing ${symbol}:`, error)
        errors.push(symbol)
      }
    })
  )

  if (Object.keys(result).length === 0) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch prices for all symbols. Errors: ${errors.join(', ')}`
    })
  }

  return result
})
