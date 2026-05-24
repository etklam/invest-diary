import { z } from 'zod'

const querySchema = z.object({
  title: z.string().optional(),
  author: z.string().optional(),
  count: z.string().optional(),
})

export default defineEventHandler((event) => {
  const query = querySchema.parse(getQuery(event))
  const title = escapeSvgText(limitText(query.title || '我的投資紀律', 80))
  const author = escapeSvgText(limitText(query.author || 'Anonymous', 40))
  const count = escapeSvgText(limitText(query.count || '0', 8))

  setHeader(event, 'Content-Type', 'image/svg+xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${title}">
  <rect width="1200" height="630" fill="#0f172a"/>
  <rect x="60" y="60" width="1080" height="510" rx="28" fill="#111827" stroke="#38bdf8" stroke-opacity="0.35" stroke-width="2"/>
  <text x="120" y="150" fill="#38bdf8" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700">投資日記 · Discipline</text>
  <text x="120" y="285" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="800">${title}</text>
  <text x="120" y="380" fill="#cbd5e1" font-family="Arial, Helvetica, sans-serif" font-size="36">by ${author}</text>
  <text x="120" y="465" fill="#94a3b8" font-family="Arial, Helvetica, sans-serif" font-size="32">${count} disciplines</text>
</svg>`
})

function limitText(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength)
}

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
