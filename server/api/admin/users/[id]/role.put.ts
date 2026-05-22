import adminMiddleware from '~/server/middleware/admin'
import { z } from 'zod'
import prisma from '~/lib/prisma'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'

const updateRoleSchema = z.object({
  role: z.enum(['USER', 'ADMIN'])
})

export default defineEventHandler(async (event) => {
  const log = logger.admin.withRequestId(event.context.requestId)
  await adminMiddleware(event)

  try {
    const userId = parsePositiveBigIntParam(event, 'id')

    const body = await readBody(event)
    const validatedData = updateRoleSchema.parse(body)

    // Prevent self-modification
    if (userId.toString() === event.context.user?.id) {
      throw Errors.accountSelfModification('modify your own role').toH3Error()
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      throw Errors.userNotFound().toH3Error()
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: validatedData.role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    })

    log.info('Updated user role', {
      adminId: event.context.user?.id,
      targetUserId: userId.toString(),
      newRole: validatedData.role
    })

    return serialize({
      success: true,
      data: updatedUser
    })
  } catch (error) {
    handleApiError(error, log)
  }
})
