import prisma from '~/lib/prisma'
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const auth = requireUser(event)

  const user = await prisma.user.findUnique({
    where: { id: BigInt(auth.id) }
  })

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'USER_NOT_FOUND' })
  }

  return {
    ok: true,
    data: user
  }
})
