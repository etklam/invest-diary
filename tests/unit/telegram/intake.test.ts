import { describe, expect, it } from 'vitest'
import { classifyTelegramUpdate } from '~/lib/telegram/intake'

function makeMessageUpdate(text: string) {
  return {
    update_id: 101,
    message: {
      from: { id: 123456 },
      chat: { id: 123456, type: 'private' },
      text,
    },
  }
}

describe('classifyTelegramUpdate', () => {
  it('does not classify linked utility commands as diary writes', () => {
    expect(classifyTelegramUpdate(makeMessageUpdate('/help'))).toEqual({
      kind: 'message',
      action: 'command',
      telegramId: 123456,
    })
  })

  it.each(['/buy', '/sell 2 AAPL@100', '/note@trade_bot memo'])(
    'classifies %s as a diary write',
    (text) => {
      expect(classifyTelegramUpdate(makeMessageUpdate(text))).toEqual({
        kind: 'message',
        action: 'diary_write',
        telegramId: 123456,
      })
    }
  )

  it('classifies non-message updates as unsupported', () => {
    expect(classifyTelegramUpdate({ update_id: 102, callback_query: { id: 'callback-1' } } as any))
      .toEqual({ kind: 'unsupported' })
  })
})
