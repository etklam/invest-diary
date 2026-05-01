import { defineEventHandler } from 'h3'
import prisma from '~/lib/prisma'
import { requireUser } from '~/server/utils/auth'
import { logger } from '~/lib/logger'

export default defineEventHandler(async (event) => {
  const log = logger.discipline.withRequestId(event.context.requestId)
  const user = await requireUser(event)

  // @ts-ignore prisma client type may be stale
  const disciplines = await prisma.discipline.findMany({
    where: { userId: user.id },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      content: true,
      order: true,
      createdAt: true,
    },
  })

  return disciplines
})