import { toUtcNoonDate } from '~/lib/diary-date'

export interface QuickNoteSubmitInput {
  title: string
  content: string
  date: string | Date
  tags?: string[]
}

function normalizeQuickNoteDate(date: string | Date): string {
  return toUtcNoonDate(date).toISOString()
}

export function useQuickNoteSubmit() {
  const submitQuickNote = async (input: QuickNoteSubmitInput) => {
    const body = {
      title: input.title,
      content: input.content,
      date: normalizeQuickNoteDate(input.date),
      tags: input.tags ?? [],
      appendToToday: true,
    }

    return await $fetch<{ id?: string | bigint | { toString: () => string } }>('/api/diaries', {
      method: 'POST',
      body,
    })
  }

  return {
    submitQuickNote,
  }
}
