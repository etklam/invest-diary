import { parseDiaryTags } from '~/lib/diary-tags'

export function attachDiaryTags<T extends { tagsString?: string | null }>(diary: T): T & { tags: string[] } {
  return {
    ...diary,
    tags: parseDiaryTags(diary.tagsString),
  }
}

export function attachDiaryStockSymbols<T extends {
  stockContexts?: Array<{ stock?: { symbol?: string | null } | null }>
}>(diary: T): T & { stockSymbols: string[] } {
  return {
    ...diary,
    stockSymbols: (diary.stockContexts ?? [])
      .map(context => context.stock?.symbol)
      .filter((symbol): symbol is string => Boolean(symbol)),
  }
}

export function attachDiaryMetadata<T extends {
  tagsString?: string | null
  stockContexts?: Array<{ stock?: { symbol?: string | null } | null }>
}>(diary: T) {
  return attachDiaryStockSymbols(attachDiaryTags(diary))
}
