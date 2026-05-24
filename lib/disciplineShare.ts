/**
 * Trading Discipline Share/Import Utilities
 */

export interface DisciplineItem {
  id?: number
  content: string
  order: number
  createdAt?: string
}

export interface DisciplineShareData {
  version: string
  type: string
  author?: string
  title?: string
  description?: string
  disciplines: Omit<DisciplineItem, 'id' | 'createdAt'>[]
  exportedAt: string
  count: number
}

export interface DisciplineImportPreview {
  title: string
  author?: string
  description?: string
  disciplines: Omit<DisciplineItem, 'id' | 'createdAt'>[]
  count: number
  isValid: boolean
}

const CURRENT_VERSION = '1.0'
const SHARE_TYPE = 'trading-disciplines'

/**
 * Generate shareable data from discipline list
 */
export function exportDisciplines(
  disciplines: DisciplineItem[],
  options: {
    author?: string
    title?: string
    description?: string
  } = {}
): DisciplineShareData {
  const { author, title, description } = options

  // Strip id and createdAt, keep only content and order
  const cleanDisciplines = disciplines
    .sort((a, b) => a.order - b.order)
    .map(({ content, order }) => ({ content, order }))

  return {
    version: CURRENT_VERSION,
    type: SHARE_TYPE,
    author: author || 'Anonymous',
    title: title || 'My Trading Disciplines',
    description,
    disciplines: cleanDisciplines,
    exportedAt: new Date().toISOString(),
    count: cleanDisciplines.length
  }
}

/**
 * Convert share data to JSON string
 */
export function shareDataToJSON(data: DisciplineShareData): string {
  return JSON.stringify(data, null, 2)
}

/**
 * Parse JSON string to share data with validation
 */
export function parseShareData(json: string): DisciplineImportPreview {
  try {
    const data = JSON.parse(json) as DisciplineShareData

    // Validate structure
    if (data.version !== CURRENT_VERSION) {
      return {
        title: data.title || 'Import Error',
        disciplines: [],
        count: 0,
        isValid: false
      }
    }

    if (data.type !== SHARE_TYPE) {
      return {
        title: data.title || 'Import Error',
        disciplines: [],
        count: 0,
        isValid: false
      }
    }

    if (!Array.isArray(data.disciplines)) {
      return {
        title: data.title || 'Import Error',
        disciplines: [],
        count: 0,
        isValid: false
      }
    }

    // Validate each discipline
    const validDisciplines = data.disciplines.filter(
      (d) => d && typeof d.content === 'string' && d.content.trim().length > 0
    )

    return {
      title: data.title || 'Trading Disciplines',
      author: data.author,
      description: data.description,
      disciplines: validDisciplines,
      count: validDisciplines.length,
      isValid: validDisciplines.length > 0
    }
  } catch {
    return {
      title: 'Import Error',
      disciplines: [],
      count: 0,
      isValid: false
    }
  }
}

/**
 * Generate shareable URL with data encoded
 * Note: For large datasets, consider using server-side storage
 */
export function generateShareURL(data: DisciplineShareData, baseUrl: string = ''): string {
  const compressed = encodeShareData(data)

  if (baseUrl) {
    return `${trimTrailingSlash(baseUrl)}/discipline?import=${compressed}`
  }

  // For client-side routing
  const url = new URL(window.location.href)
  url.searchParams.set('import', compressed)
  url.hash = ''
  return url.toString()
}

/**
 * Generate a public share landing URL for social crawlers.
 */
export function generatePublicShareURL(data: DisciplineShareData, baseUrl: string = ''): string {
  const compressed = encodeShareData(data)

  if (baseUrl) {
    return `${trimTrailingSlash(baseUrl)}/discipline/share?import=${compressed}`
  }

  const url = new URL(window.location.href)
  url.pathname = '/discipline/share'
  url.search = ''
  url.searchParams.set('import', compressed)
  url.hash = ''
  return url.toString()
}

/**
 * Parse import data from URL
 */
export function parseImportFromURL(): DisciplineImportPreview | null {
  if (typeof window === 'undefined') return null

  const url = new URL(window.location.href)
  const importData = url.searchParams.get('import') || url.hash?.match(/import=([^&]+)/)?.[1]

  return parseImportParam(importData)
}

export function parseImportParam(importData?: string | null): DisciplineImportPreview | null {
  if (!importData) return null

  try {
    const json = decodeURIComponent(decodeBase64(importData))
    return parseShareData(json)
  } catch {
    return null
  }
}

export function buildDisciplineOgImageURL(
  preview: Pick<DisciplineImportPreview, 'title' | 'author' | 'count'> | null | undefined,
  baseUrl: string = ''
): string {
  const params = new URLSearchParams({
    title: preview?.title || '我的投資紀律',
    author: preview?.author || 'Anonymous',
    count: String(preview?.count || 0),
  })
  const path = `/api/og/discipline.svg?${params.toString()}`
  return baseUrl ? `${trimTrailingSlash(baseUrl)}${path}` : path
}

/**
 * Download share data as JSON file
 */
export function downloadShareFile(data: DisciplineShareData, filename?: string): void {
  const json = shareDataToJSON(data)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename || `trading-disciplines-${Date.now()}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Read JSON file and parse
 */
export async function readShareFile(file: File): Promise<DisciplineImportPreview> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const json = e.target?.result as string
        const preview = parseShareData(json)
        resolve(preview)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

/**
 * Generate social share text
 */
export function generateShareText(data: DisciplineShareData, platform: 'twitter' | 'facebook' | 'line' | 'generic'): string {
  const title = data.title || 'My Trading Disciplines'
  const count = data.count
  const description = data.description || ''

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const shareUrl = generatePublicShareURL(data, baseUrl)

  switch (platform) {
    case 'twitter':
      return `${title}\n\n${description ? description + '\n\n' : ''}${count} trading disciplines to share!\n\nCheck it out: ${shareUrl}`

    case 'facebook':
      return `${title}\n\n${description}\n\n${count} trading disciplines to share!`

    case 'line':
      return `${title}\n\n${description}${description ? '\n\n' : ''}${count} trading disciplines\n\n${shareUrl}`

    case 'generic':
    default:
      return `${title}\n\n${count} trading disciplines\n\n${shareUrl}`
  }
}

/**
 * Generate social share URL
 */
export function generateSocialShareURL(
  data: DisciplineShareData,
  platform: 'twitter' | 'facebook' | 'line' | 'whatsapp'
): string {
  const text = generateShareText(data, 'generic')
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const shareUrl = generatePublicShareURL(data, baseUrl)

  switch (platform) {
    case 'twitter':
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`

    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(text)}`

    case 'line':
      return `https://line.me/R/msg/text/?${encodeURIComponent(text + '\n' + shareUrl)}`

    case 'whatsapp':
      return `https://wa.me/?text=${encodeURIComponent(text + '\n' + shareUrl)}`

    default:
      return shareUrl
  }
}

function encodeShareData(data: DisciplineShareData): string {
  return encodeBase64(encodeURIComponent(shareDataToJSON(data)))
}

function encodeBase64(value: string): string {
  if (typeof btoa === 'function') return btoa(value)
  return Buffer.from(value, 'utf-8').toString('base64')
}

function decodeBase64(value: string): string {
  if (typeof atob === 'function') return atob(value)
  return Buffer.from(value, 'base64').toString('utf-8')
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}
