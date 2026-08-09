const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

export const isEditableShortcutTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable
    || EDITABLE_TAGS.has(target.tagName)
    || Boolean(target.closest('[contenteditable="true"], [role="textbox"]'))
}

export const isQuickDiaryShortcut = (event: KeyboardEvent) => {
  if (event.defaultPrevented || event.isComposing || event.altKey || event.shiftKey) return false
  if (isEditableShortcutTarget(event.target)) return false
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'j'
}
