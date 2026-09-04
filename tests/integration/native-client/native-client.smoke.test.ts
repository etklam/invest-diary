// @vitest-environment node

import { describe, expect, it, vi } from 'vitest'
import { createApiClient, createSingleFlightRefresh } from '~/lib/api-client'

const user = {
  id: '42',
  email: 'native@example.test',
  name: 'Native User',
  role: 'USER' as const,
  expectedMonthlyTrades: 12,
  expectedProfit: '100.00',
  expectedAvgHolding: '5.00',
  timezone: 'Asia/Taipei',
}

function tokenPair(accessToken: string, refreshToken: string) {
  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt: '2026-09-05T03:00:00.000Z',
    refreshTokenExpiresAt: '2026-10-05T03:00:00.000Z',
    user,
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function authError(): Response {
  return jsonResponse({
    statusCode: 401,
    statusMessage: 'Unauthorized',
    data: {
      code: 'AUTH_TOKEN_EXPIRED',
      details: null,
      requestId: 'native-smoke-request',
    },
  }, 401)
}

describe('React Native fetch-based API client compatibility', () => {
  it('uses JSON native auth, Bearer-only requests, single-flight refresh, retry, and logout', async () => {
    const requests: Request[] = []
    let accessToken: string | undefined
    let refreshToken: string | undefined
    let refreshCalls = 0
    let releaseRefresh: (() => void) | undefined
    let refreshResponse: Promise<Response> | undefined
    let loggedOut = false

    const fetcher = async (request: Request): Promise<Response> => {
      requests.push(request)
      const url = new URL(request.url)
      const authorization = request.headers.get('authorization')

      // This is the runtime assertion that the client does not depend on a
      // browser cookie jar. React Native supplies ordinary fetch Request data.
      expect(request.headers.get('cookie')).toBeNull()

      if (request.method === 'POST' && url.pathname === '/api/auth/native/login') {
        expect(authorization).toBeNull()
        expect(await request.json()).toEqual({
          email: 'native@example.test',
          password: 'password123',
          deviceName: 'Phone A',
        })
        return jsonResponse({ ok: true, data: tokenPair('access-A', 'refresh-A') })
      }

      if (request.method === 'GET' && url.pathname === '/api/auth/me') {
        expect(authorization).toBe('Bearer access-A')
        return jsonResponse({ ok: true, data: user })
      }

      if (request.method === 'POST' && url.pathname === '/api/auth/native/refresh') {
        refreshCalls += 1
        expect(authorization).toBeNull()
        expect(await request.json()).toEqual({ refreshToken: 'refresh-A' })
        refreshResponse ??= new Promise<Response>((resolve) => {
          releaseRefresh = () => resolve(jsonResponse({ ok: true, data: tokenPair('access-B', 'refresh-B') }))
        })
        return refreshResponse
      }

      if (request.method === 'GET' && url.pathname === '/api/diaries') {
        if (authorization !== 'Bearer access-B') return authError()
        return jsonResponse({
          data: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        })
      }

      if (request.method === 'GET' && url.pathname === '/api/stocks/AAPL/timeline') {
        expect(authorization).toBe('Bearer access-B')
        return jsonResponse({ stock: { symbol: 'AAPL', name: null }, records: [] })
      }

      if (request.method === 'GET' && url.pathname === '/api/alerts') {
        expect(authorization).toBe('Bearer access-B')
        return jsonResponse([])
      }

      if (request.method === 'GET' && url.pathname === '/api/investment-activity') {
        expect(authorization).toBe('Bearer access-B')
        return jsonResponse({ data: [], pagination: {
          nextCursor: null,
          hasMore: false,
          asOf: '2026-09-05T03:00:00.000Z',
        } })
      }

      if (request.method === 'GET' && url.pathname === '/api/stocks/portfolio') {
        expect(authorization).toBe('Bearer access-B')
        return jsonResponse({})
      }

      if (request.method === 'POST' && url.pathname === '/api/auth/native/logout') {
        expect(authorization).toBeNull()
        expect(await request.json()).toEqual({ refreshToken: 'refresh-B' })
        loggedOut = true
        return jsonResponse({ ok: true })
      }

      throw new Error(`Unexpected native smoke request: ${request.method} ${url.pathname}`)
    }

    const client = createApiClient({
      baseUrl: 'https://api.example.test/api',
      fetch: fetcher,
      getAccessToken: () => accessToken,
    })

    const login = await client.auth.native.login({
      email: 'native@example.test',
      password: 'password123',
      deviceName: 'Phone A',
    })
    expect(login.data?.data.accessToken).toBe('access-A')
    accessToken = login.data?.data.accessToken
    refreshToken = login.data?.data.refreshToken

    const me = await client.auth.me()
    expect(me.data?.data.email).toBe('native@example.test')

    const refreshOnce = createSingleFlightRefresh(async () => {
      const result = await client.auth.native.refresh({ refreshToken: refreshToken! })
      expect(result.error).toBeUndefined()
      const replacement = result.data!.data
      accessToken = replacement.accessToken
      refreshToken = replacement.refreshToken
      return replacement
    })

    const requestWithRefresh = async () => {
      const first = await client.diaries.list({ page: '1', limit: '20' })
      if (first.response.status !== 401) return first
      await refreshOnce()
      return client.diaries.list({ page: '1', limit: '20' })
    }

    const pendingRequests = Promise.all(Array.from({ length: 4 }, () => requestWithRefresh()))
    await vi.waitFor(() => expect(refreshCalls).toBe(1))
    releaseRefresh?.()
    const diaryResults = await pendingRequests
    expect(diaryResults).toHaveLength(4)
    expect(diaryResults.every(result => result.response.status === 200)).toBe(true)
    expect(refreshCalls).toBe(1)

    await expect(client.stocks.timeline('AAPL')).resolves.toMatchObject({ response: { status: 200 } })
    await expect(client.alerts.list()).resolves.toMatchObject({ response: { status: 200 } })
    await expect(client.timeline.list()).resolves.toMatchObject({ response: { status: 200 } })
    await expect(client.portfolio.valuation()).resolves.toMatchObject({ response: { status: 200 } })

    await client.auth.native.logout({ refreshToken: refreshToken! })
    expect(loggedOut).toBe(true)
    expect(requests.some(request => request.headers.has('cookie'))).toBe(false)
  })
})
