import { useEventListener } from '@vueuse/core'

/** Calls handler on Escape while active() — for modal/bottom-sheet close. */
export function useEscapeKey(handler: () => void, active: () => boolean) {
  if (typeof window === 'undefined') return

  useEventListener(window, 'keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && active()) handler()
  })
}
