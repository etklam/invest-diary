export type TelegramUpdateAction = 'command' | 'diary_write' | 'message'

export type TelegramUpdateClassification =
  | {
      kind: 'message'
      action: TelegramUpdateAction
      telegramId: number
    }
  | {
      kind: 'unsupported'
    }

interface TelegramUpdate {
  message?: {
    from?: {
      id?: number
    }
    text?: string
  }
}

const DIARY_WRITE_COMMAND_RE = /^\/(?:buy|sell|note)(?:@\w+)?(?:\s|$)/

export function classifyTelegramUpdate(update: TelegramUpdate): TelegramUpdateClassification {
  const telegramId = update.message?.from?.id
  if (!telegramId) {
    return { kind: 'unsupported' }
  }

  const text = update.message?.text?.trim() ?? ''
  return {
    kind: 'message',
    action: DIARY_WRITE_COMMAND_RE.test(text)
      ? 'diary_write'
      : text.startsWith('/')
        ? 'command'
        : 'message',
    telegramId,
  }
}
