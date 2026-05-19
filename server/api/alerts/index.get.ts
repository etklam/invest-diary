import { handleApiError } from '~/server/utils/error-handler'
import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const log = logger.alert.withRequestId(event.context.requestId)
  const user = requireUser(event)

  try {
    const alerts = await prisma.alert.findMany({
      where: {
        diary: {
          userId: user.id
        },
        isDismissed: false
      },
      include: {
        diary: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        triggerAt: 'asc'
      }
    })

    return alerts
  } catch (error) {
    handleApiError(error, log)
  }
})
