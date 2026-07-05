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

/**
 * 格式化帶正負號的百分比（正數前綴 `+`）
 *
 * 收斂原本散落在 `utils/stockSeasonality.formatReturn`、
 * `pages/tools/relative-value.vue`、`components/PortfolioExposurePanel.vue`、
 * `pages/tools/financial-freedom.vue` 的 ad-hoc `${v >= 0 ? '+' : ''}${v.toFixed(n)}%`。
 *
 * @param value - 數值
 * @param decimals - 小數位數（預設：2，與季節性 formatReturn 原始行為一致）
 *
 * @example
 *   formatSignedPercent(1.07)     // → "+1.07%"
 *   formatSignedPercent(-0.72)    // → "-0.72%"
 *   formatSignedPercent(0)        // → "+0.00%"
 *   formatSignedPercent(12.5, 1)  // → "+12.5%"
 */
export function formatSignedPercent(value: number, decimals: number = 2): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

/**
 * 格式化貨幣為精簡表示（$1.2M / $1.2百萬 / $3.5K / $3.5千）
 *
 * 收斂 `pages/tools/financial-freedom.vue` 原 `formatCompactValue` 的 locale-aware
 * 縮放邏輯。中文 locale 使用「百萬 / 萬 / 千」，英文 locale 使用「M / K」。
 *
 * @param value - 數值
 * @param locale - BCP 47 locale 或簡寫（'en' / 'zh' / 預設 'zh-TW'）
 *
 * @example
 *   formatCompactCurrency(1_234_567)               // → "$1.23百萬"（zh-TW）
 *   formatCompactCurrency(1_234_567, 'en')         // → "$1.23M"
 *   formatCompactCurrency(50000, 'zh-TW')          // → "$5.00萬"
 *   formatCompactCurrency(50000, 'en')             // → "$50.0K"
 *   formatCompactCurrency(123, 'zh-TW')            // → "$123"
 */
export function formatCompactCurrency(value: number, locale: string = 'zh-TW'): string {
  const abs = Math.abs(value)
  const resolvedLocale = resolveLocale(locale)
  const isEnglish = resolvedLocale.startsWith('en')

  const formatScaled = (scaled: number): string => {
    const digits = Math.abs(scaled) >= 100 ? 0 : 1
    return new Intl.NumberFormat(resolvedLocale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    }).format(scaled)
  }

  const formatPlain = (): string =>
    new Intl.NumberFormat(resolvedLocale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)

  if (isEnglish) {
    if (abs >= 1_000_000) return `$${formatScaled(value / 1_000_000)}M`
    if (abs >= 1_000) return `$${formatScaled(value / 1_000)}K`
    return `$${formatPlain()}`
  }

  if (abs >= 1_000_000) return `$${formatScaled(value / 1_000_000)}百萬`
  if (abs >= 10_000) return `$${formatScaled(value / 10_000)}萬`
  if (abs >= 1_000) return `$${formatScaled(value / 1_000)}千`
  return `$${formatPlain()}`
}
