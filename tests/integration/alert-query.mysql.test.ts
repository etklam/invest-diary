// @vitest-environment node
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient, type Prisma } from '@prisma/client'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { writeFileSync } from 'node:fs'
import { assertDisposableDatabaseUrl } from '../../scripts/test-database-guard'
import { createAlertPusher } from '../../server/schedulers/alert-pusher'

const databaseUrl = process.env.BACKEND_HTTP_TEST_DATABASE_URL
const describeMysql = databaseUrl ? describe.sequential : describe.skip
const now = new Date('2026-09-05T00:00:00.000Z')

describeMysql('Alert scheduler actual Prisma query on disposable MariaDB', () => {
  let prisma: PrismaClient<{ log: [{ emit: 'event'; level: 'query' }] }>
  const userIds: bigint[] = []
  const diaryIds: bigint[] = []
  const queries: Prisma.QueryEvent[] = []
  const measurements: unknown[] = []
  beforeAll(async () => {
    assertDisposableDatabaseUrl(databaseUrl!, { databaseName: 'backend_http_test' })
    prisma = new PrismaClient({ adapter: new PrismaMariaDb(databaseUrl!), log: [{ emit: 'event', level: 'query' }] })
    prisma.$on('query', event => { queries.push(event) })
    for (let i = 0; i < 2; i++) {
      const user = await prisma.user.create({ data: { email: `alert-query-${process.pid}-${i}@example.test`, password: 'synthetic-fixture' } })
      userIds.push(user.id)
      const diary = await prisma.diary.create({ data: { userId: user.id, title: 'Scheduler fixture', date: now } })
      diaryIds.push(diary.id)
    }
  })
  afterAll(async () => {
    if (!prisma) return
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    await prisma.$disconnect()
    if (process.env.ALERT_QUERY_MEASUREMENTS) writeFileSync(process.env.ALERT_QUERY_MEASUREMENTS, JSON.stringify(measurements, (_key, value) => typeof value === 'bigint' ? value.toString() : value, 2))
  })

  it.each([1000, 50000])('selects only due owner-scoped alerts with %i historical rows', async (historyCount) => {
    await prisma.alert.deleteMany({ where: { diaryId: { in: diaryIds } } })
    for (let offset = 0; offset < historyCount; offset += 1000) {
      await prisma.alert.createMany({ data: Array.from({ length: Math.min(1000, historyCount - offset) }, (_, i) => ({
        diaryId: diaryIds[0]!, message: 'history', isDismissed: i % 2 === 0,
        triggerAt: new Date(now.getTime() - 86400000 - (offset + i) * 1000),
      })) })
    }
    const make = (message: string, milliseconds: number, extra: { isDismissed?: boolean; parentId?: bigint; diaryId?: bigint } = {}) => prisma.alert.create({ data: {
      diaryId: diaryIds[0]!, message, recurringMode: 'WEEK', instanceNumber: extra.parentId ? 2 : 1, triggerAt: new Date(now.getTime() + milliseconds), ...extra,
    } })
    const start = await make('inclusive start', 0)
    const end = await make('inside end', 64999, { diaryId: diaryIds[1]! })
    await make('exclusive end', 65000)
    await make('before start', -1)
    await make('dismissed', 1000, { isDismissed: true })
    const dismissedRoot = await make('dismissed root', -10000, { isDismissed: true })
    await make('cancelled series child', 1000, { parentId: dismissedRoot.id })
    const root = await make('active root', -10000)
    const child = await make('active child', 2000, { parentId: root.id })
    await make('dismissed child', 3000, { parentId: root.id, isDismissed: true })
    await prisma.$queryRawUnsafe('ANALYZE TABLE alerts')
    const emitToUser = vi.fn((_owner: string, _event: string, _payload: { id: string }) => true)
    const logger = { info: vi.fn(), error: vi.fn() }
    const pusher = createAlertPusher({ prisma, broadcaster: { emitToUser }, logger, now: () => now })
    queries.length = 0
    const started = performance.now()
    await pusher.checkAndPushAlerts()
    const schedulerMs = performance.now() - started
    expect(logger.error).not.toHaveBeenCalled()
    expect(emitToUser.mock.calls.map(([owner, , payload]) => [owner, payload.id]).sort()).toEqual([
      [String(userIds[0]), String(start.id)], [String(userIds[1]), String(end.id)], [String(userIds[0]), String(child.id)],
    ].sort())
    const candidate = queries.find(event => /^SELECT /i.test(event.query) && event.query.includes('trigger_at') && event.query.includes('is_dismissed'))
    expect(candidate).toBeDefined()
    const params = JSON.parse(candidate!.params)
    // Prisma query logs serialize Date parameters to JSON strings; restore the
    // original Date binding so EXPLAIN uses the same MariaDB parameter types.
    const boundParams = params.map((value: unknown, index: number) => index === 1 || index === 2 ? new Date(value as string) : value)
    const explain = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`EXPLAIN ${candidate!.query}`, ...boundParams)
    const analysis = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`ANALYZE ${candidate!.query}`, ...boundParams)
    const version = await prisma.$queryRawUnsafe('SELECT VERSION() AS version')
    measurements.push({ historyCount, version, schedulerMs, prismaDurationMs: candidate!.duration, sql: candidate!.query, params, explain, analysis })
    const main = explain.find(row => row.table === 'alerts')
    expect(main?.key).toBe('alerts_active_trigger_idx')
    expect(Number(main?.rows)).toBeLessThan(50)
    expect(Number(analysis.find(row => row.table === 'alerts')?.r_rows)).toBeLessThan(50)
  }, 60000)
})
