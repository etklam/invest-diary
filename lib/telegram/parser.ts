import type { ParseResult, BuySellResult, NoteResult } from '~/types/telegram'

/**
 * One-liner parser for Telegram bot commands.
 * Returns parsed result for valid one-liners, or null to trigger multi-step conversation.
 */

// /buy <quantity> <symbol@price>  OR  /sell <quantity> <symbol@price>
const BUY_SELL_RE = /^\/(?<cmd>buy|sell)\s+(?<qty>\d+(?:\.\d+)?)\s+(?<sym>[A-Za-z0-9.]+)@(?<price>\d+(?:\.\d+)?)\s*$/

// /note <content>
const NOTE_RE = /^\/note\s+(?<content>.+)$/s

export function parseOneLiner(text: string): ParseResult {
  const trimmed = text.trim()

  // Try buy/sell pattern first
  const buySellMatch = trimmed.match(BUY_SELL_RE)
  if (buySellMatch?.groups) {
    const cmd = buySellMatch.groups['cmd']
    const qty = buySellMatch.groups['qty']
    const sym = buySellMatch.groups['sym']
    const price = buySellMatch.groups['price']
    if (!cmd || !qty || !sym || !price) return null
    const result: BuySellResult = {
      command: cmd as 'buy' | 'sell',
      quantity: parseFloat(qty),
      symbol: sym.toUpperCase(),
      price: parseFloat(price),
    }
    return result
  }

  // Try note pattern
  const noteMatch = trimmed.match(NOTE_RE)
  if (noteMatch?.groups) {
    const content = noteMatch.groups['content']
    if (!content) return null
    const trimmedContent = content.trim()
    if (!trimmedContent) return null
    const result: NoteResult = {
      command: 'note',
      content: trimmedContent,
    }
    return result
  }

  // No match — trigger conversation
  return null
}

/**
 * Validate a one-liner parse result. Returns null if valid, or an i18n error key.
 */
export function validateParseResult(result: ParseResult): string | null {
  if (!result) return null

  if (result.command === 'buy' || result.command === 'sell') {
    if (isNaN(result.quantity) || result.quantity <= 0) return 'errors.invalidQuantity'
    if (isNaN(result.price) || result.price <= 0) return 'errors.invalidPrice'
    if (!result.symbol || result.symbol.length === 0) return 'errors.invalidSymbol'
    return null
  }

  if (result.command === 'note') {
    if (!result.content || result.content.length === 0) return null // triggers conversation
    return null
  }

  return null
}
