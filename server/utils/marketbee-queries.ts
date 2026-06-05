import type { Regime } from '~/lib/marketbee/regime'

const DEFAULT_UNIVERSE_KEY = 'SP500_NDX'

type DecimalLike = number | string | { toNumber?: () => number; valueOf?: () => unknown } | null | undefined

interface MarketBreadthDailyRow {
  universeKey: string
  date: Date
  up4Count: number | null
  down4Count: number | null
  up4Pct: DecimalLike
  down4Pct: DecimalLike
  ratio10d: DecimalLike
  above40dPct: DecimalLike
  regime: string | null
  score: number | null
  coveragePct: DecimalLike
  isStale: boolean
}

interface MarketbeePrisma {
  marketBreadthDaily: {
    findFirst: (args: {
      where: { universeKey: string }
      orderBy: { date: 'desc' }
    }) => Promise<MarketBreadthDailyRow | null>
    findMany: (args: {
      where: { universeKey: string }
      orderBy: { date: 'desc' }
      take: number
    }) => Promise<MarketBreadthDailyRow[]>
  }
}

export interface SnapshotResult {
  universeKey: string
  date: string
  latestPriceDate: string
  coveragePct: number | null
  isStale: boolean
  regime: Regime
  score: number | null
  up4: number | null
  down4: number | null
  up4Pct: number | null
  down4Pct: number | null
  ratio10d: number | null
  above40dPct: number | null
}

export interface HistoryResult {
  date: string
  up4: number | null
  down4: number | null
  up4Pct: number | null
  down4Pct: number | null
  ratio10d: number | null
  above40dPct: number | null
  regime: Regime
}

function toNumber(value: DecimalLike): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value)
  if (typeof value.toNumber === 'function') return value.toNumber()

  const primitive = value.valueOf?.()
  return typeof primitive === 'number' ? primitive : Number(primitive)
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function toRegime(value: string | null): Regime {
  if (
    value === 'BULLISH_THRUST'
    || value === 'RISK_ON'
    || value === 'NEUTRAL'
    || value === 'RISK_OFF'
    || value === 'CAPITULATION_WATCH'
  ) {
    return value
  }

  return 'NEUTRAL'
}

function toSnapshotResult(row: MarketBreadthDailyRow): SnapshotResult {
  const date = toDateString(row.date)

  return {
    universeKey: row.universeKey,
    date,
    latestPriceDate: date,
    coveragePct: toNumber(row.coveragePct),
    isStale: row.isStale,
    regime: toRegime(row.regime),
    score: row.score,
    up4: row.up4Count,
    down4: row.down4Count,
    up4Pct: toNumber(row.up4Pct),
    down4Pct: toNumber(row.down4Pct),
    ratio10d: toNumber(row.ratio10d),
    above40dPct: toNumber(row.above40dPct),
  }
}

function toHistoryResult(row: MarketBreadthDailyRow): HistoryResult {
  return {
    date: toDateString(row.date),
    up4: row.up4Count,
    down4: row.down4Count,
    up4Pct: toNumber(row.up4Pct),
    down4Pct: toNumber(row.down4Pct),
    ratio10d: toNumber(row.ratio10d),
    above40dPct: toNumber(row.above40dPct),
    regime: toRegime(row.regime),
  }
}

export async function getLatestBreadthSnapshot(
  prisma: MarketbeePrisma,
  universeKey = DEFAULT_UNIVERSE_KEY,
): Promise<SnapshotResult | null> {
  const row = await prisma.marketBreadthDaily.findFirst({
    where: { universeKey },
    orderBy: { date: 'desc' },
  })

  return row ? toSnapshotResult(row) : null
}

export async function getBreadthHistory(
  prisma: MarketbeePrisma,
  days: number,
  universeKey = DEFAULT_UNIVERSE_KEY,
): Promise<HistoryResult[]> {
  const rows = await prisma.marketBreadthDaily.findMany({
    where: { universeKey },
    orderBy: { date: 'desc' },
    take: days,
  })

  return rows.map(toHistoryResult)
}

export function getRegimeGuidance(regime: Regime): { suggestedExposure: string; message: string } {
  switch (regime) {
    case 'BULLISH_THRUST':
    case 'RISK_ON':
      return {
        suggestedExposure: '80-100%',
        message: 'Bullish thrust confirmed. Favor leading ETFs.',
      }
    case 'NEUTRAL':
      return {
        suggestedExposure: '40-60%',
        message: 'Market breadth is mixed. Keep exposure balanced.',
      }
    case 'RISK_OFF':
      return {
        suggestedExposure: '20-40%',
        message: 'Risk-off conditions. Reduce laggards and protect capital.',
      }
    case 'CAPITULATION_WATCH':
      return {
        suggestedExposure: '0-20%',
        message: 'Capitulation risk elevated. Wait for breadth repair.',
      }
  }
}
