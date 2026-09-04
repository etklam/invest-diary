import createClient, { type Client } from 'openapi-fetch'
import type { paths } from './generated'

type Transport = Client<paths>
type TransportOptions = NonNullable<Parameters<typeof createClient<paths>>[0]>

export type ApiClientOptions = Pick<TransportOptions, 'baseUrl' | 'fetch' | 'headers'> & {
  /** Read the current native access token immediately before each request. */
  getAccessToken?: () => string | null | undefined
}
export type ApiResponse<T> = Awaited<ReturnType<Transport['GET']>> & { data?: T }

type DiaryListQuery = NonNullable<NonNullable<paths['/diaries']['get']['parameters']>['query']>
type DiaryReviewBody = paths['/diaries/{id}/review']['patch']['requestBody']['content']['application/json']
type StockTimelineQuery = NonNullable<NonNullable<paths['/stocks/timeline']['get']['parameters']>['query']>
type InvestmentActivityQuery = NonNullable<NonNullable<paths['/investment-activity']['get']['parameters']>['query']>
type TradePlanListQuery = NonNullable<NonNullable<paths['/trade-plans']['get']['parameters']>['query']>

/**
 * Framework-neutral named API facade.
 *
 * It intentionally returns openapi-fetch's `{ data, error, response }` result
 * so callers can handle HTTP failures without a second DTO or state layer.
 */
export function createApiClient(options: ApiClientOptions = {}) {
  const transport = createClient<paths>({
    baseUrl: options.baseUrl ?? '/api',
    ...(options.fetch ? { fetch: options.fetch } : {}),
    ...(options.headers ? { headers: options.headers } : {}),
  })

  if (options.getAccessToken) {
    transport.use({
      onRequest: ({ request }) => {
        const pathname = new URL(request.url, 'http://localhost').pathname
        const isNativeAuthWithoutBearer = /\/auth\/native\/(?:login|refresh|logout)$/.test(pathname)
        if (isNativeAuthWithoutBearer) return request

        const accessToken = options.getAccessToken?.()
        if (accessToken) {
          request.headers.set('Authorization', `Bearer ${accessToken}`)
        } else {
          request.headers.delete('Authorization')
        }
        return request
      },
    })
  }

  const native = {
    login: (body: paths['/auth/native/login']['post']['requestBody']['content']['application/json']) =>
      transport.POST('/auth/native/login', { body }),
    refresh: (body: paths['/auth/native/refresh']['post']['requestBody']['content']['application/json']) =>
      transport.POST('/auth/native/refresh', { body }),
    logout: (body: paths['/auth/native/logout']['post']['requestBody']['content']['application/json']) =>
      transport.POST('/auth/native/logout', { body }),
  }

  return {
    auth: {
      login: (body: paths['/auth/login']['post']['requestBody']['content']['application/json']) =>
        transport.POST('/auth/login', { body }),
      me: () => transport.GET('/auth/me'),
      logout: () => transport.POST('/auth/logout'),
      logoutAll: () => transport.POST('/auth/logout-all'),
      native,
      /** Flat aliases retained for callers using the original facade surface. */
      nativeLogin: native.login,
      nativeRefresh: native.refresh,
      nativeLogout: native.logout,
    },
    diaries: {
      list: (query?: DiaryListQuery) =>
        transport.GET('/diaries', query ? { params: { query } } : undefined),
      get: (id: string) => transport.GET('/diaries/{id}', { params: { path: { id } } }),
      review: (id: string, body: DiaryReviewBody) =>
        transport.PATCH('/diaries/{id}/review', { params: { path: { id } }, body }),
    },
    stocks: {
      get: (symbol: string) => transport.GET('/stocks/{symbol}/hub', { params: { path: { symbol } } }),
      timeline: (symbol: string, query?: StockTimelineQuery) =>
        transport.GET('/stocks/{symbol}/timeline', {
          params: { path: { symbol }, ...(query ? { query } : {}) },
        }),
      watchlist: () => transport.GET('/stocks/watchlist'),
    },
    alerts: {
      list: () => transport.GET('/alerts'),
    },
    timeline: {
      list: (query?: InvestmentActivityQuery) =>
        transport.GET('/investment-activity', query ? { params: { query } } : undefined),
      stocks: (query?: StockTimelineQuery) =>
        transport.GET('/stocks/timeline', query ? { params: { query } } : undefined),
    },
    portfolio: {
      attention: () => transport.GET('/portfolio/attention'),
      holdings: () => transport.GET('/stocks/holdings'),
      valuation: () => transport.GET('/stocks/portfolio'),
    },
    tradePlans: {
      list: (query?: TradePlanListQuery) =>
        transport.GET('/trade-plans', query ? { params: { query } } : undefined),
    },
    transport,
  }
}

export type Api = ReturnType<typeof createApiClient>

export { createSingleFlightRefresh } from './native-refresh'

/** Same-origin browser default; consumers may create an isolated client for tests/native callers. */
export const api = createApiClient()
