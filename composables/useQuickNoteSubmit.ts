import { toUtcNoonDate } from '~/lib/diary-date'
import type { QuickNoteSaveMode } from '~/types/quicknote'

export interface QuickNoteSubmitInput {
  saveMode: QuickNoteSaveMode
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
      ...(input.saveMode === 'append' ? { appendToToday: true } : {}),
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
