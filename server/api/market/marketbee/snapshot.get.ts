import prisma from '~/lib/prisma'
import { Errors } from '~/lib/errors/factory'
import { getLatestBreadthSnapshot, getRegimeGuidance } from '~/server/utils/marketbee-queries'

export default defineEventHandler(async () => {
  const snapshot = await getLatestBreadthSnapshot(prisma)

  if (!snapshot) {
    throw Errors.notFound('Marketbee snapshot not found').toH3Error()
  }

  return {
    ...snapshot,
    ...getRegimeGuidance(snapshot.regime),
  }
})
