import prisma from '~/lib/prisma'
import { getBreadthHistory } from '~/server/utils/market-state-queries'

const DEFAULT_DAYS = 120
const MAX_DAYS = 365

function parseDays(value: unknown): number {
  const parsed = Number(value ?? DEFAULT_DAYS)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_DAYS
  }

  return Math.min(Math.floor(parsed), MAX_DAYS)
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event) || {}
  const days = parseDays(query.days)
  const history = await getBreadthHistory(prisma, days)

  return history.map(({ regime, ...row }) => ({
    ...row,
    marketState: regime,
  }))
})
