import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ErrorCodes } from '~/lib/errors/codes'
import { errorCodeToI18nKey } from '~/lib/errors/i18n-mapping'

// ponytail: locale parity is the cheapest invariant that catches key drift.
// Two assertions: identical key trees across en/zh-TW/zh-CN, and every
// ErrorCode maps to an existing error.code.* key in all three locales.

const localesDir = resolve(process.cwd(), 'i18n/locales')

function loadLocale(locale: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(resolve(localesDir, `${locale}.json`), 'utf8'),
  )
}

function collectKeys(node: unknown, prefix = '', out: string[] = []): string[] {
  if (node === null || typeof node !== 'object') return out
  if (Array.isArray(node)) {
    // Arrays are leaf values in this repo's locale files; do not recurse.
    out.push(prefix)
    return out
  }
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k
    collectKeys(v, path, out)
  }
  return out
}

function dig(obj: Record<string, unknown>, dotted: string): unknown {
  return dotted.split('.').reduce<unknown>((acc, key) => {
    if (acc !== null && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

const LOCALES = ['en', 'zh-TW', 'zh-CN'] as const

describe('i18n key parity across locales', () => {
  it('en, zh-TW, zh-CN share the same key tree (no missing, no extra)', () => {
    const enKeys = new Set(collectKeys(loadLocale('en')))
    for (const locale of LOCALES) {
      const keys = new Set(collectKeys(loadLocale(locale)))
      const missing = [...enKeys].filter((k) => !keys.has(k))
      const extra = [...keys].filter((k) => !enKeys.has(k))
      expect(
        { locale, missing, extra },
        `locale ${locale} drifted from en — missing: ${missing.join(', ')}; extra: ${extra.join(', ')}`,
      ).toEqual({ locale, missing: [], extra: [] })
    }
  })

  it('every ErrorCode has a matching error.code.* key in all three locales', () => {
    const codes = Object.values(ErrorCodes)
    expect(codes.length, 'ErrorCodes must be non-empty').toBeGreaterThan(0)
    const locales = LOCALES.map((l) => ({ locale: l, tree: loadLocale(l) }))
    const errorTrees = locales.map(({ locale, tree }) => ({
      locale,
      codes: dig(tree, 'error.code') as Record<string, unknown> | undefined,
    }))

    for (const errorTree of errorTrees) {
      expect(errorTree.codes, `error.code missing in ${errorTree.locale}`).toBeTypeOf('object')
    }

    for (const code of codes) {
      const i18nKey = errorCodeToI18nKey(code) // error.code.{lowercase}
      const leaf = i18nKey.split('.').slice(2).join('.') // strip leading "error.code"
      for (const { locale, codes: bucket } of errorTrees) {
        expect(
          bucket && leaf in bucket,
          `${locale} missing ${i18nKey} for ErrorCode ${code}`,
        ).toBe(true)
      }
    }
  })
})
