import prisma from '~/lib/prisma'
import { Errors } from '~/lib/errors/factory'
import { getLatestBreadthSnapshot, getRegimeGuidance } from '~/server/utils/market-state-queries'

export default defineEventHandler(async () => {
  const snapshot = await getLatestBreadthSnapshot(prisma)

  if (!snapshot) {
    throw Errors.notFound('Market state snapshot not found').toH3Error()
  }

  const { regime, ...rest } = snapshot

  return {
    ...rest,
    marketState: regime,
    ...getRegimeGuidance(regime),
  }
})
