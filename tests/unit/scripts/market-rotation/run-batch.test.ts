/**
 * Unit tests for scripts/market-rotation/run-batch.ts
 *
 * Tests the core executeBatch logic without process.exit / console.log side effects.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { FullBatchResult } from '~/server/utils/market-rotation-batch'

// ─── Mocks ──────────────────────────────────────────────────────────

// Mock runFullBatch so we don't hit the DB or Yahoo Finance
vi.mock('~/server/utils/market-rotation-batch', () => ({
  runFullBatch: vi.fn(),
}))

// Mock prisma singleton so createBatchPrisma doesn't try to connect
vi.mock('~/lib/prisma', () => ({
  default: { _mockPrisma: true },
}))

import { executeBatch, parseBatchScope, type ExecuteBatchOptions } from '~/scripts/market-rotation/run-batch'
import { runFullBatch } from '~/server/utils/market-rotation-batch'

// ─── Helpers ────────────────────────────────────────────────────────

function makeFullBatchResult(overrides: Partial<FullBatchResult> = {}): FullBatchResult {
  return {
    results: [
      { rankScope: 'sectors', symbolCount: 11, upsertedCount: 11, comparisonDate: null, errors: [] },
      { rankScope: 'indexes', symbolCount: 3, upsertedCount: 3, comparisonDate: null, errors: [] },
      { rankScope: 'core', symbolCount: 5, upsertedCount: 5, comparisonDate: null, errors: [] },
    ],
    totalUpserted: 19,
    totalErrors: 0,
    ...overrides,
  }
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('parseBatchScope', () => {
  it('returns "all" for undefined scope', () => {
    expect(parseBatchScope(undefined)).toBe('all')
  })

  it('returns "all" for empty string', () => {
    expect(parseBatchScope('')).toBe('all')
  })

  it('returns valid scope as-is', () => {
    expect(parseBatchScope('sectors')).toBe('sectors')
    expect(parseBatchScope('indexes')).toBe('indexes')
    expect(parseBatchScope('core')).toBe('core')
    expect(parseBatchScope('all')).toBe('all')
  })

  it('throws on invalid scope', () => {
    expect(() => parseBatchScope('nonsense')).toThrow(/Invalid scope/)
  })
})

describe('executeBatch', () => {
  const mockPrisma = { _mockPrisma: true } as any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls runFullBatch and returns structured output for scope=all', async () => {
    const fakeResult = makeFullBatchResult()
    vi.mocked(runFullBatch).mockResolvedValue(fakeResult)

    const options: ExecuteBatchOptions = {
      prisma: mockPrisma,
      scope: 'all',
    }

    const output = await executeBatch(options)

    expect(runFullBatch).toHaveBeenCalledWith(mockPrisma)
    expect(runFullBatch).toHaveBeenCalledTimes(1)
    expect(output.success).toBe(true)
    expect(output.scope).toBe('all')
    expect(output.totalUpserted).toBe(19)
    expect(output.totalErrors).toBe(0)
    expect(output.results).toHaveLength(3)
    expect(output.results?.[0]?.rankScope).toBe('sectors')
  })

  it('returns individual scope result when scope is not "all"', async () => {
    const fakeResult = makeFullBatchResult()
    vi.mocked(runFullBatch).mockResolvedValue(fakeResult)

    const options: ExecuteBatchOptions = {
      prisma: mockPrisma,
      scope: 'sectors',
    }

    const output = await executeBatch(options)

    // runFullBatch runs all scopes internally; we extract the matching one
    expect(runFullBatch).toHaveBeenCalledWith(mockPrisma)
    expect(output.success).toBe(true)
    expect(output.scope).toBe('sectors')
    expect(output.totalUpserted).toBe(11)
    expect(output.totalErrors).toBe(0)
    expect(output.results).toHaveLength(1)
    expect(output.results?.[0]?.rankScope).toBe('sectors')
  })

  it('propagates errors as failure output with errorMessage', async () => {
    vi.mocked(runFullBatch).mockRejectedValue(new Error('DB connection refused'))

    const options: ExecuteBatchOptions = {
      prisma: mockPrisma,
      scope: 'all',
    }

    const output = await executeBatch(options)

    expect(output.success).toBe(false)
    expect(output.scope).toBe('all')
    expect(output.errorMessage).toBe('DB connection refused')
    expect(output.totalUpserted).toBe(0)
    expect(output.totalErrors).toBe(1)
  })

  it('handles non-Error rejections with String fallback', async () => {
    vi.mocked(runFullBatch).mockRejectedValue('string error')

    const options: ExecuteBatchOptions = {
      prisma: mockPrisma,
      scope: 'all',
    }

    const output = await executeBatch(options)

    expect(output.success).toBe(false)
    expect(output.errorMessage).toBe('string error')
  })
})

describe('executeBatch date stamping', () => {
  const mockPrisma = { _mockPrisma: true } as any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('includes a startedAt and durationMs in output', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-14T21:30:00Z'))

    const fakeResult = makeFullBatchResult()
    vi.mocked(runFullBatch).mockImplementation(async () => {
      // Simulate 2 seconds of work
      vi.advanceTimersByTime(2000)
      return fakeResult
    })

    const output = await executeBatch({ prisma: mockPrisma, scope: 'all' })

    expect(output.startedAt).toBe('2026-06-14T21:30:00.000Z')
    expect(output.durationMs).toBeGreaterThanOrEqual(2000)
  })
})
