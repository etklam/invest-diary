import { readonly, watch } from 'vue'
import type { QuickNoteSaveMode } from '~/types/quicknote'

export interface DiaryMutationPayload {
  id: string
  date: string
  mode: QuickNoteSaveMode
}

/**
 * Lightweight diary mutation bus shared across pages.
 * Floating / modal quick-diary saves can notify Diaries, Calendar, Timeline
 * without a full page reload or a heavyweight state library.
 */
export function useDiaryMutation() {
  const lastMutation = useState<DiaryMutationPayload | null>('diary-last-mutation', () => null)
  const version = useState<number>('diary-mutation-version', () => 0)

  function notifyDiaryCreated(payload: DiaryMutationPayload) {
    lastMutation.value = {
      id: String(payload.id),
      date: payload.date,
      mode: payload.mode,
    }
    version.value += 1
  }

  function onDiaryMutation(handler: (payload: DiaryMutationPayload) => void) {
    return watch(version, () => {
      if (lastMutation.value) {
        handler(lastMutation.value)
      }
    })
  }

  return {
    lastMutation: readonly(lastMutation),
    version: readonly(version),
    notifyDiaryCreated,
    onDiaryMutation,
  }
}
