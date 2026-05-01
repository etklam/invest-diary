export function normalizeStockSymbol(input: string): string {
  return input.toUpperCase().replace(/\.TW$/i, '.TW').replace(/\s+/g, ' ').trim()
}
