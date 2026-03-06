type CacheEntry<T> = {
  value: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()
const MAX_CACHE_ENTRIES = 500

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

export function getCacheSize(): number {
  return cache.size
}
