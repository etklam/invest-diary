import { describe, expect, it } from 'vitest'
import { createApiClient } from '~/lib/api-client'

describe('generated API client facade', () => {
  it('uses generated diary types and serializes query values through openapi-fetch', async () => {
    const requests: Request[] = []
    const fetcher = async (request: Request): Promise<Response> => {
      requests.push(request)
      return new Response(JSON.stringify({
        data: [],
        pagination: { page: 2, limit: 5, total: 0, totalPages: 0 },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    const client = createApiClient({ baseUrl: 'https://api.example.test/api', fetch: fetcher })

    const result = await client.diaries.list({ page: '2', limit: '5' })

    expect(result.response.status).toBe(200)
    expect(result.data?.pagination).toEqual({ page: 2, limit: 5, total: 0, totalPages: 0 })
    expect(requests).toHaveLength(1)
    const url = new URL(requests[0]!.url)
    expect(url.pathname).toBe('/api/diaries')
    expect(url.searchParams.get('page')).toBe('2')
    expect(url.searchParams.get('limit')).toBe('5')
  })

  it('exposes named auth, diary, stock and timeline methods', () => {
    const client = createApiClient({ baseUrl: 'https://api.example.test/api' })

    expect(typeof client.auth.me).toBe('function')
    expect(typeof client.auth.nativeRefresh).toBe('function')
    expect(typeof client.diaries.list).toBe('function')
    expect(typeof client.diaries.get).toBe('function')
    expect(typeof client.diaries.review).toBe('function')
    expect(typeof client.stocks.get).toBe('function')
    expect(typeof client.timeline.list).toBe('function')
  })
})
