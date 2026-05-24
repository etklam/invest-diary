import { afterEach, describe, expect, it } from 'vitest'
import {
  buildDisciplineOgImageURL,
  exportDisciplines,
  generatePublicShareURL,
  generateShareURL,
  generateSocialShareURL,
  parseImportFromURL,
} from '~/lib/disciplineShare'

const originalLocation = window.location.href

function setLocation(url: string) {
  window.history.replaceState(null, '', url)
}

function toLocalTestUrl(url: string) {
  const parsed = new URL(url)
  return `${window.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`
}

describe('discipline share URL imports', () => {
  afterEach(() => {
    setLocation(originalLocation)
  })

  it('generates a server-shareable query URL that can be imported by the client', () => {
    const data = exportDisciplines(
      [
        { id: 9, content: '先寫計畫再下單', order: 2, createdAt: '2026-01-02T00:00:00.000Z' },
        { id: 1, content: '風險不得超過 1%', order: 1, createdAt: '2026-01-01T00:00:00.000Z' },
      ],
      {
        title: '紀律清單',
        description: '公開分享用',
      }
    )

    const url = generateShareURL(data, 'https://example.com')

    expect(url).toMatch(/^https:\/\/example\.com\/discipline\?import=/)

    setLocation(toLocalTestUrl(url))
    const preview = parseImportFromURL()

    expect(preview).toMatchObject({
      isValid: true,
      title: '紀律清單',
      author: 'Anonymous',
      description: '公開分享用',
      count: 2,
      disciplines: [
        { content: '風險不得超過 1%', order: 1 },
        { content: '先寫計畫再下單', order: 2 },
      ],
    })
  })

  it('generates a public landing URL for social crawlers without changing the import URL', () => {
    const data = exportDisciplines(
      [{ content: '不凹單', order: 1 }],
      { title: '公開紀律', author: 'Kai' }
    )

    const importUrl = generateShareURL(data, 'https://example.com/')
    const publicShareUrl = generatePublicShareURL(data, 'https://example.com/')

    expect(importUrl).toMatch(/^https:\/\/example\.com\/discipline\?import=/)
    expect(publicShareUrl).toMatch(/^https:\/\/example\.com\/discipline\/share\?import=/)

    const twitterUrl = generateSocialShareURL(data, 'twitter')
    expect(decodeURIComponent(twitterUrl)).toContain('/discipline/share?import=')
  })

  it('builds the SVG OG image URL from decoded import preview data', () => {
    const data = exportDisciplines(
      [{ content: '只做看得懂的交易', order: 1 }],
      { title: 'OG 預覽', author: 'K & Co' }
    )
    const importData = new URL(generateShareURL(data, 'https://example.com')).searchParams.get('import')

    setLocation(`${window.location.origin}/discipline?import=${importData}`)
    const preview = parseImportFromURL()

    expect(buildDisciplineOgImageURL(preview, 'https://example.com/')).toBe(
      'https://example.com/api/og/discipline.svg?title=OG+%E9%A0%90%E8%A6%BD&author=K+%26+Co&count=1'
    )
  })

  it('keeps backward compatibility with hash-based import URLs', () => {
    const data = exportDisciplines([
      { content: '不要追高', order: 1 },
    ])

    const queryUrl = generateShareURL(data, 'https://example.com')
    const importData = new URL(queryUrl).searchParams.get('import')
    expect(importData).toBeTruthy()

    setLocation(`${window.location.origin}/discipline#import=${importData}`)

    expect(parseImportFromURL()).toMatchObject({
      isValid: true,
      count: 1,
      disciplines: [{ content: '不要追高', order: 1 }],
    })
  })
})
