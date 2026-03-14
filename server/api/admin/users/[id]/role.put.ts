import adminMiddleware from '~/server/middleware/admin'
import prisma from '~/lib/prisma'
import { z } from 'zod'
import { parsePositiveBigIntParam } from '~/server/utils/validation'

const updateRoleSchema = z.object({
  role: z.enum(['USER', 'ADMIN'])
})

export default defineEventHandler(async (event) => {
  await adminMiddleware(event)

  try {
    const userId = parsePositiveBigIntParam(event, 'id')

    const body = await readBody(event)
    const validatedData = updateRoleSchema.parse(body)

    // Prevent self-modification
    if (userId.toString() === event.context.user?.id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Cannot modify your own role'
      })
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
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

    console.log('[ADMIN] Update user role', {
      adminId: event.context.user?.id,
      targetUserId: userId.toString(),
      newRole: validatedData.role
    })

    return {
      success: true,
      data: updatedUser
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: error.issues[0]?.message ?? 'Invalid request'
      })
    }
    console.error('[ADMIN] Update user role error:', error)
    throw error
  }
})
