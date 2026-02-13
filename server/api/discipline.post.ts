import { defineEventHandler, readBody, createError } from 'h3'
import prisma from '~/lib/prisma'
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireUser(event)
    const body = await readBody<{ content?: string }>(event)

    if (!body?.content || !body.content.trim()) {
      throw createError({ statusCode: 400, statusMessage: 'Content is required' })
    }

    const discipline = await prisma.discipline.create({
      data: {
        content: body.content.trim(),
        userId: user.id,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
      },
    })

    return discipline
  } catch (err: any) {
    console.error('[discipline.post] error', {
      message: err?.message,
      code: err?.code,
    })
    throw createError({
      statusCode: 500,
      statusMessage: 'Discipline create failed'
    })
  }
})