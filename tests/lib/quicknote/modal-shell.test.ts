import { describe, expect, it } from 'vitest'
import { createQuickNoteModalTemplates, resolveQuickNoteSaveErrorMessage } from '~/lib/quicknote/modal-shell'

describe('quicknote modal shell helpers', () => {
  const t = (key: string) => key

  it('creates the quicknote template card catalog in stable order', () => {
    const templates = createQuickNoteModalTemplates(t)

    expect(templates.map(template => template.kind)).toEqual([
      'trading',
      'reflection',
      'observation',
    ])
    expect(templates[0]).toMatchObject({
      label: 'quickDiary.templates.trading',
      icon: 'heroicons:currency-dollar-solid',
    })
  })

  it('maps required-field save errors to the shared localized message', () => {
    expect(resolveQuickNoteSaveErrorMessage({ message: 'CONTENT_REQUIRED' }, t))
      .toBe('quickDiary.fillRequired')
    expect(resolveQuickNoteSaveErrorMessage({ message: 'TITLE_REQUIRED' }, t))
      .toBe('quickDiary.fillRequired')
    expect(resolveQuickNoteSaveErrorMessage({ message: 'Oops', data: { statusMessage: 'Server bad' } }, t))
      .toBe('建立失敗：Server bad')
  })
})
