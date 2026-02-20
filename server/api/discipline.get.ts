import { defineEventHandler } from 'h3'
import prisma from '~/lib/prisma'
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
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