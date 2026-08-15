import { describe, expect, it } from 'vitest'
import {
  createQuickNoteModalTemplates,
  resolveQuickNoteSaveErrorMessage,
  resolveQuickNoteSaveErrorToast,
} from '~/lib/quicknote/modal-shell'

describe('quicknote modal shell helpers', () => {
  const messages: Record<string, string> = {
    'quickDiary.fillRequired': '請填寫必要資訊',
    'quickDiary.templates.blank': '自由編輯',
    'quickDiary.templates.blankDesc': '不套模板，直接記下當下的判斷與提醒',
    'quickDiary.templates.trading': '交易日記',
    'quickDiary.templates.tradingDesc': '記錄買入/賣出操作',
    'quickDiary.templates.reflection': '盤後反思',
    'quickDiary.templates.reflectionDesc': '收盤後的總結反思',
    'quickDiary.templates.observation': '市場觀察',
    'quickDiary.templates.observationDesc': '記錄市場熱點觀察',
    'quickDiary.errors.diaryExists': '該日期已有日記，若只是補一段內容，請切到「追加到當日」。',
    'quickDiary.errors.createFailedPrefix': '建立失敗：',
  }
  const t = (key: string) => messages[key] || key

  it('creates the quicknote template card catalog in stable order', () => {
    const templates = createQuickNoteModalTemplates(t)

    expect(templates.map(template => template.kind)).toEqual([
      'blank',
      'trading',
      'reflection',
      'observation',
    ])
    expect(templates[0]).toMatchObject({
      label: '自由編輯',
      icon: 'heroicons:pencil-square-solid',
    })
    expect(templates[1]).toMatchObject({
      label: '交易日記',
      icon: 'heroicons:currency-dollar-solid',
    })
  })

  it('maps required-field save errors to the shared localized message', () => {
    expect(resolveQuickNoteSaveErrorMessage({ message: 'CONTENT_REQUIRED' }, t))
      .toBe('請填寫必要資訊')
    expect(resolveQuickNoteSaveErrorMessage({ message: 'TITLE_REQUIRED' }, t))
      .toBe('請填寫必要資訊')
    expect(resolveQuickNoteSaveErrorMessage({ message: 'Oops', data: { statusMessage: 'Server bad' } }, t))
      .toBe('建立失敗：Server bad')
  })

  it('keeps save-error messages shared while allowing the entry point to choose severity', () => {
    const error = { message: 'CONTENT_REQUIRED' }

    expect(resolveQuickNoteSaveErrorToast(error, t, 'error')).toEqual({
      message: '請填寫必要資訊',
      severity: 'error',
    })
    expect(resolveQuickNoteSaveErrorToast(error, t, 'warning')).toEqual({
      message: '請填寫必要資訊',
      severity: 'warning',
    })
  })
})
