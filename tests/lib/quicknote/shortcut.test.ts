import { describe, expect, it } from 'vitest'
import { isQuickDiaryShortcut } from '~/lib/quicknote/shortcut'

const keyboardEvent = (overrides: KeyboardEventInit = {}, target?: HTMLElement) => {
  const event = new KeyboardEvent('keydown', { key: 'j', ctrlKey: true, cancelable: true, ...overrides })
  if (target) Object.defineProperty(event, 'target', { value: target })
  return event
}

describe('Quick Diary keyboard shortcut', () => {
  it('accepts Ctrl+J and Cmd+J', () => {
    expect(isQuickDiaryShortcut(keyboardEvent())).toBe(true)
    expect(isQuickDiaryShortcut(keyboardEvent({ ctrlKey: false, metaKey: true }))).toBe(true)
  })

  it.each(['input', 'textarea', 'select'])('does not fire from <%s>', (tag) => {
    expect(isQuickDiaryShortcut(keyboardEvent({}, document.createElement(tag)))).toBe(false)
  })

  it('does not fire from contenteditable or textbox descendants', () => {
    const editable = document.createElement('div')
    editable.contentEditable = 'true'
    const textbox = document.createElement('div')
    textbox.setAttribute('role', 'textbox')
    const child = document.createElement('span')
    textbox.append(child)

    expect(isQuickDiaryShortcut(keyboardEvent({}, editable))).toBe(false)
    expect(isQuickDiaryShortcut(keyboardEvent({}, child))).toBe(false)
  })

  it('rejects conflicting modifiers, composition, handled events, and other keys', () => {
    expect(isQuickDiaryShortcut(keyboardEvent({ shiftKey: true }))).toBe(false)
    expect(isQuickDiaryShortcut(keyboardEvent({ altKey: true }))).toBe(false)
    expect(isQuickDiaryShortcut(keyboardEvent({ key: 'k' }))).toBe(false)

    const composing = keyboardEvent()
    Object.defineProperty(composing, 'isComposing', { value: true })
    expect(isQuickDiaryShortcut(composing)).toBe(false)

    const handled = keyboardEvent()
    handled.preventDefault()
    expect(isQuickDiaryShortcut(handled)).toBe(false)
  })
})
