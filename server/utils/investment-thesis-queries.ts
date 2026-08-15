import type { Prisma } from '@prisma/client'
import prisma from '~/lib/prisma'
import { Errors } from '~/lib/errors/factory'
import { normalizeStockSymbol } from '~/lib/stocks/symbols'
import type {
  CompleteThesisReviewInput,
  CurrentInvestmentThesis,
  InvestmentThesisDraft,
  InvestmentThesisHealth,
  InvestmentThesisStatus,
  ThesisReviewOutcome,
  ThesisReviewRecord,
} from '~/types/investment-thesis'

export interface CurrentThesisProjection {
  id: bigint
  userId: bigint
  stockId: bigint
  status: InvestmentThesisStatus
  summary: string | null
  whyIOwnIt: string | null
  growthDrivers: string | null
  risks: string | null
  invalidationConditions: string | null
  expectedHoldingPeriod: string | null
  reviewDueAt: Date | null
  lastReviewedAt: Date | null
  latestReviewOutcome: ThesisReviewOutcome | null
  activatedAt: Date | null
  archivedAt: Date | null
  createdAt: Date
  updatedAt: Date
  stock: { symbol: string }
}

export const CURRENT_THESIS_INCLUDE = {
  stock: { select: { symbol: true } },
} as const satisfies Prisma.InvestmentThesisInclude

function cleanOptionalText(value: string | null | undefined): string | null {
  const cleaned = value?.trim()
  return cleaned ? cleaned : null
}

function parseOptionalDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value.trim() === '') return null
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) {
    throw Errors.validationError([{ field: 'reviewDueAt', message: 'reviewDueAt must be a valid date' }])
  }
  return date
}

export function deriveInvestmentThesisHealth(
  thesis: Pick<CurrentThesisProjection, 'status' | 'latestReviewOutcome' | 'reviewDueAt'>,
  asOf = new Date(),
): InvestmentThesisHealth {
  if (thesis.status === 'ARCHIVED') return 'archived'
  if (thesis.status === 'DRAFT') return 'draft'
  if (thesis.latestReviewOutcome === 'INVALIDATED') return 'invalidated'
  if (thesis.reviewDueAt && thesis.reviewDueAt.getTime() < asOf.getTime()) return 'needs_review'
  return 'healthy'
}

export function toCurrentInvestmentThesis(
  thesis: CurrentThesisProjection,
  asOf = new Date(),
): CurrentInvestmentThesis {
  return {
    id: thesis.id.toString(),
    userId: thesis.userId.toString(),
    stockId: thesis.stockId.toString(),
    symbol: thesis.stock.symbol,
    status: thesis.status,
    health: deriveInvestmentThesisHealth(thesis, asOf),
    summary: thesis.summary,
    whyIOwnIt: thesis.whyIOwnIt,
    growthDrivers: thesis.growthDrivers,
    risks: thesis.risks,
    invalidationConditions: thesis.invalidationConditions,
    expectedHoldingPeriod: thesis.expectedHoldingPeriod,
    reviewDueAt: thesis.reviewDueAt?.toISOString() ?? null,
    lastReviewedAt: thesis.lastReviewedAt?.toISOString() ?? null,
    latestReviewOutcome: thesis.latestReviewOutcome,
    activatedAt: thesis.activatedAt?.toISOString() ?? null,
    archivedAt: thesis.archivedAt?.toISOString() ?? null,
    createdAt: thesis.createdAt.toISOString(),
    updatedAt: thesis.updatedAt.toISOString(),
  }
}

export function toThesisReviewRecord(review: {
  id: bigint
  thesisId: bigint
  userId: bigint
  reviewedAt: Date
  outcome: ThesisReviewOutcome
  whatImproved: string | null
  whatDeteriorated: string | null
  whatChanged: string | null
  invalidationTriggered: boolean
  portfolioDecision: ThesisReviewRecord['portfolioDecision']
  snapshotStatus: InvestmentThesisStatus
  snapshotSummary: string | null
  snapshotWhyIOwnIt: string | null
  snapshotGrowthDrivers: string | null
  snapshotRisks: string | null
  snapshotInvalidationConditions: string | null
  snapshotExpectedHoldingPeriod: string | null
  snapshotReviewDueAt: Date | null
  createdAt: Date
}): ThesisReviewRecord {
  return {
    id: review.id.toString(),
    thesisId: review.thesisId.toString(),
    userId: review.userId.toString(),
    reviewedAt: review.reviewedAt.toISOString(),
    outcome: review.outcome,
    portfolioDecision: review.portfolioDecision,
    whatImproved: review.whatImproved,
    whatDeteriorated: review.whatDeteriorated,
    whatChanged: review.whatChanged,
    invalidationTriggered: review.invalidationTriggered,
    snapshot: {
      status: review.snapshotStatus,
      summary: review.snapshotSummary,
      whyIOwnIt: review.snapshotWhyIOwnIt,
      growthDrivers: review.snapshotGrowthDrivers,
      risks: review.snapshotRisks,
      invalidationConditions: review.snapshotInvalidationConditions,
      expectedHoldingPeriod: review.snapshotExpectedHoldingPeriod,
      reviewDueAt: review.snapshotReviewDueAt?.toISOString() ?? null,
    },
    createdAt: review.createdAt.toISOString(),
  }
}

export async function findCurrentThesisBySymbol(userId: bigint, symbolRaw: string) {
  const symbol = normalizeStockSymbol(symbolRaw)
  return prisma.investmentThesis.findFirst({
    where: { userId, stock: { symbol } },
    include: CURRENT_THESIS_INCLUDE,
  }) as Promise<CurrentThesisProjection | null>
}

export async function listCurrentThesisProjections(userId: bigint) {
  return prisma.investmentThesis.findMany({
    where: { userId },
    include: CURRENT_THESIS_INCLUDE,
    orderBy: [{ reviewDueAt: 'asc' }, { updatedAt: 'desc' }],
  }) as Promise<CurrentThesisProjection[]>
}

export async function saveCurrentThesis(input: {
  userId: bigint
  symbol: string
  draft: InvestmentThesisDraft
  status?: InvestmentThesisStatus
}) {
  const symbol = normalizeStockSymbol(input.symbol)
  const stock = await prisma.stock.upsert({
    where: { symbol },
    update: {},
    create: { symbol },
    select: { id: true },
  })
  // Full-replace semantics: absent draft fields clear, absent status defaults to DRAFT.
  // The ACTIVE thesis requires summary/whyIOwnIt rule lives solely in the PUT handler's zod schema.
  const existing = await prisma.investmentThesis.findUnique({
    where: { userId_stockId: { userId: input.userId, stockId: stock.id } },
    select: { activatedAt: true },
  })
  const status = input.status ?? 'DRAFT'
  const now = new Date()
  const data = {
    summary: cleanOptionalText(input.draft.summary),
    whyIOwnIt: cleanOptionalText(input.draft.whyIOwnIt),
    growthDrivers: cleanOptionalText(input.draft.growthDrivers),
    risks: cleanOptionalText(input.draft.risks),
    invalidationConditions: cleanOptionalText(input.draft.invalidationConditions),
    expectedHoldingPeriod: cleanOptionalText(input.draft.expectedHoldingPeriod),
    reviewDueAt: parseOptionalDate(input.draft.reviewDueAt) ?? null,
    status,
    activatedAt: status === 'ACTIVE' ? (existing?.activatedAt ?? now) : existing?.activatedAt,
    archivedAt: status === 'ARCHIVED' ? now : null,
  }

  return prisma.investmentThesis.upsert({
    where: { userId_stockId: { userId: input.userId, stockId: stock.id } },
    create: { userId: input.userId, stockId: stock.id, ...data },
    update: data,
    include: CURRENT_THESIS_INCLUDE,
  }) as Promise<CurrentThesisProjection>
}

export async function listThesisReviews(userId: bigint, thesisId: bigint, limit = 20) {
  const thesis = await prisma.investmentThesis.findFirst({
    where: { id: thesisId, userId },
    select: { id: true },
  })
  if (!thesis) return null

  return prisma.thesisReview.findMany({
    where: { userId, thesisId },
    orderBy: [{ reviewedAt: 'desc' }, { id: 'desc' }],
    take: Math.min(100, Math.max(1, limit)),
  })
}

export async function completeThesisReview(input: {
  userId: bigint
  symbol: string
  review: CompleteThesisReviewInput
  reviewedAt?: Date
}) {
  const reflections = [
    input.review.whatImproved,
    input.review.whatDeteriorated,
    input.review.whatChanged,
  ].map(cleanOptionalText)
  if (!reflections.some(Boolean)) {
    throw Errors.validationError([{
      field: 'reflection',
      message: 'At least one meaningful review reflection is required',
    }])
  }

  const thesis = await findCurrentThesisBySymbol(input.userId, input.symbol)
  if (!thesis) throw Errors.notFound('Investment Thesis not found')
  const reviewedAt = input.reviewedAt ?? new Date()

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const review = await tx.thesisReview.create({
      data: {
        thesisId: thesis.id,
        userId: input.userId,
        reviewedAt,
        outcome: input.review.outcome,
        portfolioDecision: input.review.portfolioDecision,
        whatImproved: reflections[0],
        whatDeteriorated: reflections[1],
        whatChanged: reflections[2],
        invalidationTriggered: input.review.invalidationTriggered ?? false,
        snapshotStatus: thesis.status,
        snapshotSummary: thesis.summary,
        snapshotWhyIOwnIt: thesis.whyIOwnIt,
        snapshotGrowthDrivers: thesis.growthDrivers,
        snapshotRisks: thesis.risks,
        snapshotInvalidationConditions: thesis.invalidationConditions,
        snapshotExpectedHoldingPeriod: thesis.expectedHoldingPeriod,
        snapshotReviewDueAt: thesis.reviewDueAt,
      },
    })
    const current = await tx.investmentThesis.update({
      where: { id: thesis.id },
      data: {
        lastReviewedAt: reviewedAt,
        latestReviewOutcome: input.review.outcome,
      },
      include: CURRENT_THESIS_INCLUDE,
    })
    return { current, review }
  })
}
