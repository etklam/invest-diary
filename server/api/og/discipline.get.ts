import { z } from 'zod'
import { createCanvas } from 'canvas'
import { logger } from '~/lib/logger'

const querySchema = z.object({
  title: z.string().optional(),
  author: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)
  const { title, author } = querySchema.parse(getQuery(event))

  // Mobile-friendly size: 1080x1350 (4:5)
  const width = 1080
  const height = 1350

  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, width, height)

  // Title
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 72px system-ui'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  const text = title || '我的投資紀律'
  wrapText(ctx, text, width / 2, 200, 900, 90)

  // Author
  if (author) {
    ctx.font = '48px system-ui'
    ctx.fillStyle = '#94a3b8'
    ctx.fillText(`by ${author}`, width / 2, height - 240)
  }

  ctx.font = '42px system-ui'
  ctx.fillStyle = '#38bdf8'
  ctx.fillText('投資日記 · Discipline', width / 2, height - 160)

  setHeader(event, 'Content-Type', 'image/png')
  return canvas.toBuffer('image/png')
})

function wrapText(
  ctx: any,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ')
  let line = ''

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' '
    const metrics = ctx.measureText(testLine)
    const testWidth = metrics.width
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y)
      line = words[n] + ' '
      y += lineHeight
    } else {
      line = testLine
    }
  }
  ctx.fillText(line, x, y)
}
