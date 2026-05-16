/**
 * lib/format.ts
 * 集中式數字與貨幣格式化函數
 *
 * 將原本分散在 lib/utils.ts、lib/positionSizing.ts、
 * lib/financialFreedom.ts 的數字格式化邏輯統一到此處。
 */

/**
 * 將簡寫 locale 對應為完整 BCP 47 tag
 */
function resolveLocale(locale: string): string {
  if (locale === 'en') return 'en-US'
  if (locale === 'zh') return 'zh-TW'
  return locale
}

/**
 * 格式化金額（帶 $ 前綴）
 *
 * @param amount - 數值
 * @param options.decimals - 小數位數（預設：2，與 lib/utils.ts 原始行為一致）
 * @param options.locale - BCP 47 locale（預設：'zh-TW'）
 *
 * @example
 *   formatCurrency(1234.56)                    // → "$1,234.56"
 *   formatCurrency(1234.56, { decimals: 0 })   // → "$1,235"
 *   formatCurrency(1234, { locale: 'en-US' })  // → "$1,234.00"
 */
export function formatCurrency(
  amount: number,
  options?: { decimals?: number; locale?: string },
): string {
  const { decimals = 2, locale = 'zh-TW' } = options ?? {}
  const resolvedLocale = resolveLocale(locale)
  return (
    '$' +
    new Intl.NumberFormat(resolvedLocale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount)
  )
}

/**
 * 格式化數字（帶千分位）
 *
 * @param value - 數值
 * @param locale - BCP 47 locale（預設：'zh-TW'）
 *
 * @example
 *   formatNumber(1234567)           // → "1,234,567"
 *   formatNumber(1234567, 'en-US')  // → "1,234,567"
 */
export function formatNumber(value: number, locale: string = 'zh-TW'): string {
  const resolvedLocale = resolveLocale(locale)
  return new Intl.NumberFormat(resolvedLocale).format(value)
}

/**
 * 格式化百分比
 *
 * @param value - 數值
 * @param decimals - 小數位數（預設：1）
 *
 * @example
 *   formatPercent(12.5)       // → "12.5%"
 *   formatPercent(12.5, 2)    // → "12.50%"
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}
