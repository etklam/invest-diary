// @vitest-environment node
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@prisma/client'
import { fetch, setup } from '@nuxt/test-utils/e2e'
import bcrypt from 'bcryptjs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  alertListResponseSchema,
  alertResponseSchema,
  priceAlertListResponseSchema,
  priceAlertResponseSchema,
} from '~/lib/contracts/alerts'
import { investmentActivityResponseSchema } from '~/lib/contracts/activity'
import { companyHubResponseSchema } from '~/lib/contracts/company-hub'
import {
  currentInvestmentThesisSchema,
  investmentThesisResponseSchema,
  thesisReviewResponseSchema,
} from '~/lib/contracts/investment-thesis'
import {
  stockNoteListResponseSchema,
  stockNoteResponseSchema,
  stockSymbolTimelineResponseSchema,
  stockTimelineListResponseSchema,
  stockWatchlistResponseSchema,
} from '~/lib/contracts/stocks'
import { tradePlanListResponseSchema, tradePlanResponseSchema } from '~/lib/contracts/trade-plan'
import {
  portfolioAttentionResponseSchema,
  portfolioHoldingsResponseSchema,
  portfolioValuationResponseSchema,
} from '~/lib/contracts/portfolio'
import { marketStateHistoryResponseSchema } from '~/lib/contracts/market'
import { signAccessToken } from '~/lib/jwt'

const databaseUrl = process.env.BACKEND_HTTP_TEST_DATABASE_URL
const describeHttp = databaseUrl ? describe.sequential : describe.skip

if (databaseUrl) {
  const parsed = new URL(databaseUrl)
  if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)
    || parsed.pathname !== '/backend_http_test') {
    throw new Error('Refusing to run HTTP contract tests outside disposable backend_http_test')
  }

  await setup({
    rootDir: process.cwd(),
    browser: false,
    server: true,
    build: true,
    setupTimeout: 180_000,
    env: {
      DATABASE_URL: databaseUrl,
      JWT_SECRET: 'backend-http-contract-secret-not-placeholder',
      TRUST_X_FORWARDED_FOR: 'true',
      NODE_PATH: resolve(process.cwd(), 'node_modules'),
    },
  })
}

type TestUser = {
  id: bigint
  email: string
  role: 'USER'
  tokenVersion: number
  accessToken: string
}

type JsonRecord = Record<string, any>

const OWNER_EMAIL = 'core-contract-owner@example.com'
const OTHER_EMAIL = 'core-contract-other@example.com'
const TEST_SYMBOLS = ['LUNA03', 'LUNA04A', 'LUNA04B', 'LUNA05', 'LUNA06', 'LUNA07']

function errorCode(body: JsonRecord): string | undefined {
  return body?.data?.code ?? body?.data?.data?.code ?? body?.code
}

async function readJson(response: Response): Promise<JsonRecord> {
  return await response.json() as JsonRecord
}

async function expectError(response: Response, status: number, code: string) {
  const body = await readJson(response)
  expect(response.status).toBe(status)
  expect(errorCode(body)).toBe(code)
  return body
}

async function requestJson(
  path: string,
  options: {
    method?: string
    headers?: Record<string, string>
    body?: unknown
  } = {},
) {
  const headers = {
    ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
    ...options.headers,
  }
  return fetch(path, {
    method: options.method ?? 'GET',
    headers,
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  })
}

describeHttp('real Nitro + MariaDB canonical contracts for tickets 03–07', () => {
  let prisma: PrismaClient
  let owner: TestUser
  let other: TestUser

  const authHeaders = (user: TestUser) => ({
    authorization: `Bearer ${user.accessToken}`,
  })

  const createDiary = async (user: TestUser, date: string, title: string) => {
    const response = await requestJson('/api/diaries', {
      method: 'POST',
      headers: authHeaders(user),
      body: { title, content: `${title} content`, date },
    })
    expect(response.status).toBe(201)
    const body = await readJson(response)
    expect(body.date).toBe(date)
    return body
  }

  beforeAll(async () => {
    prisma = new PrismaClient({ adapter: new PrismaMariaDb(databaseUrl!) })
  })

  beforeEach(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [OWNER_EMAIL, OTHER_EMAIL] } },
    })
    await prisma.stock.deleteMany({ where: { symbol: { in: TEST_SYMBOLS } } })

    const password = await bcrypt.hash('password123', 4)
    const [ownerRow, otherRow] = await Promise.all([
      prisma.user.create({ data: { email: OWNER_EMAIL, password, name: 'Core Contract Owner' } }),
      prisma.user.create({ data: { email: OTHER_EMAIL, password, name: 'Core Contract Other' } }),
    ])
    owner = {
      id: ownerRow.id,
      email: ownerRow.email,
      role: 'USER',
      tokenVersion: ownerRow.tokenVersion,
      accessToken: await signAccessToken(
        ownerRow.id.toString(),
        ownerRow.email,
        'USER',
        ownerRow.tokenVersion,
      ),
    }
    other = {
      id: otherRow.id,
      email: otherRow.email,
      role: 'USER',
      tokenVersion: otherRow.tokenVersion,
      accessToken: await signAccessToken(
        otherRow.id.toString(),
        otherRow.email,
        'USER',
        otherRow.tokenVersion,
      ),
    }
  })

  afterAll(async () => {
    await prisma?.$disconnect()
  })

  it('freezes Thesis current projection, append-only review history, bounds, errors, and ownership', async () => {
    const symbol = 'LUNA03'
    const ownerHeaders = authHeaders(owner)
    const otherHeaders = authHeaders(other)

    await expectError(
      await requestJson(`/api/stocks/${symbol}/thesis`),
      401,
      'AUTH_UNAUTHORIZED',
    )

    await expectError(
      await requestJson(`/api/stocks/${symbol}/thesis`, {
        method: 'PUT',
        headers: ownerHeaders,
        body: {
          status: 'ACTIVE',
          whyIOwnIt: 'Only one activation field',
        },
      }),
      400,
      'SYS_VALIDATION_ERROR',
    )

    const createdResponse = await requestJson(`/api/stocks/${symbol.toLowerCase()}/thesis`, {
      method: 'PUT',
      headers: ownerHeaders,
      body: {
        status: 'ACTIVE',
        summary: 'Long-term demand remains durable.',
        whyIOwnIt: 'The company compounds through a durable platform moat.',
        growthDrivers: 'Cloud and developer ecosystem expansion.',
        risks: 'Valuation and execution risk.',
        invalidationConditions: 'Platform usage materially reverses.',
        expectedHoldingPeriod: 'five years',
        reviewDueAt: '2030-01-15T00:00:00.000Z',
      },
    })
    expect(createdResponse.status).toBe(200)
    const createdBody = await readJson(createdResponse)
    const createdThesis = currentInvestmentThesisSchema.parse(createdBody.thesis)
    expect(createdThesis).toMatchObject({
      id: expect.stringMatching(/^[1-9]\d*$/),
      userId: owner.id.toString(),
      stockId: expect.stringMatching(/^[1-9]\d*$/),
      symbol,
      status: 'ACTIVE',
      health: 'healthy',
      reviewDueAt: '2030-01-15T00:00:00.000Z',
    })

    const emptyHistory = await requestJson(`/api/stocks/${symbol}/thesis?limit=1`, {
      headers: ownerHeaders,
    })
    expect(emptyHistory.status).toBe(200)
    expect(investmentThesisResponseSchema.parse(await readJson(emptyHistory))).toMatchObject({
      thesis: { id: createdThesis.id, symbol },
      reviews: [],
    })

    const firstReviewResponse = await requestJson(`/api/stocks/${symbol}/thesis/reviews`, {
      method: 'POST',
      headers: ownerHeaders,
      body: {
        outcome: 'PARTIAL',
        portfolioDecision: 'HOLD',
        whatChanged: 'The moat held, but growth slowed in one segment.',
      },
    })
    expect(firstReviewResponse.status).toBe(200)
    const firstReviewBody = thesisReviewResponseSchema.parse(await readJson(firstReviewResponse))
    expect(firstReviewBody.review).toMatchObject({
      thesisId: createdThesis.id,
      userId: owner.id.toString(),
      outcome: 'PARTIAL',
      portfolioDecision: 'HOLD',
      snapshot: {
        status: 'ACTIVE',
        summary: 'Long-term demand remains durable.',
        whyIOwnIt: 'The company compounds through a durable platform moat.',
      },
    })

    const revisedResponse = await requestJson(`/api/stocks/${symbol}/thesis`, {
      method: 'PUT',
      headers: ownerHeaders,
      body: {
        status: 'ACTIVE',
        summary: 'Demand is durable, with a clearer margin path.',
        whyIOwnIt: 'The platform moat and cash generation remain intact.',
      },
    })
    expect(revisedResponse.status).toBe(200)
    const revisedThesis = currentInvestmentThesisSchema.parse((await readJson(revisedResponse)).thesis)
    expect(revisedThesis.summary).toBe('Demand is durable, with a clearer margin path.')
    expect(revisedThesis.reviewDueAt).toBeNull()

    const secondReviewResponse = await requestJson(`/api/stocks/${symbol}/thesis/reviews`, {
      method: 'POST',
      headers: ownerHeaders,
      body: {
        outcome: 'INTACT',
        portfolioDecision: 'ADD',
        whatImproved: 'Margins improved.',
      },
    })
    expect(secondReviewResponse.status).toBe(200)
    const secondReviewBody = thesisReviewResponseSchema.parse(await readJson(secondReviewResponse))
    expect(secondReviewBody.review.id).not.toBe(firstReviewBody.review.id)
    expect(secondReviewBody.review.snapshot.summary).toBe(revisedThesis.summary)

    const boundedHistoryResponse = await requestJson(`/api/stocks/${symbol}/thesis?limit=1`, {
      headers: ownerHeaders,
    })
    const boundedHistory = investmentThesisResponseSchema.parse(await readJson(boundedHistoryResponse))
    expect(boundedHistory.reviews).toHaveLength(1)
    expect(boundedHistory.reviews[0]?.id).toBe(secondReviewBody.review.id)

    const completeHistoryResponse = await requestJson(`/api/stocks/${symbol}/thesis?limit=2`, {
      headers: ownerHeaders,
    })
    const completeHistory = investmentThesisResponseSchema.parse(await readJson(completeHistoryResponse))
    expect(completeHistory.reviews).toHaveLength(2)
    expect(completeHistory.reviews[1]?.snapshot.summary).toBe('Long-term demand remains durable.')

    const persistedReviews = await prisma.thesisReview.findMany({
      where: { userId: owner.id, thesisId: BigInt(createdThesis.id) },
      orderBy: { id: 'asc' },
    })
    expect(persistedReviews).toHaveLength(2)
    expect(persistedReviews[0]?.snapshotSummary).toBe('Long-term demand remains durable.')

    await expectError(
      await requestJson(`/api/stocks/${symbol}/thesis?limit=101`, { headers: ownerHeaders }),
      400,
      'SYS_VALIDATION_ERROR',
    )

    const otherCurrentResponse = await requestJson(`/api/stocks/${symbol}/thesis`, {
      headers: otherHeaders,
    })
    expect(otherCurrentResponse.status).toBe(200)
    expect(investmentThesisResponseSchema.parse(await readJson(otherCurrentResponse))).toEqual({
      thesis: null,
      reviews: [],
    })

    await expectError(
      await requestJson(`/api/stocks/${symbol}/thesis/reviews`, {
        method: 'POST',
        headers: otherHeaders,
        body: {
          outcome: 'INTACT',
          portfolioDecision: 'HOLD',
          whatChanged: 'A foreign user must not review this Thesis.',
        },
      }),
      404,
      'INVESTMENT_THESIS_NOT_FOUND',
    )
  }, 60_000)

  it('freezes Trade Plan status, Decimal/date wire, offset pagination, errors, and ownership', async () => {
    const ownerHeaders = authHeaders(owner)
    const otherHeaders = authHeaders(other)
    const ownerDiary = await createDiary(owner, '2026-08-25', 'Trade Plan owner diary')
    const otherDiary = await createDiary(other, '2026-08-26', 'Trade Plan other diary')

    await expectError(await requestJson('/api/trade-plans'), 401, 'AUTH_UNAUTHORIZED')

    await expectError(
      await requestJson('/api/trade-plans', {
        method: 'POST',
        headers: ownerHeaders,
        body: { symbol: 'LUNA04A', entry_price: '180.25', status: 'draft' },
      }),
      400,
      'SYS_VALIDATION_ERROR',
    )

    await expectError(
      await requestJson('/api/trade-plans', {
        method: 'POST',
        headers: ownerHeaders,
        body: { symbol: 'LUNA04A', entryZoneLow: '200', entryZoneHigh: '100' },
      }),
      400,
      'SYS_VALIDATION_ERROR',
    )

    const createPlan = async (body: JsonRecord) => {
      const response = await requestJson('/api/trade-plans', {
        method: 'POST',
        headers: ownerHeaders,
        body,
      })
      expect(response.status).toBe(200)
      const parsed = tradePlanResponseSchema.parse(await readJson(response))
      return parsed
    }

    const firstPlan = await createPlan({
      diaryId: ownerDiary.id,
      symbol: 'luna04a',
      setupType: 'Pullback',
      entryPrice: '180.250000',
      entryZoneLow: '178.125',
      entryZoneHigh: '185.500000',
      stopLoss: '170.00',
      targetPrice: '220.1250',
      maxPositionSize: '12000.50',
      invalidationCondition: 'Close below support',
      notes: 'Wait for volume confirmation',
      status: 'active',
    })
    expect(firstPlan).toMatchObject({
      id: expect.stringMatching(/^[1-9]\d*$/),
      userId: owner.id.toString(),
      diaryId: ownerDiary.id,
      symbol: 'LUNA04A',
      entryPrice: '180.25',
      entryZoneLow: '178.125',
      entryZoneHigh: '185.5',
      stopLoss: '170',
      targetPrice: '220.125',
      maxPositionSize: '12000.5',
      status: 'active',
      diary: {
        id: ownerDiary.id,
        date: '2026-08-25',
        transactionCount: 0,
      },
    })
    expect(firstPlan.createdAt).toMatch(/Z$/)
    expect(firstPlan.updatedAt).toMatch(/Z$/)

    const secondPlan = await createPlan({
      symbol: 'LUNA04B',
      status: 'draft',
    })
    expect(secondPlan.diary).toBeNull()

    const pageResponse = await requestJson('/api/trade-plans?page=1&limit=1&sortBy=symbol-asc', {
      headers: ownerHeaders,
    })
    expect(pageResponse.status).toBe(200)
    const page = tradePlanListResponseSchema.parse(await readJson(pageResponse))
    expect(page.pagination).toEqual({ page: 1, limit: 1, total: 2, totalPages: 2 })
    expect(page.data).toHaveLength(1)
    expect(page.data[0]?.symbol).toBe('LUNA04A')

    const filteredResponse = await requestJson('/api/trade-plans?status=active&symbol=luna04&limit=100', {
      headers: ownerHeaders,
    })
    const filtered = tradePlanListResponseSchema.parse(await readJson(filteredResponse))
    expect(filtered.data.map(plan => plan.id)).toEqual([firstPlan.id])

    const detailResponse = await requestJson(`/api/trade-plans/${firstPlan.id}`, {
      headers: ownerHeaders,
    })
    expect(detailResponse.status).toBe(200)
    expect(tradePlanResponseSchema.parse(await readJson(detailResponse))).toMatchObject({
      id: firstPlan.id,
      entryPrice: '180.25',
      diary: { id: ownerDiary.id, date: '2026-08-25' },
    })

    const updatedResponse = await requestJson(`/api/trade-plans/${firstPlan.id}`, {
      method: 'PUT',
      headers: ownerHeaders,
      body: { entryPrice: '181.125000', status: 'closed' },
    })
    expect(updatedResponse.status).toBe(200)
    expect(tradePlanResponseSchema.parse(await readJson(updatedResponse))).toMatchObject({
      id: firstPlan.id,
      entryPrice: '181.125',
      status: 'closed',
    })

    await expectError(
      await requestJson(`/api/trade-plans/${firstPlan.id}`, { headers: otherHeaders }),
      404,
      'TRADE_PLAN_NOT_FOUND',
    )
    await expectError(
      await requestJson(`/api/trade-plans/${firstPlan.id}`, {
        method: 'PUT',
        headers: otherHeaders,
        body: { status: 'cancelled' },
      }),
      404,
      'TRADE_PLAN_NOT_FOUND',
    )

    await expectError(
      await requestJson('/api/trade-plans', {
        method: 'POST',
        headers: ownerHeaders,
        body: { diaryId: otherDiary.id, symbol: 'LUNA04A', status: 'draft' },
      }),
      404,
      'DIARY_NOT_FOUND',
    )
  }, 60_000)

  it('freezes Diary Alert recurrence and Price Alert trigger/list/error/ownership wire', async () => {
    const ownerHeaders = authHeaders(owner)
    const otherHeaders = authHeaders(other)
    const ownerDiary = await createDiary(owner, '2026-08-27', 'Alert owner diary')

    await expectError(await requestJson('/api/alerts'), 401, 'AUTH_UNAUTHORIZED')
    await expectError(
      await requestJson('/api/alerts', {
        method: 'POST',
        headers: ownerHeaders,
        body: {
          diaryId: ownerDiary.id,
          message: 'Invalid recurrence mode',
          triggerAt: '2026-09-07T01:00:00.000Z',
          recurringMode: 'YEAR',
        },
      }),
      400,
      'SYS_VALIDATION_ERROR',
    )

    const recurringResponse = await requestJson('/api/alerts', {
      method: 'POST',
      headers: ownerHeaders,
      body: {
        diaryId: ownerDiary.id,
        message: 'Review this thesis',
        triggerAt: '2026-09-07T01:00:00.000Z',
        recurringMode: 'WEEK',
      },
    })
    expect(recurringResponse.status).toBe(200)
    const parent = alertResponseSchema.parse(await readJson(recurringResponse))
    expect(parent).toMatchObject({
      id: expect.stringMatching(/^[1-9]\d*$/),
      diaryId: ownerDiary.id,
      recurringMode: 'WEEK',
      parentId: parent.id,
      instanceNumber: 1,
    })

    const series = await prisma.alert.findMany({
      where: { diaryId: BigInt(ownerDiary.id) },
      orderBy: { instanceNumber: 'asc' },
    })
    expect(series).toHaveLength(5)
    expect(series.map(alert => alert.instanceNumber)).toEqual([1, 2, 3, 4, 5])
    expect(series.map(alert => alert.triggerAt.toISOString())).toEqual([
      '2026-09-07T01:00:00.000Z',
      '2026-09-08T01:00:00.000Z',
      '2026-09-09T01:00:00.000Z',
      '2026-09-10T01:00:00.000Z',
      '2026-09-11T01:00:00.000Z',
    ])
    expect(series.every(alert => alert.recurringMode === 'WEEK')).toBe(true)
    expect(series.every(alert => alert.parentId === series[0]?.id)).toBe(true)

    const listResponse = await requestJson('/api/alerts', { headers: ownerHeaders })
    expect(listResponse.status).toBe(200)
    const activeAlerts = alertListResponseSchema.parse(await readJson(listResponse))
    expect(activeAlerts).toHaveLength(5)
    expect(activeAlerts.every(alert => alert.id.match(/^[1-9]\d*$/) && alert.triggerAt.endsWith('Z'))).toBe(true)

    const dismissedResponse = await requestJson(`/api/alerts/${parent.id}/dismiss`, {
      method: 'PUT',
      headers: ownerHeaders,
    })
    expect(dismissedResponse.status).toBe(200)
    expect(alertResponseSchema.parse(await readJson(dismissedResponse)).isDismissed).toBe(true)

    await expectError(
      await requestJson(`/api/alerts/${parent.id}/dismiss`, {
        method: 'PUT',
        headers: otherHeaders,
      }),
      404,
      'ALERT_NOT_FOUND',
    )

    await expectError(await requestJson('/api/stocks/alerts'), 401, 'AUTH_UNAUTHORIZED')
    await expectError(
      await requestJson('/api/stocks/alerts', {
        method: 'POST',
        headers: ownerHeaders,
        body: { symbol: 'LUNA05', type: 'CHANGE_PERCENT', threshold: '5' },
      }),
      400,
      'SYS_VALIDATION_ERROR',
    )

    const priceAlertResponse = await requestJson('/api/stocks/alerts', {
      method: 'POST',
      headers: ownerHeaders,
      body: {
        symbol: 'luna05',
        type: 'PRICE_ABOVE',
        threshold: '123.4500',
        message: 'Breakout threshold',
      },
    })
    expect(priceAlertResponse.status).toBe(200)
    const priceAlert = priceAlertResponseSchema.parse(await readJson(priceAlertResponse))
    expect(priceAlert).toMatchObject({
      id: expect.stringMatching(/^[1-9]\d*$/),
      symbol: 'LUNA05',
      type: 'PRICE_ABOVE',
      threshold: expect.stringMatching(/^\d+(?:\.\d+)?$/),
      message: 'Breakout threshold',
      isTriggered: false,
      triggeredAt: null,
    })

    const secondPriceAlertResponse = await requestJson('/api/stocks/alerts', {
      method: 'POST',
      headers: ownerHeaders,
      body: { symbol: 'LUNA05', type: 'PRICE_BELOW', threshold: '100' },
    })
    const secondPriceAlert = priceAlertResponseSchema.parse(await readJson(secondPriceAlertResponse))
    const triggerResponse = await requestJson(`/api/stocks/alerts/${priceAlert.id}`, {
      method: 'PUT',
      headers: ownerHeaders,
      body: { isTriggered: true, triggeredAt: '2026-09-02T03:04:05.000Z' },
    })
    expect(triggerResponse.status).toBe(200)
    expect(priceAlertResponseSchema.parse(await readJson(triggerResponse))).toMatchObject({
      id: priceAlert.id,
      isTriggered: true,
      triggeredAt: '2026-09-02T03:04:05.000Z',
    })
    await expectError(
      await requestJson(`/api/stocks/alerts/${priceAlert.id}`, {
        method: 'PUT',
        headers: ownerHeaders,
        body: { isTriggered: false },
      }),
      400,
      'SYS_VALIDATION_ERROR',
    )

    const priceListResponse = await requestJson('/api/stocks/alerts', { headers: ownerHeaders })
    expect(priceListResponse.status).toBe(200)
    const priceAlerts = priceAlertListResponseSchema.parse(await readJson(priceListResponse))
    expect(priceAlerts).toHaveLength(2)
    expect(priceAlerts.find(alert => alert.id === priceAlert.id)).toMatchObject({
      isTriggered: true,
      triggeredAt: '2026-09-02T03:04:05.000Z',
    })
    expect(priceAlerts.find(alert => alert.id === secondPriceAlert.id)).toMatchObject({
      isTriggered: false,
      triggeredAt: null,
    })

    await expectError(
      await requestJson(`/api/stocks/alerts/${priceAlert.id}`, {
        method: 'DELETE',
        headers: otherHeaders,
      }),
      404,
      'PRICE_ALERT_NOT_FOUND',
    )
    const deleteResponse = await requestJson(`/api/stocks/alerts/${secondPriceAlert.id}`, {
      method: 'DELETE',
      headers: ownerHeaders,
    })
    expect(deleteResponse.status).toBe(200)
    expect(await readJson(deleteResponse)).toEqual({ success: true })
  }, 60_000)

  it('freezes Stock notes/watchlist/timeline/evidence canonical wire, idempotency, errors, and ownership', async () => {
    const symbol = 'LUNA06'
    const ownerHeaders = authHeaders(owner)
    const otherHeaders = authHeaders(other)

    await expectError(
      await requestJson(`/api/stocks/${symbol}/notes`),
      401,
      'AUTH_UNAUTHORIZED',
    )

    const firstNoteResponse = await requestJson(`/api/stocks/${symbol.toLowerCase()}/notes`, {
      method: 'POST',
      headers: ownerHeaders,
      body: {
        title: 'Current view',
        content: 'Demand remains constructive.',
        date: '2026-08-01T00:00:00.000Z',
      },
    })
    expect(firstNoteResponse.status).toBe(200)
    const firstNote = stockNoteResponseSchema.parse(await readJson(firstNoteResponse))
    expect(firstNote).toMatchObject({
      id: expect.stringMatching(/^[1-9]\d*$/),
      symbol,
      title: 'Current view',
      date: '2026-08-01T00:00:00.000Z',
      createdVia: 'USER',
      createdByLabel: null,
    })

    const secondNoteResponse = await requestJson(`/api/stocks/${symbol}/notes`, {
      method: 'POST',
      headers: ownerHeaders,
      body: {
        title: 'Updated view',
        content: 'Margins are improving.',
        date: '2026-08-02T00:00:00.000Z',
      },
    })
    const secondNote = stockNoteResponseSchema.parse(await readJson(secondNoteResponse))

    const noteListResponse = await requestJson(`/api/stocks/${symbol}/notes?page=1&limit=1`, {
      headers: ownerHeaders,
    })
    expect(noteListResponse.status).toBe(200)
    const noteList = stockNoteListResponseSchema.parse(await readJson(noteListResponse))
    expect(noteList.pagination).toEqual({ page: 1, limit: 1, total: 2, totalPages: 2 })
    expect(noteList.data[0]).toMatchObject({
      id: secondNote.id,
      symbol,
      isOwnedByViewer: true,
    })

    await expectError(
      await requestJson(`/api/stocks/${symbol}/notes/${firstNote.id}`, {
        method: 'PUT',
        headers: otherHeaders,
        body: { title: 'Foreign edit' },
      }),
      404,
      'STOCK_NOTE_NOT_FOUND',
    )
    const otherNoteListResponse = await requestJson(`/api/stocks/${symbol}/notes`, {
      headers: otherHeaders,
    })
    const otherNoteList = stockNoteListResponseSchema.parse(await readJson(otherNoteListResponse))
    expect(otherNoteList.pagination.total).toBe(0)
    expect(otherNoteList.data).toEqual([])

    await expectError(
      await requestJson(`/api/stocks/${symbol}/evidence`, {
        method: 'POST',
        headers: ownerHeaders,
        body: {
          summary: 'Bad source URL',
          sourceType: 'ARTICLE',
          sourceUrl: 'ftp://example.com/nope',
          occurredAt: '2026-08-03T00:00:00.000Z',
          idempotencyKey: 'luna06-invalid-url',
        },
      }),
      400,
      'SYS_VALIDATION_ERROR',
    )

    const evidencePayload = {
      summary: 'A filing confirms the operating thesis.',
      sourceType: 'SEC_FILING',
      sourceTitle: 'Quarterly filing',
      sourceUrl: 'https://example.com/luna06-filing',
      occurredAt: '2026-08-03T00:00:00.000Z',
      idempotencyKey: 'luna06-filing-1',
    }
    const evidenceResponse = await requestJson(`/api/stocks/${symbol.toLowerCase()}/evidence`, {
      method: 'POST',
      headers: ownerHeaders,
      body: evidencePayload,
    })
    expect(evidenceResponse.status).toBe(200)
    const evidence = (await readJson(evidenceResponse))
    expect(evidence).toMatchObject({
      id: expect.stringMatching(/^[1-9]\d*$/),
      symbol,
      sourceType: 'SEC_FILING',
      sourceUrl: evidencePayload.sourceUrl,
      sourceDiaryId: null,
      createdVia: 'WEB',
      occurredAt: evidencePayload.occurredAt,
    })

    const duplicateEvidenceResponse = await requestJson(`/api/stocks/${symbol}/evidence`, {
      method: 'POST',
      headers: ownerHeaders,
      body: { ...evidencePayload, summary: 'Should remain the first immutable evidence.' },
    })
    expect(duplicateEvidenceResponse.status).toBe(200)
    expect((await readJson(duplicateEvidenceResponse)).id).toBe(evidence.id)

    const symbolTimelineResponse = await requestJson(`/api/stocks/${symbol}/timeline?limit=1`, {
      headers: ownerHeaders,
    })
    expect(symbolTimelineResponse.status).toBe(200)
    const symbolTimeline = stockSymbolTimelineResponseSchema.parse(await readJson(symbolTimelineResponse))
    expect(symbolTimeline).toMatchObject({
      stock: { symbol, name: null },
      records: [{ id: evidence.id, sourceType: 'SEC_FILING', sourceDiaryId: null }],
    })

    const allTimelineResponse = await requestJson('/api/stocks/timeline?limit=10', {
      headers: ownerHeaders,
    })
    const allTimeline = stockTimelineListResponseSchema.parse(await readJson(allTimelineResponse))
    expect(allTimeline.records.map(record => record.id)).toContain(evidence.id)

    const watchlistResponse = await requestJson('/api/stocks/watchlist', {
      headers: ownerHeaders,
    })
    expect(watchlistResponse.status).toBe(200)
    const watchlist = stockWatchlistResponseSchema.parse(await readJson(watchlistResponse))
    expect(watchlist.items).toHaveLength(1)
    expect(watchlist.items[0]).toMatchObject({
      id: expect.stringMatching(/^[1-9]\d*$/),
      status: 'WATCHING',
      stock: { symbol, name: null },
      recordCount: 1,
      latestRecord: { id: evidence.id, sourceType: 'SEC_FILING' },
    })

    const otherTimelineResponse = await requestJson(`/api/stocks/${symbol}/timeline`, {
      headers: otherHeaders,
    })
    const otherTimeline = stockSymbolTimelineResponseSchema.parse(await readJson(otherTimelineResponse))
    expect(otherTimeline.records).toEqual([])
    const otherWatchlistResponse = await requestJson('/api/stocks/watchlist', {
      headers: otherHeaders,
    })
    expect(stockWatchlistResponseSchema.parse(await readJson(otherWatchlistResponse))).toEqual({ items: [] })

    const watchlistId = watchlist.items[0]!.id
    const archiveResponse = await requestJson(`/api/stocks/watchlist/${watchlistId}`, {
      method: 'DELETE',
      headers: ownerHeaders,
    })
    expect(archiveResponse.status).toBe(200)
    expect(await readJson(archiveResponse)).toEqual({ success: true })
    const archivedListResponse = await requestJson('/api/stocks/watchlist', {
      headers: ownerHeaders,
    })
    expect(stockWatchlistResponseSchema.parse(await readJson(archivedListResponse))).toEqual({ items: [] })
  }, 60_000)

  it('freezes Activity cursor, Portfolio projections, and Market State wire contracts', async () => {
    const ownerHeaders = authHeaders(owner)
    const symbol = 'LUNA07'

    const firstDiaryResponse = await requestJson('/api/diaries', {
      method: 'POST',
      headers: ownerHeaders,
      body: {
        title: 'Activity first',
        content: 'The first activity page has a persisted transaction.',
        date: '2026-08-30',
        transactions: [{
          symbol,
          type: 'BUY',
          quantity: '2.5',
          price: '100.25',
          tradeDate: '2026-08-30T13:30:00.000Z',
        }],
      },
    })
    expect(firstDiaryResponse.status).toBe(201)

    await createDiary(owner, '2026-08-29', 'Activity second')

    const firstPageResponse = await requestJson('/api/investment-activity?limit=1', {
      headers: ownerHeaders,
    })
    expect(firstPageResponse.status).toBe(200)
    const firstPage = investmentActivityResponseSchema.parse(await readJson(firstPageResponse))
    expect(firstPage.data).toHaveLength(1)
    expect(firstPage.data[0]).toMatchObject({
      kind: 'diary',
      occurredAt: '2026-08-30',
      diaryId: expect.stringMatching(/^[1-9]\d*$/),
      metadata: { transactionContext: [{ quantity: '2.5', price: '100.25' }] },
    })
    expect(firstPage.pagination).toMatchObject({
      hasMore: true,
      nextCursor: expect.any(String),
      asOf: expect.stringMatching(/Z$/),
    })

    const nextPageResponse = await requestJson(
      `/api/investment-activity?limit=1&cursor=${encodeURIComponent(firstPage.pagination.nextCursor!)}&asOf=${encodeURIComponent(firstPage.pagination.asOf)}`,
      { headers: ownerHeaders },
    )
    expect(nextPageResponse.status).toBe(200)
    const nextPage = investmentActivityResponseSchema.parse(await readJson(nextPageResponse))
    expect(nextPage.data).toHaveLength(1)
    expect(nextPage.data[0]?.occurredAt).toBe('2026-08-29')
    expect(nextPage.pagination).toMatchObject({ hasMore: false, nextCursor: null, asOf: firstPage.pagination.asOf })

    await expectError(
      await requestJson('/api/investment-activity?cursor=not-a-valid-cursor', { headers: ownerHeaders }),
      400,
      'INVALID_CURSOR',
    )

    const holdingsResponse = await requestJson('/api/stocks/holdings', { headers: ownerHeaders })
    expect(holdingsResponse.status).toBe(200)
    const holdings = portfolioHoldingsResponseSchema.parse(await readJson(holdingsResponse))
    expect(holdings).toEqual([expect.objectContaining({
      symbol,
      quantity: 2.5,
      avgCost: 100.25,
      totalCost: 250.625,
    })])

    const portfolioResponse = await requestJson('/api/stocks/portfolio', { headers: ownerHeaders })
    expect(portfolioResponse.status).toBe(200)
    const portfolio = portfolioValuationResponseSchema.parse(await readJson(portfolioResponse))
    expect(portfolio.holdings[0]).toMatchObject({ symbol, quantity: 2.5 })
    expect(portfolio.valuation.totalHoldings).toBe(1)

    const attentionResponse = await requestJson('/api/portfolio/attention', { headers: ownerHeaders })
    expect(attentionResponse.status).toBe(200)
    expect(portfolioAttentionResponseSchema.parse(await readJson(attentionResponse))).toMatchObject({
      coverage: { total: 1 },
      asOf: expect.stringMatching(/Z$/),
    })

    const marketHistoryResponse = await requestJson('/api/market/state/history?days=1')
    expect(marketHistoryResponse.status).toBe(200)
    expect(marketStateHistoryResponseSchema.parse(await readJson(marketHistoryResponse))).toEqual([])
    await expectError(await requestJson('/api/market/state/history?days=0'), 400, 'SYS_VALIDATION_ERROR')
  }, 60_000)

  it('keeps Company Hub output canonical for a stock with no leaked foreign resources', async () => {
    const ownerHeaders = authHeaders(owner)
    const response = await requestJson('/api/stocks/LUNA03/hub', { headers: ownerHeaders })

    // Hub quote lookup is best-effort; with no holdings it remains deterministic
    // even when the disposable test environment has no Yahoo connectivity.
    expect(response.status).toBe(200)
    const hub = companyHubResponseSchema.parse(await readJson(response))
    expect(hub).toMatchObject({
      company: {
        id: null,
        symbol: 'LUNA03',
        name: null,
        watchStatus: null,
      },
      position: {
        state: 'untracked',
        quantity: 0,
        totalCost: 0,
        concentrationBasis: 'unavailable',
        quoteStatus: 'missing',
      },
      thesis: null,
      latestReview: null,
      reviews: [],
      notes: [],
      evidence: [],
      relatedDiaries: [],
    })
  }, 60_000)
})
