import prisma from '~/lib/prisma'
import { normalizeStockSymbol } from '~/lib/stocks/symbols'
import type { StockTimelineSourceType } from '~/lib/stocks/timeline-source'
import { mergeInvestmentActivity, type InvestmentActivityOptions, type InvestmentActivitySources } from '~/lib/investment-activity'

const ACTIVITY_LIMIT = 50

type DiaryRow = {
  id: bigint; date: Date; title: string; content: string | null
  createdVia: string; createdByLabel: string | null; reviewStatus: string | null; reviewOutcome: string | null
  alerts: Array<{ id: bigint }>
  stockContexts: Array<{ stock: { symbol: string } }>
  transactions: Array<{ id: bigint; symbol: string; type: string; quantity: unknown; price: unknown }>
  tradePlans: Array<{ status: string }>
}
type ReviewRow = {
  id: bigint; reviewedAt: Date; outcome: string; portfolioDecision: string
  whatImproved: string | null; whatDeteriorated: string | null; whatChanged: string | null
  thesis: { stock: { symbol: string } }
}
type TimelineRow = {
  id: bigint; occurredAt: Date; summary: string; sourceType: StockTimelineSourceType; sourceTitle: string | null; sourceUrl: string | null
  sourceDiaryId: bigint | null; createdVia: string; createdByLabel: string | null; stock: { symbol: string }
}
type ThesisRow = {
  id: bigint; updatedAt: Date; status: string; summary: string | null; latestReviewOutcome: string | null
  stock: { symbol: string }
}

function decimalToNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'toNumber' in value && typeof (value as { toNumber?: unknown }).toNumber === 'function') {
    return Number((value as { toNumber: () => number }).toNumber())
  }
  return Number(value)
}

function cleanSummary(value: string | null | undefined): string | null {
  const cleaned = value?.replace(/\s+/g, ' ').trim()
  return cleaned ? cleaned.slice(0, 280) : null
}

export async function readInvestmentActivitySources(
  userId: bigint,
  options: { symbol?: string | null; sourceLimit?: number } = {},
): Promise<InvestmentActivitySources> {
  const symbol = options.symbol?.trim() ? normalizeStockSymbol(options.symbol) : null
  const sourceLimit = Math.min(ACTIVITY_LIMIT * 3, Math.max(20, options.sourceLimit ?? ACTIVITY_LIMIT * 2))
  const diaryWhere = {
    userId,
    ...(symbol ? {
      OR: [
        { stockContexts: { some: { stock: { symbol } } } },
        { transactions: { some: { symbol } } },
      ],
    } : {}),
  }

  const [diaries, reviews, timeline, theses] = await Promise.all([
    prisma.diary.findMany({
      where: diaryWhere,
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      take: sourceLimit,
      select: {
        id: true,
        date: true,
        title: true,
        content: true,
        createdVia: true,
        createdByLabel: true,
        reviewStatus: true,
        reviewOutcome: true,
        alerts: { where: { isDismissed: false }, select: { id: true } },
        stockContexts: { select: { stock: { select: { symbol: true } } } },
        transactions: { select: { id: true, symbol: true, type: true, quantity: true, price: true } },
        tradePlans: { select: { status: true } },
      },
    }),
    prisma.thesisReview.findMany({
      where: { userId, ...(symbol ? { thesis: { stock: { symbol } } } : {}) },
      orderBy: [{ reviewedAt: 'desc' }, { id: 'desc' }],
      take: sourceLimit,
      include: { thesis: { select: { stock: { select: { symbol: true } } } } },
    }),
    prisma.stockTimelineRecord.findMany({
      where: { userId, ...(symbol ? { stock: { symbol } } : {}) },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: sourceLimit,
      include: { stock: { select: { symbol: true } } },
    }),
    prisma.investmentThesis.findMany({
      where: { userId, ...(symbol ? { stock: { symbol } } : {}) },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: sourceLimit,
      include: { stock: { select: { symbol: true } } },
    }),
  ]) as unknown as [DiaryRow[], ReviewRow[], TimelineRow[], ThesisRow[]]

  return {
    diaries: diaries.map(diary => ({
      id: diary.id.toString(),
      date: diary.date.toISOString(),
      title: diary.title,
      content: diary.content,
      createdVia: diary.createdVia,
      createdByLabel: diary.createdByLabel,
      symbols: diary.stockContexts.map(context => context.stock.symbol),
      transactionContext: diary.transactions.map(transaction => ({
        id: transaction.id.toString(),
        symbol: normalizeStockSymbol(transaction.symbol),
        type: transaction.type,
        quantity: decimalToNumber(transaction.quantity),
        price: decimalToNumber(transaction.price),
      })),
      reviewOutcome: diary.reviewOutcome,
      reviewStatus: diary.reviewStatus,
      alertCount: diary.alerts.length,
      tradePlanSummary: diary.tradePlans.length ? { total: diary.tradePlans.length } : null,
    })),
    thesisReviews: reviews.map(review => ({
      id: review.id.toString(),
      reviewedAt: review.reviewedAt.toISOString(),
      symbol: review.thesis.stock.symbol,
      outcome: review.outcome,
      portfolioDecision: review.portfolioDecision,
      reflectionSummary: [review.whatImproved, review.whatDeteriorated, review.whatChanged].map(cleanSummary).filter(Boolean).join(' · ') || null,
      createdByLabel: null,
    })),
    stockTimeline: timeline.map(record => ({
      id: record.id.toString(),
      occurredAt: record.occurredAt.toISOString(),
      symbol: record.stock.symbol,
      summary: record.summary,
      sourceType: record.sourceType,
      sourceTitle: record.sourceTitle,
      sourceUrl: record.sourceUrl,
      sourceDiaryId: record.sourceDiaryId?.toString() ?? null,
      createdVia: record.createdVia,
      createdByLabel: record.createdByLabel,
    })),
    currentTheses: theses.map(thesis => ({
      id: thesis.id.toString(),
      updatedAt: thesis.updatedAt.toISOString(),
      symbol: thesis.stock.symbol,
      status: thesis.status,
      summary: thesis.summary,
      latestReviewOutcome: thesis.latestReviewOutcome,
    })),
  }
}

export async function readInvestmentActivityPage(
  userId: bigint,
  options: InvestmentActivityOptions = {},
) {
  const sources = await readInvestmentActivitySources(userId, { symbol: options.symbol })
  return mergeInvestmentActivity(sources, {
    ...options,
    limit: Math.min(ACTIVITY_LIMIT, Math.max(1, options.limit ?? 20)),
  })
}
