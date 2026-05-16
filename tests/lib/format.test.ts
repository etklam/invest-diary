import { describe, it, expect } from 'vitest'
import { formatCurrency, formatNumber, formatPercent } from '~/lib/format'

describe('formatCurrency', () => {
  it('should format with default 2 decimals and zh-TW locale', () => {
    const result = formatCurrency(1234.56)
    expect(result).toMatch(/\$1,234\.56/)
  })

  it('should format zero with 2 decimals', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0.00')
  })

  it('should format negative numbers', () => {
    const result = formatCurrency(-100)
    expect(result).toContain('-')
  })

  it('should format large numbers with grouping', () => {
    const result = formatCurrency(1000000)
    expect(result).toContain(',')
  })

  it('should round to 2 decimals by default', () => {
    const result = formatCurrency(1234.567)
    expect(result).toMatch(/\d{1,3}(,\d{3})*(\.\d{2})/)
  })

  it('should format very small amounts', () => {
    const result = formatCurrency(0.01)
    expect(result).toContain('0.01')
  })

  it('should format negative decimals', () => {
    const result = formatCurrency(-1234.56)
    expect(result).toContain('-')
    expect(result).toContain('1,234.56')
  })

  // ── 0-decimal mode (positionSizing / financialFreedom 原始行為) ──

  it('should format with 0 decimals when specified', () => {
    const result = formatCurrency(1234.56, { decimals: 0 })
    expect(result).toBe('$1,235')
  })

  it('should format 0-decimal with en locale', () => {
    const result = formatCurrency(1234567, { decimals: 0, locale: 'en' })
    expect(result).toBe('$1,234,567')
  })

  it('should resolve "en" shorthand to "en-US"', () => {
    const result = formatCurrency(1000, { decimals: 0, locale: 'en' })
    expect(result).toBe('$1,000')
  })

  it('should pass through full BCP 47 locale', () => {
    const result = formatCurrency(1000, { decimals: 0, locale: 'en-US' })
    expect(result).toBe('$1,000')
  })
})

describe('formatNumber', () => {
  it('should format with default zh-TW locale', () => {
    const result = formatNumber(1234567)
    expect(result).toContain('1,234,567')
  })

  it('should format with custom locale', () => {
    const result = formatNumber(1234567, 'en-US')
    expect(result).toContain('1,234,567')
  })

  it('should resolve "en" shorthand', () => {
    const result = formatNumber(1000, 'en')
    expect(result).toContain('1,000')
  })

  it('should handle zero', () => {
    const result = formatNumber(0)
    expect(result).toBe('0')
  })

  it('should handle negative', () => {
    const result = formatNumber(-1000)
    expect(result).toContain('-')
    expect(result).toContain('1,000')
  })
})

describe('formatPercent', () => {
  it('should format with default 1 decimal', () => {
    expect(formatPercent(12.5)).toBe('12.5%')
  })

  it('should format with custom decimals', () => {
    expect(formatPercent(12.567, 2)).toBe('12.57%')
  })

  it('should format with 0 decimals', () => {
    expect(formatPercent(12.5, 0)).toBe('13%')
  })

  it('should handle zero', () => {
    expect(formatPercent(0, 1)).toBe('0.0%')
  })

  it('should handle negative', () => {
    expect(formatPercent(-5.5, 1)).toBe('-5.5%')
  })
})
