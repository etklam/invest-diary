import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.id

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const body = await readBody(event)
  const { title, content, date, appendToToday } = body

  if (!title || !content) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Title and content are required',
    })
  }

  try {
    // If appendToToday is true, check if a diary already exists for today
    if (appendToToday) {
      const today = new Date()
      const startOfDay = new Date(today)
      startOfDay.setHours(0, 0, 0, 0)

      const endOfDay = new Date(today)
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

        console.log('[API] Diary content appended:', existingDiary.id, 'for user:', userId)
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

    console.log('[API] New diary created:', diary.id, 'for user:', userId)
    return diary
  } catch (error) {
    console.error('Error creating/updating diary:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create diary',
    })
  }
})
