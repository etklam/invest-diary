import {
  nextTick,
  onBeforeUnmount,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue'

export const DIALOG_FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  'audio[controls]',
  'video[controls]',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
  'summary',
].join(', ')

type DialogFocusTarget = MaybeRefOrGetter<HTMLElement | null | undefined>

export interface UseDialogA11yOptions {
  open?: MaybeRefOrGetter<boolean>
  onEscape?: () => void
  disabled?: MaybeRefOrGetter<boolean>
  initialFocus?: DialogFocusTarget
  trapFocus?: boolean
  lockScroll?: boolean
  focusOnOpen?: boolean
  restoreFocus?: boolean
}

let scrollLockCount = 0
let previousDocumentOverflow: string | null = null

function acquireScrollLock() {
  if (typeof document === 'undefined') return

  if (scrollLockCount === 0) {
    previousDocumentOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
  }
  scrollLockCount += 1
}

function releaseScrollLock() {
  if (typeof document === 'undefined' || scrollLockCount === 0) return

  scrollLockCount -= 1
  if (scrollLockCount === 0) {
    document.documentElement.style.overflow = previousDocumentOverflow ?? ''
    previousDocumentOverflow = null
  }
}

function isFocusable(element: HTMLElement): boolean {
  if (element.hidden || element.getAttribute('aria-hidden') === 'true' || element.closest('[hidden], [aria-hidden="true"]')) {
    return false
  }
  if (element.classList.contains('hidden') || element.hasAttribute('inert')) return false

  if (typeof window !== 'undefined') {
    const style = window.getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden') return false
  }

  return true
}

function getFocusableElements(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(DIALOG_FOCUSABLE_SELECTOR))
    .filter(isFocusable)
}

export function useDialogA11y(
  dialogPanel: Ref<HTMLElement | null>,
  options: UseDialogA11yOptions = {},
) {
  const open = options.open ?? false
  let isOpen = false
  let ownsScrollLock = false
  let previousActiveElement: HTMLElement | null = null

  function focusInitialElement() {
    const target = options.initialFocus ? toValue(options.initialFocus) : dialogPanel.value
    ;(target ?? dialogPanel.value)?.focus()
  }

  function restoreFocus() {
    if (options.restoreFocus === false) return

    if (previousActiveElement?.isConnected) previousActiveElement.focus()
    previousActiveElement = null
  }

  function openDialog() {
    if (isOpen) return
    isOpen = true
    previousActiveElement = typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null

    if (options.lockScroll !== false) {
      acquireScrollLock()
      ownsScrollLock = true
    }

    if (options.focusOnOpen !== false) {
      void nextTick(focusInitialElement)
    }
  }

  function closeDialog() {
    if (!isOpen) return
    isOpen = false

    if (ownsScrollLock) {
      releaseScrollLock()
      ownsScrollLock = false
    }
    restoreFocus()
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented) return

    if (event.key === 'Escape') {
      event.preventDefault()
      if (!toValue(options.disabled ?? false)) options.onEscape?.()
      return
    }

    if (event.key !== 'Tab' || options.trapFocus === false || !isOpen) return

    const panel = dialogPanel.value
    if (!panel) return

    const focusable = getFocusableElements(panel)
    if (!focusable.length) {
      event.preventDefault()
      panel.focus()
      return
    }

    const first = focusable[0]!
    const last = focusable[focusable.length - 1]!
    const activeElement = document.activeElement

    if (event.shiftKey && (activeElement === first || activeElement === panel)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  watch(
    () => Boolean(toValue(open)),
    (visible) => {
      if (visible) openDialog()
      else closeDialog()
    },
    { immediate: true, flush: 'post' },
  )

  onBeforeUnmount(closeDialog)

  return {
    handleKeydown,
  }
}
