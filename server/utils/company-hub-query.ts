import prisma from '~/lib/prisma'
import { normalizeStockSymbol } from '~/lib/stocks/symbols'
import { calculateHoldings } from '~/lib/position-state'
import { concentration } from '~/lib/stocks-view'
import { getCachedQuote } from '~/lib/market-data/quote'
import { getPartnerSide, getPartnerLinkStatus } from '~/lib/partners/policy'
import { findUserPartnerLinks } from '~/server/utils/partner-queries'
import { readPortfolioTransactions } from '~/server/utils/transaction-read'
import {
  findCurrentThesisBySymbol,
  listThesisReviews,
  toCurrentInvestmentThesis,
  toThesisReviewRecord,
} from '~/server/utils/investment-thesis-queries'
import type { PartnerLinkRecord } from '~/types/partner'
import type { CompanyHubDiary, CompanyHubResponse } from '~/types/company-hub'

const HUB_LIMIT = 10

/**
 * Hub-specific projection of the cached quote read seam: price + currency or
 * null — the hub degrades to cost-only display when the quote is unavailable.
 */
async function readQuote(symbol: string): Promise<{ price: number; currency: string | null } | null> {
  try {
    const quote = await getCachedQuote(symbol)
    return typeof quote?.regularMarketPrice === 'number'
      ? { price: quote.regularMarketPrice, currency: quote.currency || null }
      : null
  } catch {
    return null
  }
}

async function readRelatedDiaries(
  userId: bigint,
  symbol: string,
  stockId: bigint | null,
): Promise<CompanyHubDiary[]> {
  if (!stockId) {
    const diaries = await prisma.diary.findMany({
      where: { userId, transactions: { some: { symbol } } },
      select: {
        id: true,
        title: true,
        date: true,
        transactions: { where: { symbol }, select: { id: true } },
      },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      take: HUB_LIMIT,
    })
    return diaries.map((diary: {
      id: bigint
      title: string
      date: Date
      transactions: Array<{ id: bigint }>
    }) => ({
      id: diary.id.toString(),
      title: diary.title,
      date: diary.date.toISOString(),
      transactionCount: diary.transactions.length,
      relation: 'transaction',
    }))
  }

  const diaries = await prisma.diary.findMany({
    where: {
      userId,
      OR: [
        { stockContexts: { some: { stockId } } },
        { transactions: { some: { symbol } } },
      ],
    },
    select: {
      id: true,
      title: true,
      date: true,
      stockContexts: { where: { stockId }, select: { stockId: true } },
      transactions: { where: { symbol }, select: { id: true } },
    },
    orderBy: [{ date: 'desc' }, { id: 'desc' }],
    take: HUB_LIMIT,
  })
  return diaries.map((diary: {
    id: bigint
    title: string
    date: Date
    stockContexts: Array<{ stockId: bigint }>
    transactions: Array<{ id: bigint }>
  }) => ({
    id: diary.id.toString(),
    title: diary.title,
    date: diary.date.toISOString(),
    transactionCount: diary.transactions.length,
    relation: diary.stockContexts.length ? 'explicit_context' : 'transaction',
  }))
}

/**
 * Owner-scoped Company read model. All collection reads are bounded and Thesis
 * privacy is never derived from Partner sharing state.
 */
export async function getCompanyHub(userId: bigint, symbolRaw: string): Promise<CompanyHubResponse> {
  const symbol = normalizeStockSymbol(symbolRaw)
  const [stock, transactions, thesis, partnerLinks, quote] = await Promise.all([
    prisma.stock.findUnique({
      where: { symbol },
      select: { id: true, symbol: true, name: true, currency: true },
    }),
    readPortfolioTransactions(userId),
    findCurrentThesisBySymbol(userId, symbol),
    findUserPartnerLinks(userId),
    readQuote(symbol),
  ])

  const holdings = calculateHoldings(transactions)
  const holding = holdings.find(item => item.symbol === symbol) ?? null
  const symbolTransactions = transactions.filter(item => item.symbol === symbol)
  // Hub concentration is explicitly cost-basis so the % survives a missing
  // quote; `concentrationBasis` declares that to the client.
  const costShares = concentration(holdings, { basis: 'cost_basis' })
  const watchlist = stock
    ? await prisma.stockWatchlist.findUnique({
        where: { userId_stockId: { userId, stockId: stock.id } },
        select: { status: true },
      })
    : null

  const connectedLinks = (partnerLinks as PartnerLinkRecord[]).filter(
    link => getPartnerLinkStatus(link, userId) === 'connected',
  )
  const sharedPartnerOwners = connectedLinks
    .map(link => getPartnerSide(link, userId))
    .filter(side => side.partnerSharesStockNotes)
    .map(side => ({ id: side.partner.id, name: side.partner.name || side.partner.email }))
  const sharedOwnerIds = sharedPartnerOwners.map(owner => owner.id)
  const sourceNameByUserId = new Map(sharedPartnerOwners.map(owner => [owner.id.toString(), owner.name]))

  const [reviews, notes, evidence, relatedDiaries] = await Promise.all([
    stock && thesis ? listThesisReviews(userId, thesis.id, HUB_LIMIT) : Promise.resolve([]),
    stock
      ? prisma.stockNote.findMany({
          where: {
            stockId: stock.id,
            userId: { in: [userId, ...sharedOwnerIds] },
          },
          orderBy: [{ date: 'desc' }, { id: 'desc' }],
          take: HUB_LIMIT,
        })
      : Promise.resolve([]),
    stock
      ? prisma.stockTimelineRecord.findMany({
          where: { userId, stockId: stock.id },
          orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
          take: HUB_LIMIT,
        })
      : Promise.resolve([]),
    readRelatedDiaries(userId, symbol, stock?.id ?? null),
  ])

  const hasHistory = symbolTransactions.length > 0
  const holdingState = holding
    ? 'held'
    : hasHistory
      ? 'closed'
      : watchlist?.status === 'WATCHING'
        ? 'research_only'
        : 'untracked'
  const mappedReviews = reviews.map(toThesisReviewRecord)

  return {
    company: {
      id: stock?.id.toString() ?? null,
      symbol,
      name: stock?.name ?? null,
      currency: quote?.currency ?? stock?.currency ?? null,
      watchStatus: watchlist?.status ?? null,
    },
    position: {
      state: holdingState,
      quantity: holding?.quantity ?? 0,
      averageCost: holding?.avgCost ?? null,
      totalCost: holding?.totalCost ?? 0,
      price: quote?.price ?? null,
      marketValue: holding && quote ? holding.quantity * quote.price : null,
      concentrationPct: holding ? (costShares.get(symbol) ?? null) : null,
      concentrationBasis: holding ? 'cost_basis' : 'unavailable',
      quoteStatus: quote === null ? 'missing' : 'priced',
    },
    thesis: thesis ? toCurrentInvestmentThesis(thesis) : null,
    latestReview: mappedReviews[0] ?? null,
    reviews: mappedReviews,
    notes: notes.map((note: {
      id: bigint; userId: bigint; title: string; content: string; date: Date
      createdVia: 'USER' | 'AGENT'; createdByLabel: string | null
    }) => ({
      id: note.id.toString(),
      title: note.title,
      content: note.content,
      date: note.date.toISOString(),
      createdVia: note.createdVia,
      createdByLabel: note.createdByLabel,
      source: note.userId === userId ? 'owner' : 'partner',
      sourceName: note.userId === userId ? null : (sourceNameByUserId.get(note.userId.toString()) ?? null),
    })),
    evidence: evidence.map((record: {
      id: bigint; summary: string; sourceType: string; sourceTitle: string | null
      sourceUrl: string | null; occurredAt: Date; createdByLabel: string | null
    }) => ({
      id: record.id.toString(),
      summary: record.summary,
      sourceType: record.sourceType,
      sourceTitle: record.sourceTitle,
      sourceUrl: record.sourceUrl,
      occurredAt: record.occurredAt.toISOString(),
      createdByLabel: record.createdByLabel,
    })),
    relatedDiaries,
  }
}
