import { defineEventHandler } from 'h3'
import { requireUser } from '~/server/utils/auth'
import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'
import { getRandomDiscipline } from '~/server/utils/discipline-queries'

// Default trading discipline quotes when user hasn't added any
const defaultDisciplines = [
  '寫日記是提升交易心態的最好方法',
  '明天又是新的一天，持續寫日記吧',
  '明天見'
]

export default defineEventHandler(async (event) => {
  const log = logger.discipline.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)

    const selected = await getRandomDiscipline(BigInt(user.id))

    if (selected) {
      return {
        content: selected.content,
        isCustom: true,
      }
    }

    // Fallback to random default quote
    const randomIndex = Math.floor(Math.random() * defaultDisciplines.length)
    return {
      content: defaultDisciplines[randomIndex] ?? defaultDisciplines[0],
      isCustom: false,
    }
  } catch (error) {
    handleApiError(error, log)
  }
})
