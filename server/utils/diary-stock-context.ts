import type { Prisma } from '@prisma/client'
import { Errors } from '~/lib/errors/factory'
import { normalizeStockSymbol } from '~/lib/stocks/symbols'

export const MAX_DIARY_COMPANIES = 10

export function normalizeDiaryStockSymbols(values: unknown): string[] {
  if (values === undefined || values === null) return []
  if (!Array.isArray(values)) {
    throw Errors.validationError([{ field: 'stockSymbols', message: 'stockSymbols must be an array' }])
  }
  if (values.length > MAX_DIARY_COMPANIES * 2) {
    throw Errors.validationError([{
      field: 'stockSymbols',
      message: `At most ${MAX_DIARY_COMPANIES} Companies can be linked`,
    }])
  }

  const symbols = [...new Set(values.map((value, index) => {
    if (typeof value !== 'string') {
      throw Errors.validationError([{
        field: `stockSymbols.${index}`,
        message: 'Company symbol must be a string',
      }])
    }
    try {
      const symbol = normalizeStockSymbol(value)
      if (!/^[A-Z0-9][A-Z0-9. -]{0,31}$/.test(symbol)) throw new Error('invalid symbol')
      return symbol
    } catch {
      throw Errors.validationError([{
        field: `stockSymbols.${index}`,
        message: 'Invalid Company symbol',
        value,
      }])
    }
  }))]

  if (symbols.length > MAX_DIARY_COMPANIES) {
    throw Errors.validationError([{
      field: 'stockSymbols',
      message: `At most ${MAX_DIARY_COMPANIES} Companies can be linked`,
    }])
  }
  return symbols
}

async function resolveStockIds(tx: Prisma.TransactionClient, symbols: string[]) {
  const ids: bigint[] = []
  for (const symbol of symbols) {
    const stock = await tx.stock.upsert({
      where: { symbol },
      update: {},
      create: { symbol },
      select: { id: true },
    })
    ids.push(stock.id)
  }
  return ids
}

/** Replace context only from an explicit Full Diary edit. */
export async function replaceDiaryStockContexts(
  tx: Prisma.TransactionClient,
  diaryId: bigint,
  symbols: string[],
) {
  const stockIds = await resolveStockIds(tx, symbols)
  await tx.diaryStock.deleteMany({ where: { diaryId } })
  if (stockIds.length) {
    await tx.diaryStock.createMany({
      data: stockIds.map(stockId => ({ diaryId, stockId })),
      skipDuplicates: true,
    })
  }
}

/** Same-day Quick Note append only adds context; it never removes old links. */
export async function unionDiaryStockContexts(
  tx: Prisma.TransactionClient,
  diaryId: bigint,
  symbols: string[],
) {
  if (!symbols.length) return
  const stockIds = await resolveStockIds(tx, symbols)
  await tx.diaryStock.createMany({
    data: stockIds.map(stockId => ({ diaryId, stockId })),
    skipDuplicates: true,
  })
}
