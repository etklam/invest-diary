#!/usr/bin/env tsx

/**
 * scripts/market-rotation/run-batch.ts
 *
 * CLI entry point for the Market Rotation Snapshot batch job.
 *
 * Runs `runFullBatch` in-process — no HTTP, no JWT, no CSRF.
 * This is the K8s CronJob target, replacing the old `node -e` inline script
 * that reimplemented JWT signing and HTTP client from scratch.
 *
 * Usage:
 *   tsx scripts/market-rotation/run-batch.ts              # all scopes
 *   tsx scripts/market-rotation/run-batch.ts --scope=core # single scope
 *
 * Exit codes:
 *   0 — batch succeeded (even if individual symbol errors occurred)
 *   1 — batch failed (DB error, Yahoo Finance down, etc.)
 */

import 'dotenv/config'

import { createRequire } from 'node:module'
import { createPrismaClientOptions } from '~/lib/prisma-client-options'
import { runFullBatch, runScopeBatch, type BatchJobResult, type FullBatchResult } from '~/server/utils/market-rotation-batch'

const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')

// ─── Types ──────────────────────────────────────────────────────────

export type BatchScope = 'sectors' | 'indexes' | 'core' | 'all'

export interface ExecuteBatchOptions {
  prisma: unknown
  scope: BatchScope
}

export interface BatchOutput {
  success: boolean
  scope: BatchScope
  startedAt: string
  durationMs: number
  totalUpserted: number
  totalErrors: number
  results?: FullBatchResult['results']
  errorMessage?: string
}

// ─── Pure functions (testable) ──────────────────────────────────────

const VALID_SCOPES: readonly BatchScope[] = ['sectors', 'indexes', 'core', 'all']

/**
 * Parse and validate the --scope CLI argument.
 * Returns "all" when undefined or empty.
 * Throws on invalid input.
 */
export function parseBatchScope(raw: string | undefined): BatchScope {
  if (!raw || raw.trim() === '') return 'all'
  const scope = raw.trim() as BatchScope
  if (!VALID_SCOPES.includes(scope)) {
    throw new Error(`Invalid scope "${raw}". Must be one of: ${VALID_SCOPES.join(', ')}`)
  }
  return scope
}

function extractArgs(argv: string[]): string | undefined {
  for (const arg of argv) {
    if (arg.startsWith('--scope=')) {
      return arg.slice('--scope='.length)
    }
    if (arg === '--scope') {
      // --scope sectors (space-separated, next arg)
      const idx = argv.indexOf(arg)
      return argv[idx + 1]
    }
  }
  return undefined
}

/**
 * Execute the market rotation batch and return a structured output object.
 *
 * This function is deliberately side-effect free (no console.log, no process.exit)
 * so it can be unit tested with injected mocks.
 */
export async function executeBatch(options: ExecuteBatchOptions): Promise<BatchOutput> {
  const { prisma, scope } = options
  const startedAt = new Date().toISOString()
  const startMs = Date.now()

  try {
    // Dispatch: scope='all' runs the full batch (all 3 scopes + aggregation);
    // any specific scope runs ONLY that scope, avoiding wasted canonical price
    // fetches for the other two scopes' symbols.
    if (scope === 'all') {
      const fullResult = await runFullBatch(prisma as Parameters<typeof runFullBatch>[0])
      return {
        success: true,
        scope,
        startedAt,
        durationMs: Date.now() - startMs,
        totalUpserted: fullResult.totalUpserted,
        totalErrors: fullResult.totalErrors,
        results: fullResult.results,
      }
    }

    const scopeResult = await runScopeBatch(
      prisma as Parameters<typeof runScopeBatch>[0],
      scope,
    )
    const results: BatchJobResult[] = [scopeResult]

    return {
      success: true,
      scope,
      startedAt,
      durationMs: Date.now() - startMs,
      totalUpserted: scopeResult.upsertedCount,
      totalErrors: scopeResult.errors.length,
      results,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      scope,
      startedAt,
      durationMs: Date.now() - startMs,
      totalUpserted: 0,
      totalErrors: 1,
      errorMessage,
    }
  }
}

/**
 * Create a standalone PrismaClient for the batch script.
 *
 * We can't use the `~/lib/prisma` singleton here because that module relies
 * on Nuxt's Nitro runtime context. In a bare tsx process there's no Nitro,
 * so use the shared Prisma options factory directly.
 */
function createBatchPrisma() {
  return new PrismaClient(createPrismaClientOptions())
}

// ─── Entry point ────────────────────────────────────────────────────

async function main() {
  const rawScope = extractArgs(process.argv.slice(2))
  const scope = parseBatchScope(rawScope)

  const prisma = createBatchPrisma()

  try {
    const output = await executeBatch({ prisma, scope })

    // Output as JSON to stdout for log aggregation / monitoring
    console.log(JSON.stringify(output))

    if (!output.success) {
      console.error(`Batch failed: ${output.errorMessage}`)
      process.exit(1)
    }

    // Symbol-level errors don't fail the job — only infrastructure errors do.
    // Log a warning so K8s logs surface it, but exit 0.
    if (output.totalErrors > 0) {
      console.warn(`Batch completed with ${output.totalErrors} symbol-level errors`)
    }

    process.exit(0)
  } finally {
    await prisma.$disconnect()
  }
}

// Run only when invoked directly (not when imported in tests)
const isDirectInvocation = import.meta.url === `file://${process.argv[1]}`
if (isDirectInvocation) {
  main().catch((error) => {
    console.error('Unhandled error in market-rotation batch:', error)
    process.exit(1)
  })
}
