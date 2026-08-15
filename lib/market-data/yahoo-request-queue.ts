/**
 * Centralized Yahoo Finance request control.
 *
 * All upstream Yahoo calls go through `runYahooRequest`. It provides three
 * guarantees that the raw `yahoo-finance2` client does not:
 *
 *  1. Concurrency cap — at most {@link MAX_CONCURRENCY} Yahoo requests in
 *     flight at any time. Without this, a single portfolio refresh (up to 25
 *     symbols) fans out into 25 parallel HTTP calls and trips Yahoo's
 *     rate limit.
 *  2. In-flight de-duplication — if two callers ask for the same key before
 *     the first settles, they share one upstream call. This protects both
 *     the UI (multiple components querying the same symbol) and schedulers.
 *  3. Bounded retry with backoff — transient failures (timeouts, connection
 *     resets, rate-limit bursts) are retried a small number of times with
 *     increasing delay, so a single hiccup does not bubble up as a 502.
 *
 * This module is server-side / internal only. It is deliberately lightweight
 * (no external deps) so a future migration to Redis or a paid provider can
 * swap the implementation without touching call sites.
 */

import { getYahooErrorMessage, isYahooRateLimitError } from './yahoo'

const MAX_CONCURRENCY = 2
const RETRY_COUNT = 2
const BACKOFF_MS = [500, 1500]

const inFlight = new Map<string, Promise<unknown>>()

let activeCount = 0
const waitQueue: Array<() => void> = []

function acquireSlot(): Promise<void> {
  if (activeCount < MAX_CONCURRENCY) {
    activeCount += 1
    return Promise.resolve()
  }
  return new Promise<void>((resolve) => {
    waitQueue.push(resolve)
  })
}

function releaseSlot(): void {
  const next = waitQueue.shift()
  if (next) {
    // transfer the slot directly to the next waiter; do not touch activeCount
    next()
  } else {
    activeCount -= 1
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Decide whether an error is worth retrying.
 *
 * Obvious permanent failures (404-style "not found", invalid symbol) are
 * skipped so we don't waste two extra Yahoo calls on a delisted ticker.
 * Everything else (timeouts, connection resets, generic upstream errors,
 * rate-limit bursts surfaced as plain Errors) is treated as transient.
 */
function isRetryableError(error: unknown): boolean {
  if (isYahooRateLimitError(error)) {
    return true
  }

  const message = getYahooErrorMessage(error)
  if (message.includes('not found') || message.includes('invalid symbol')) {
    return false
  }

  return true
}

async function executeWithRetry<T>(fetcher: () => Promise<T>): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= RETRY_COUNT; attempt += 1) {
    try {
      return await fetcher()
    } catch (error) {
      lastError = error
      if (attempt < RETRY_COUNT && isRetryableError(error)) {
        await sleep(BACKOFF_MS[attempt] ?? 1500)
        continue
      }
      break
    }
  }
  throw lastError
}

/**
 * Run a Yahoo upstream call under global concurrency + de-dup control.
 *
 * @param key     Stable request key (e.g. `quote:SPY`, `intraday:SPX:3:5m`).
 *                Two calls with the same key while the first is still in
 *                flight share a single upstream request.
 * @param fetcherThunk  No-arg function performing the actual Yahoo call.
 */
export async function runYahooRequest<T>(
  key: string,
  fetcherThunk: () => Promise<T>,
): Promise<T> {
  const existing = inFlight.get(key) as Promise<T> | undefined
  if (existing) {
    return existing
  }

  const promise = (async () => {
    await acquireSlot()
    try {
      return await executeWithRetry(fetcherThunk)
    } finally {
      releaseSlot()
    }
  })()

  inFlight.set(key, promise)

  // Cleanup must be attached with both handlers (not .finally) so the derived
  // promise always fulfills and never surfaces an unhandled rejection when the
  // caller intentionally awaits the rejection.
  const cleanup = () => {
    if (inFlight.get(key) === promise) {
      inFlight.delete(key)
    }
  }
  promise.then(cleanup, cleanup)

  return promise
}

// Exported for tests / diagnostics only.
export const __yahooQueueInternals = {
  MAX_CONCURRENCY,
  RETRY_COUNT,
  BACKOFF_MS,
}
