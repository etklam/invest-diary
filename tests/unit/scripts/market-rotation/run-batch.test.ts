/**
 * Unit tests for scripts/market-rotation/run-batch.ts
 *
 * Tests the core executeBatch logic without process.exit / console.log side effects.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { BatchJobResult, FullBatchResult } from '~/server/utils/market-rotation-batch'

// ─── Mocks ──────────────────────────────────────────────────────────

// Mock runFullBatch / runScopeBatch so we don't hit the DB or Yahoo Finance
vi.mock('~/server/utils/market-rotation-batch', () => ({
  runFullBatch: vi.fn(),
  runScopeBatch: vi.fn(),
}))

// Mock prisma singleton so createBatchPrisma doesn't try to connect
vi.mock('~/lib/prisma', () => ({
  default: { _mockPrisma: true },
}))

import { executeBatch, parseBatchScope } from '~/scripts/market-rotation/run-batch'
import { runFullBatch, runScopeBatch } from '~/server/utils/market-rotation-batch'

// ─── Helpers ────────────────────────────────────────────────────────

function makeScopeResult(rankScope: 'sectors' | 'indexes' | 'core', overrides: Partial<BatchJobResult> = {}): BatchJobResult {
  const baseSymbolCount = rankScope === 'sectors' ? 11 : rankScope === 'indexes' ? 3 : 5
  return {
    rankScope,
    symbolCount: baseSymbolCount,
    upsertedCount: baseSymbolCount,
    comparisonDate: null,
    errors: [],
    ...overrides,
  }
}

function makeFullBatchResult(overrides: Partial<FullBatchResult> = {}): FullBatchResult {
  const results = [
    makeScopeResult('sectors'),
    makeScopeResult('indexes'),
    makeScopeResult('core'),
  ]
  return {
    results,
    totalUpserted: results.reduce((sum, r) => sum + r.upsertedCount, 0),
    totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
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

describe('executeBatch dispatch', () => {
  const mockPrisma = { _mockPrisma: true } as any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('scope=all calls runFullBatch only, not runScopeBatch', async () => {
    const fakeResult = makeFullBatchResult()
    vi.mocked(runFullBatch).mockResolvedValue(fakeResult)

    const output = await executeBatch({ prisma: mockPrisma, scope: 'all' })

    expect(runFullBatch).toHaveBeenCalledWith(mockPrisma)
    expect(runFullBatch).toHaveBeenCalledTimes(1)
    expect(runScopeBatch).not.toHaveBeenCalled()
    expect(output.success).toBe(true)
    expect(output.scope).toBe('all')
    expect(output.totalUpserted).toBe(19)
    expect(output.totalErrors).toBe(0)
    expect(output.results).toHaveLength(3)
    expect(output.results?.[0]?.rankScope).toBe('sectors')
  })

  it('scope=sectors calls runScopeBatch(prisma, "sectors") only, not runFullBatch', async () => {
    const fakeResult = makeScopeResult('sectors')
    vi.mocked(runScopeBatch).mockResolvedValue(fakeResult)

    const output = await executeBatch({ prisma: mockPrisma, scope: 'sectors' })

    expect(runScopeBatch).toHaveBeenCalledWith(mockPrisma, 'sectors')
    expect(runScopeBatch).toHaveBeenCalledTimes(1)
    expect(runFullBatch).not.toHaveBeenCalled()
    expect(output.success).toBe(true)
    expect(output.scope).toBe('sectors')
    expect(output.totalUpserted).toBe(11)
    expect(output.totalErrors).toBe(0)
    expect(output.results).toHaveLength(1)
    expect(output.results?.[0]?.rankScope).toBe('sectors')
  })

  it('scope=indexes calls runScopeBatch(prisma, "indexes") only, not runFullBatch', async () => {
    const fakeResult = makeScopeResult('indexes')
    vi.mocked(runScopeBatch).mockResolvedValue(fakeResult)

    const output = await executeBatch({ prisma: mockPrisma, scope: 'indexes' })

    expect(runScopeBatch).toHaveBeenCalledWith(mockPrisma, 'indexes')
    expect(runScopeBatch).toHaveBeenCalledTimes(1)
    expect(runFullBatch).not.toHaveBeenCalled()
    expect(output.success).toBe(true)
    expect(output.scope).toBe('indexes')
    expect(output.totalUpserted).toBe(3)
    expect(output.totalErrors).toBe(0)
    expect(output.results).toHaveLength(1)
    expect(output.results?.[0]?.rankScope).toBe('indexes')
  })

  it('scope=core calls runScopeBatch(prisma, "core") only, not runFullBatch', async () => {
    const fakeResult = makeScopeResult('core')
    vi.mocked(runScopeBatch).mockResolvedValue(fakeResult)

    const output = await executeBatch({ prisma: mockPrisma, scope: 'core' })

    expect(runScopeBatch).toHaveBeenCalledWith(mockPrisma, 'core')
    expect(runScopeBatch).toHaveBeenCalledTimes(1)
    expect(runFullBatch).not.toHaveBeenCalled()
    expect(output.success).toBe(true)
    expect(output.scope).toBe('core')
    expect(output.totalUpserted).toBe(5)
    expect(output.totalErrors).toBe(0)
    expect(output.results).toHaveLength(1)
    expect(output.results?.[0]?.rankScope).toBe('core')
  })
})

describe('executeBatch error handling', () => {
  const mockPrisma = { _mockPrisma: true } as any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('propagates runFullBatch errors as failure output with errorMessage', async () => {
    vi.mocked(runFullBatch).mockRejectedValue(new Error('DB connection refused'))

    const output = await executeBatch({ prisma: mockPrisma, scope: 'all' })

    expect(output.success).toBe(false)
    expect(output.scope).toBe('all')
    expect(output.errorMessage).toBe('DB connection refused')
    expect(output.totalUpserted).toBe(0)
    expect(output.totalErrors).toBe(1)
  })

  it('propagates runScopeBatch errors as failure output with errorMessage', async () => {
    vi.mocked(runScopeBatch).mockRejectedValue(new Error('Yahoo rate limited'))

    const output = await executeBatch({ prisma: mockPrisma, scope: 'sectors' })

    expect(output.success).toBe(false)
    expect(output.scope).toBe('sectors')
    expect(output.errorMessage).toBe('Yahoo rate limited')
    expect(output.totalUpserted).toBe(0)
    expect(output.totalErrors).toBe(1)
  })

  it('handles non-Error rejections with String fallback', async () => {
    vi.mocked(runFullBatch).mockRejectedValue('string error')

    const output = await executeBatch({ prisma: mockPrisma, scope: 'all' })

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
