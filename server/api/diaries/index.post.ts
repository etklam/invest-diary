import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import { Errors, AppError } from '~/lib/errors/factory'

export default defineEventHandler(async (event) => {
  const log = logger.diary.withRequestId(event.context.requestId)
  const userId = event.context.user?.id

  if (!userId) {
    throw Errors.unauthorized().toH3Error()
  }

  const body = await readBody(event)
  const { title, content, date, appendToToday } = body

  if (!title || !content) {
    throw Errors.validationError([
      { field: 'title', message: 'Title is required' },
      { field: 'content', message: 'Content is required' },
    ]).toH3Error()
  }

  try {
    // If appendToToday is true, check if a diary already exists for the provided date
    if (appendToToday) {
      // Use provided date or fall back to current date
      const targetDate = date ? new Date(date) : new Date()

      const startOfDay = new Date(targetDate)
      startOfDay.setHours(0, 0, 0, 0)

      const endOfDay = new Date(targetDate)
      endOfDay.setHours(23, 59, 59, 999)

      const existingDiary = await prisma.diary.findFirst({
        where: {
          userId: userId,
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      })

      if (existingDiary) {
        // Append new content to existing diary
        const separator = '\n\n---\n\n'
        const updatedContent = existingDiary.content + separator + content

        const updatedDiary = await prisma.diary.update({
          where: {
            id: existingDiary.id,
          },
          data: {
            content: updatedContent,
          },
        })

        log.info('Diary content appended', { diaryId: existingDiary.id.toString(), userId })
        return updatedDiary
      }
    }

    // Create new diary
    const diary = await prisma.diary.create({
      data: {
        userId: userId,
        title: title,
        content: content,
        date: date ? new Date(date) : new Date(),
      },
    })

    log.info('New diary created', { diaryId: diary.id.toString(), userId })
    return diary
  } catch (error) {
    if (error instanceof AppError) {
      log.warn(error.message, { code: error.code })
      throw error.toH3Error()
    }
    log.error('Failed to create or append diary', { error: String(error) })
    throw Errors.internalError(error).toH3Error()
  }
})
