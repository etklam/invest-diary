import createClient, { type Client } from 'openapi-fetch'
import type { paths } from './generated'

type Transport = Client<paths>
type TransportOptions = NonNullable<Parameters<typeof createClient<paths>>[0]>

export type ApiClientOptions = Pick<TransportOptions, 'baseUrl' | 'fetch' | 'headers'>
export type ApiResponse<T> = Awaited<ReturnType<Transport['GET']>> & { data?: T }

type DiaryListQuery = NonNullable<NonNullable<paths['/diaries']['get']['parameters']>['query']>
type DiaryReviewBody = paths['/diaries/{id}/review']['patch']['requestBody']['content']['application/json']
type StockTimelineQuery = NonNullable<NonNullable<paths['/stocks/timeline']['get']['parameters']>['query']>
type InvestmentActivityQuery = NonNullable<NonNullable<paths['/investment-activity']['get']['parameters']>['query']>

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

  return {
    auth: {
      login: (body: paths['/auth/login']['post']['requestBody']['content']['application/json']) =>
        transport.POST('/auth/login', { body }),
      me: () => transport.GET('/auth/me'),
      logout: () => transport.POST('/auth/logout'),
      nativeLogin: (body: paths['/auth/native/login']['post']['requestBody']['content']['application/json']) =>
        transport.POST('/auth/native/login', { body }),
      nativeRefresh: (body: paths['/auth/native/refresh']['post']['requestBody']['content']['application/json']) =>
        transport.POST('/auth/native/refresh', { body }),
      nativeLogout: (body: paths['/auth/native/logout']['post']['requestBody']['content']['application/json']) =>
        transport.POST('/auth/native/logout', { body }),
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
    },
    timeline: {
      list: (query?: InvestmentActivityQuery) =>
        transport.GET('/investment-activity', query ? { params: { query } } : undefined),
      stocks: (query?: StockTimelineQuery) =>
        transport.GET('/stocks/timeline', query ? { params: { query } } : undefined),
    },
    transport,
  }
}

export type Api = ReturnType<typeof createApiClient>

/** Same-origin browser default; consumers may create an isolated client for tests/native callers. */
export const api = createApiClient()
