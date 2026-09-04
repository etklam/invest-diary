// @vitest-environment node
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getUniverseForScope } from '~/lib/market-rotation/universe'
import { serialize } from '~/server/utils/serialize'
import {
  getComparisonSnapshots,
  getComparisonWindow,
  type SnapshotUpsertRow,
  upsertSnapshots,
} from '~/server/utils/market-rotation-queries'
import { assertDisposableDatabaseUrl } from '~/scripts/test-database-guard'

const databaseUrl = process.env.MARKET_ROTATION_TEST_DATABASE_URL
const describeMysql = databaseUrl ? describe.sequential : describe.skip
const SNAPSHOT_DATE = new Date('2026-09-03T00:00:00.000Z')
const LARGE_ID = 9_007_199_254_740_993n

describeMysql('Market Rotation boundary on disposable MariaDB', () => {
  let prisma: PrismaClient

  beforeAll(async () => {
    assertDisposableDatabaseUrl(databaseUrl!, { databaseName: 'market_rotation_test' })
    prisma = new PrismaClient({ adapter: new PrismaMariaDb(databaseUrl!) })
    await prisma.marketRotationSnapshot.deleteMany({ where: { rankScope: 'core' } })
  })

  afterAll(async () => {
    await prisma?.$disconnect()
  })

  it('upserts the canonical universe, resolves a qualified date, and serializes a large BigInt id', async () => {
    const rotationPrisma = prisma as unknown as Parameters<typeof upsertSnapshots>[0]
    const snapshots: SnapshotUpsertRow[] = getUniverseForScope('core').map((entry, index) => ({
      date: SNAPSHOT_DATE,
      symbol: entry.symbol,
      rankScope: entry.rankScope,
      groupType: entry.groupType,
      sectorName: entry.sectorName,
      lastPrice: 100 + index,
      adjustedClose: 100 + index,
      dailyChangePct: 0.5,
      weeklyChangePct: 1.25,
      twoWeekPerformancePct: 2.5,
      rsi14: 55,
      rsiPercentile: 60,
      rsiDelta2W: 1.5,
      ema10: 99,
      ema20: 98,
      sma50: 95,
      sma200: 90,
      above10d: true,
      above20d: true,
      above50d: true,
      above200d: true,
      maScore: 4,
      maScorePercentile: 80,
      maStatus: 'bullish_stack',
      rolling252dHigh: 110,
      percentFromHigh: -9,
      distanceFromHighScore: 75,
      distanceFromHighScorePercentile: 70,
      rotationScore: 80 - index,
      rotationScoreDelta2W: 2,
      rotationRank: index + 1,
      rankDelta2W: index === 0 ? 2 : 0,
      signal: 'turning_strong',
      signalStatus: 'complete',
    }))

    expect(await upsertSnapshots(rotationPrisma, snapshots)).toBe(snapshots.length)

    const first = snapshots[0]!
    await prisma.marketRotationSnapshot.update({
      where: {
        rankScope_symbol_date: {
          rankScope: first.rankScope,
          symbol: first.symbol,
          date: first.date,
        },
      },
      data: { id: LARGE_ID },
    })

    const rows = await getComparisonSnapshots(rotationPrisma, 'core', SNAPSHOT_DATE)
    expect(rows).toHaveLength(snapshots.length)
    expect(rows.find(row => row.symbol === first.symbol)?.id).toBe(LARGE_ID)

    const wireRows = serialize(rows) as Array<Record<string, unknown>>
    expect(wireRows.find(row => row.symbol === first.symbol)?.id).toBe(LARGE_ID.toString())

    const window = await getComparisonWindow(rotationPrisma, 'core')
    expect(window.latestDate).toEqual(SNAPSHOT_DATE)
    expect(window.qualifiedDatesDesc).toHaveLength(1)
    expect(window.comparisonDate).toBeNull()
  }, 30_000)
})
