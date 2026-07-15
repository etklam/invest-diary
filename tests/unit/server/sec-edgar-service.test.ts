import { describe, expect, it, vi } from 'vitest'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { SecEdgarService } from '~/server/utils/sec-edgar/service'
import { buildSecUrls } from '~/server/utils/sec-edgar/client'

const fixture = (name: string) => readFile(resolve(process.cwd(), 'tests/fixtures/sec', name), 'utf8').then(JSON.parse)
const fixtureText = (name: string) => readFile(resolve(process.cwd(), 'tests/fixtures/sec', name), 'utf8')

describe('SEC EDGAR service', () => {
  it('searches by normalized ticker, name, and CIK while coalescing company rows', async () => {
    const directory = await fixture('company-directory.json')
    const service = new SecEdgarService({ getJson: vi.fn().mockResolvedValue(directory), getText: vi.fn() } as any)
    expect((await service.searchCompanies(' aapl ', 10)).value[0]).toMatchObject({ cik: '0000320193', matchedBy: 'ticker' })
    expect((await service.searchCompanies('berkshire', 10)).value[0]).toMatchObject({ tickers: ['BRK.B', 'BRK.A'], matchedBy: 'name' })
    expect((await service.searchCompanies('320193', 10)).value[0]).toMatchObject({ matchedBy: 'cik' })
  })

  it('merges recent and historical filings, filters amendments, and paginates', async () => {
    const submissions = await fixture('submissions.json')
    const historical = await fixture('historical.json')
    const getJson = vi.fn(async (url: string) => url.includes('submissions-001') ? historical : submissions)
    const service = new SecEdgarService({ getJson, getText: vi.fn() } as any)
    const page = await service.listFilings('320193', { forms: ['10-K'], amendments: 'exclude', limit: 2 })
    expect(page.value.filings.map(f => f.filingDate)).toEqual(['2024-11-01', '2023-11-03'])
    expect(page.value.nextCursor).toBeTruthy()
    const next = await service.listFilings('320193', { forms: ['10-K'], amendments: 'exclude', limit: 2, cursor: page.value.nextCursor! })
    expect(next.value.filings[0]?.filingDate).toBe('2022-10-28')
    const amendments = await service.listFilings('320193', { forms: ['10-Q'], amendments: 'only', limit: 10 })
    expect(amendments.value.filings.map(f => f.form)).toEqual(['10-Q/A'])
  })

  it('classifies every safe submitted document including original PDFs', async () => {
    const submissions = await fixture('submissions.json')
    const index = await fixture('filing-index.json')
    const html = await fixtureText('filing-index.html')
    const getJson = vi.fn(async (url: string) => url === buildSecUrls.filingIndexJson('320193', '0000320193-24-000123') ? index : submissions)
    const service = new SecEdgarService({ getJson, getText: vi.fn().mockResolvedValue(html) } as any)
    const detail = await service.getFilingDetail('320193', '0000320193-24-000123')
    expect(detail.value.documents.map(d => [d.basename, d.classification])).toEqual([
      ['a10-k.htm', 'primary'],
      ['a10-k_htm.xml', 'xbrl'],
      ['aapl-20240928.xsd', 'xbrl'],
      ['exhibit101.pdf', 'pdf'],
      ['0000320193-24-000123.txt', 'complete-submission'],
    ])
    expect(detail.value.hasPdf).toBe(true)
    expect(detail.value.documents.find(d => d.basename === 'exhibit101.pdf')).toMatchObject({ isPdf: true, isExhibit: true })
  })

  it('keeps foreign issuer forms and their amendments', async () => {
    const foreign = { name: 'Foreign Issuer', tickers: ['FPI'], exchanges: ['NYSE'], filings: { recent: { accessionNumber: ['0000909832-24-000001', '0000909832-24-000002', '0000909832-24-000003'], filingDate: ['2024-03-01', '2024-04-01', '2024-05-01'], reportDate: ['2023-12-31', '2024-03-31', '2023-12-31'], form: ['20-F', '6-K/A', '40-F'], primaryDocument: ['20f.htm', '6ka.htm', '40f.htm'] }, files: [] } }
    const service = new SecEdgarService({ getJson: vi.fn().mockResolvedValue(foreign), getText: vi.fn() } as any)
    const page = await service.listFilings('909832', { forms: [], amendments: 'include', limit: 10 })
    expect(page.value.filings.map(f => f.form)).toEqual(['40-F', '6-K/A', '20-F'])
  })
})
