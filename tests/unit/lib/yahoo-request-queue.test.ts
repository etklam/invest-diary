import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runYahooRequest } from '~/lib/market-data/yahoo-request-queue'

function createDeferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
} {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('runYahooRequest', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('deduplicates concurrent requests sharing the same key', async () => {
    const fetcher = vi.fn().mockResolvedValue('SPY-quote')

    const p1 = runYahooRequest('quote:SPY', fetcher)
    const p2 = runYahooRequest('quote:SPY', fetcher)

    // microtask flush so fetcher starts once
    await vi.advanceTimersByTimeAsync(0)

    expect(fetcher).toHaveBeenCalledTimes(1)

    expect(await p1).toBe('SPY-quote')
    expect(await p2).toBe('SPY-quote')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('limits concurrent Yahoo calls to 2 across different keys', async () => {
    const deferreds: Array<{
      promise: Promise<string>
      resolve: (value: string) => void
    }> = []

    const makeFetcher = (label: string) => () => {
      const d = createDeferred<string>()
      deferreds.push({ promise: d.promise, resolve: d.resolve })
      return d.promise
    }

    const p1 = runYahooRequest('a', makeFetcher('a'))
    const p2 = runYahooRequest('b', makeFetcher('b'))
    const p3 = runYahooRequest('c', makeFetcher('c'))
    const p4 = runYahooRequest('d', makeFetcher('d'))

    // flush microtasks: first two acquire slots, third and fourth queue
    await vi.advanceTimersByTimeAsync(0)
    expect(deferreds).toHaveLength(2)

    // releasing first frees a slot for the third
    deferreds[0].resolve('a-result')
    await vi.advanceTimersByTimeAsync(0)
    expect(deferreds).toHaveLength(3)

    // releasing second frees a slot for the fourth
    deferreds[1].resolve('b-result')
    await vi.advanceTimersByTimeAsync(0)
    expect(deferreds).toHaveLength(4)

    deferreds[2].resolve('c-result')
    deferreds[3].resolve('d-result')

    await expect(p1).resolves.toBe('a-result')
    await expect(p2).resolves.toBe('b-result')
    await expect(p3).resolves.toBe('c-result')
    await expect(p4).resolves.toBe('d-result')
  })

  it('retries transient failures with backoff (500ms then 1500ms)', async () => {
    let calls = 0
    const fetcher = vi.fn().mockImplementation(async () => {
      calls += 1
      if (calls < 3) throw new Error('network reset')
      return 'recovered'
    })

    const promise = runYahooRequest('retry-key', fetcher)

    // attempt 1 fires immediately and fails
    await vi.advanceTimersByTimeAsync(0)
    expect(fetcher).toHaveBeenCalledTimes(1)

    // 500ms backoff then attempt 2 fails
    await vi.advanceTimersByTimeAsync(500)
    expect(fetcher).toHaveBeenCalledTimes(2)

    // 1500ms backoff then attempt 3 succeeds
    await vi.advanceTimersByTimeAsync(1500)
    expect(fetcher).toHaveBeenCalledTimes(3)

    expect(await promise).toBe('recovered')
  })

  it('does not retry on permanent-looking failures', async () => {
    let calls = 0
    const fetcher = async () => {
      calls += 1
      throw new Error('Crashed! Error: Not Found symbol')
    }

    await expect(runYahooRequest('missing-key', fetcher)).rejects.toThrow('Not Found')

    expect(calls).toBe(1)
  })

  it('throws after exhausting retries on persistent transient failure', async () => {
    let calls = 0
    const fetcher = async () => {
      calls += 1
      throw new Error('timeout')
    }

    const promise = runYahooRequest('always-fail', fetcher)
    // prevent any phantom rejection surfacing between timer flushes
    promise.catch(() => {})

    // attempt 1
    await vi.advanceTimersByTimeAsync(0)
    expect(calls).toBe(1)
    // attempt 2 after 500ms
    await vi.advanceTimersByTimeAsync(500)
    expect(calls).toBe(2)
    // attempt 3 after 1500ms
    await vi.advanceTimersByTimeAsync(1500)
    expect(calls).toBe(3)

    await expect(promise).rejects.toThrow('timeout')
    expect(calls).toBe(3)
  })

  it('removes failed request from in-flight map so the next call is fresh', async () => {
    const fetcher = vi
      .fn()
      .mockImplementationOnce(async () => {
        throw new Error('not found')
      })
      .mockResolvedValueOnce('ok')

    await expect(runYahooRequest('reuse-key', fetcher)).rejects.toThrow('not found')

    // second call should start a new request, not get the dead promise
    const result = await runYahooRequest('reuse-key', fetcher)
    expect(result).toBe('ok')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('removes successful request from in-flight map after completion', async () => {
    const fetcher = vi.fn().mockResolvedValue('first')

    await expect(runYahooRequest('success-key', fetcher)).resolves.toBe('first')

    // a later call with same key should fetch again (no lingering resolved promise reuse)
    fetcher.mockResolvedValueOnce('second')
    await expect(runYahooRequest('success-key', fetcher)).resolves.toBe('second')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
