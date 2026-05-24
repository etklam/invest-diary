type CacheEntry<T> = {
  value: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()
const MAX_CACHE_ENTRIES = 500
const NEW_YORK_TIME_ZONE = 'America/New_York'
const QUOTE_MARKET_HOURS_TTL_SECONDS = 5 * 60
const MAX_MARKET_DATA_TTL_SECONDS = 24 * 60 * 60
const MIN_MARKET_DATA_TTL_SECONDS = 60

type MarketDataCacheKind = 'historical' | 'quote'

type NewYorkDateTimeParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  dayOfWeek: number
}

const newYorkFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: NEW_YORK_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

function evictIfNeeded(nextKey: string): void {
  if (cache.has(nextKey)) return
  if (cache.size < MAX_CACHE_ENTRIES) return

  const oldestKey = cache.keys().next().value as string | undefined
  if (oldestKey) {
    cache.delete(oldestKey)
  }
}

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null

  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }

  return entry.value as T
}

export function setCached<T>(key: string, value: T, ttlSeconds = 900): void {
  clearExpired()
  evictIfNeeded(key)

  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  })
}

export function clearExpired(): void {
  const now = Date.now()
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiresAt) {
      cache.delete(key)
    }
  }
}

export function clearCache(): void {
  cache.clear()
}

export function getCacheSize(): number {
  return cache.size
}

export function buildMarketQuoteCacheKey(symbol: string): string {
  return `market:quote:${normalizeMarketCachePart(symbol)}`
}

export function buildMarketHistoricalCacheKey(symbol: string, range: string): string {
  return `market:historical:${normalizeMarketCachePart(symbol)}:${normalizeMarketCachePart(range).toLowerCase()}`
}

export function shouldBypassCache(nocache: unknown): boolean {
  return nocache === '1' || nocache === 1 || nocache === true || nocache === 'true'
}

export async function getOrSetCached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
  bypassCache = false
): Promise<T> {
  if (!bypassCache) {
    const cached = getCached<T>(key)
    if (cached !== null) {
      return cached
    }
  }

  const fresh = await fetcher()
  setCached(key, fresh, ttlSeconds)
  return fresh
}

export function getMarketDataCacheTtlSeconds(kind: MarketDataCacheKind, now = new Date()): number {
  const nyNow = getNewYorkDateTimeParts(now)

  if (kind === 'quote' && isWeekday(nyNow) && isDuringMarketHours(nyNow)) {
    return QUOTE_MARKET_HOURS_TTL_SECONDS
  }

  const target = kind === 'quote'
    ? getNextQuoteRefreshTime(nyNow)
    : getNextHistoricalRefreshTime(nyNow)
  const ttlSeconds = Math.ceil((target.getTime() - now.getTime()) / 1000)

  return Math.min(
    MAX_MARKET_DATA_TTL_SECONDS,
    Math.max(MIN_MARKET_DATA_TTL_SECONDS, ttlSeconds)
  )
}

const BOARD_CACHE_MARKET_HOURS_TTL_SECONDS = 15 * 60
const BOARD_CACHE_ALL_FAILED_TTL_SECONDS = 5 * 60

export function getBoardCacheTtlSeconds(allFailed: boolean, now = new Date()): number {
  if (allFailed) {
    return BOARD_CACHE_ALL_FAILED_TTL_SECONDS
  }

  const nyNow = getNewYorkDateTimeParts(now)

  if (isWeekday(nyNow) && isDuringMarketHours(nyNow)) {
    return BOARD_CACHE_MARKET_HOURS_TTL_SECONDS
  }

  const target = getNextHistoricalRefreshTime(nyNow)
  const ttlSeconds = Math.ceil((target.getTime() - now.getTime()) / 1000)

  return Math.min(
    MAX_MARKET_DATA_TTL_SECONDS,
    Math.max(MIN_MARKET_DATA_TTL_SECONDS, ttlSeconds)
  )
}

function normalizeMarketCachePart(value: string): string {
  return value.trim().toUpperCase()
}

function getNewYorkDateTimeParts(date: Date): NewYorkDateTimeParts {
  const formatted = newYorkFormatter.formatToParts(date)
  const parts = Object.fromEntries(
    formatted
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, Number(part.value)])
  ) as Record<string, number>
  const year = requireDatePart(parts, 'year')
  const month = requireDatePart(parts, 'month')
  const day = requireDatePart(parts, 'day')
  const hour = requireDatePart(parts, 'hour')
  const minute = requireDatePart(parts, 'minute')
  const second = requireDatePart(parts, 'second')

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    dayOfWeek: getDayOfWeek(year, month, day),
  }
}

function requireDatePart(parts: Record<string, number>, name: string): number {
  const value = parts[name]
  if (typeof value !== 'number') {
    throw new Error(`Missing New York date part: ${name}`)
  }
  return value
}

function getDayOfWeek(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

function isWeekday(parts: NewYorkDateTimeParts): boolean {
  return parts.dayOfWeek >= 1 && parts.dayOfWeek <= 5
}

function isDuringMarketHours(parts: NewYorkDateTimeParts): boolean {
  const minutes = parts.hour * 60 + parts.minute
  return minutes >= 9 * 60 + 30 && minutes < 16 * 60
}

function getNextQuoteRefreshTime(parts: NewYorkDateTimeParts): Date {
  if (!isWeekday(parts)) {
    const monday = addNewYorkDays(parts, daysUntilNextWeekday(parts.dayOfWeek))
    return newYorkLocalTimeToUtc(monday.year, monday.month, monday.day, 16, 30)
  }

  const minutes = parts.hour * 60 + parts.minute
  if (minutes < 10 * 60) {
    return newYorkLocalTimeToUtc(parts.year, parts.month, parts.day, 10, 0)
  }

  const nextTradingDay = addNewYorkDays(parts, daysUntilNextTradingDay(parts.dayOfWeek))
  return newYorkLocalTimeToUtc(nextTradingDay.year, nextTradingDay.month, nextTradingDay.day, 10, 0)
}

function getNextHistoricalRefreshTime(parts: NewYorkDateTimeParts): Date {
  if (!isWeekday(parts)) {
    const monday = addNewYorkDays(parts, daysUntilNextWeekday(parts.dayOfWeek))
    return newYorkLocalTimeToUtc(monday.year, monday.month, monday.day, 16, 30)
  }

  const minutes = parts.hour * 60 + parts.minute
  if (minutes < 16 * 60 + 30) {
    return newYorkLocalTimeToUtc(parts.year, parts.month, parts.day, 16, 30)
  }

  const nextTradingDay = addNewYorkDays(parts, daysUntilNextTradingDay(parts.dayOfWeek))
  return newYorkLocalTimeToUtc(nextTradingDay.year, nextTradingDay.month, nextTradingDay.day, 16, 30)
}

function daysUntilNextWeekday(dayOfWeek: number): number {
  if (dayOfWeek === 6) return 2
  if (dayOfWeek === 0) return 1
  return 0
}

function daysUntilNextTradingDay(dayOfWeek: number): number {
  if (dayOfWeek === 5) return 3
  if (dayOfWeek === 6) return 2
  return 1
}

function addNewYorkDays(parts: NewYorkDateTimeParts, days: number): Pick<NewYorkDateTimeParts, 'year' | 'month' | 'day'> {
  const nextDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days))
  return {
    year: nextDate.getUTCFullYear(),
    month: nextDate.getUTCMonth() + 1,
    day: nextDate.getUTCDate(),
  }
}

function newYorkLocalTimeToUtc(year: number, month: number, day: number, hour: number, minute: number): Date {
  const localTimestamp = Date.UTC(year, month - 1, day, hour, minute, 0)
  let utcTimestamp = localTimestamp

  // 用 IANA 時區換算，避免美東夏令時間把固定 UTC offset 搞翻車。
  for (let i = 0; i < 2; i += 1) {
    const offset = getNewYorkOffsetMs(new Date(utcTimestamp))
    utcTimestamp = localTimestamp - offset
  }

  return new Date(utcTimestamp)
}

function getNewYorkOffsetMs(date: Date): number {
  const parts = getNewYorkDateTimeParts(date)
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  )

  return asUtc - date.getTime()
}
