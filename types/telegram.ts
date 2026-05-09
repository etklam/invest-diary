export interface TelegramFrom {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
}

export interface TelegramChat {
  id: number
  type: 'private' | 'group' | 'supergroup' | 'channel'
}

export interface TelegramMessage {
  message_id: number
  from?: TelegramFrom
  chat: TelegramChat
  text?: string
  date: number
}

export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
}

export interface BuySellResult {
  command: 'buy' | 'sell'
  quantity: number
  symbol: string
  price: number
}

export interface NoteResult {
  command: 'note'
  content: string
}

export type ParseResult = BuySellResult | NoteResult | null

export interface ConversationSession {
  step: string
  data: Record<string, unknown>
}
