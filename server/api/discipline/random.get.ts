import { defineEventHandler } from 'h3'
import prisma from '~/lib/prisma'
import { requireUser } from '~/server/utils/auth'
import { logger } from '~/lib/logger'

// Default trading discipline quotes when user hasn't added any
const defaultDisciplines = [
  '寫日記是提升交易心態的最好方法',
  '明天又是新的一天，持續寫日記吧',
  '明天見'
]

export default defineEventHandler(async (event) => {
  const log = logger.discipline.withRequestId(event.context.requestId)
  const user = await requireUser(event)

  // @ts-ignore prisma client type may be stale
  const disciplines = await prisma.discipline.findMany({
    where: { userId: user.id },
    select: {
      content: true,
    },
  })

  // If user has disciplines, return random one
  if (disciplines.length > 0) {
    const randomIndex = Math.floor(Math.random() * disciplines.length)
    const selected = disciplines[randomIndex]
    return {
      content: selected?.content ?? defaultDisciplines[0],
      isCustom: true,
    }
  }

  // Otherwise return random default quote
  const randomIndex = Math.floor(Math.random() * defaultDisciplines.length)
  return {
    content: defaultDisciplines[randomIndex] ?? defaultDisciplines[0],
    isCustom: false,
  }
})
