import { describe, expect, it, vi } from 'vitest'
import { SecEdgarClient, buildSecUrls } from '~/server/utils/sec-edgar/client'

describe('SEC EDGAR client', () => {
  it('constructs only canonical SEC URLs', () => {
    expect(buildSecUrls.submissions('320193')).toBe('https://data.sec.gov/submissions/CIK0000320193.json')
    expect(buildSecUrls.document('320193', '0000320193-24-000123', 'a10-k.htm')).toBe(
      'https://www.sec.gov/Archives/edgar/data/320193/000032019324000123/a10-k.htm',
    )
  })

  it('retries 429 responses and honors Retry-After', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined)
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 429, headers: { 'Retry-After': '2' } }))
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } }))
    const client = new SecEdgarClient({ userAgent: 'Test App test@example.com', fetchFn, sleep, minIntervalMs: 0 })
    await expect(client.getJson<{ ok: boolean }>('https://data.sec.gov/submissions/CIK0000320193.json')).resolves.toEqual({ ok: true })
    expect(sleep).toHaveBeenCalledWith(2000)
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('blocks unsafe redirects', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('', { status: 302, headers: { location: 'https://evil.example/file' } }))
    const client = new SecEdgarClient({ userAgent: 'Test App test@example.com', fetchFn, minIntervalMs: 0 })
    await expect(client.getJson('https://data.sec.gov/submissions/CIK0000320193.json')).rejects.toMatchObject({ code: 'SEC_UNSAFE_REDIRECT' })
  })

  it('blocks arbitrary paths even on an allowed SEC host', async () => {
    const client = new SecEdgarClient({ userAgent: 'Test App test@example.com', fetchFn: vi.fn(), minIntervalMs: 0 })
    await expect(client.getJson('https://www.sec.gov/admin')).rejects.toMatchObject({ code: 'SEC_VALIDATION_ERROR' })
  })
})
