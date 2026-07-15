import { describe, expect, it } from 'vitest'
import {
  canonicalizeCik,
  parseAccession,
  parseDocumentBasename,
  normalizeTickerQuery,
} from '~/server/utils/sec-edgar/validation'

describe('SEC EDGAR identifier validation', () => {
  it('normalizes CIK and ticker input', () => {
    expect(canonicalizeCik('320193')).toBe('0000320193')
    expect(normalizeTickerQuery(' brk.b ')).toBe('BRK.B')
  })

  it('accepts a canonical accession and derives its directory name', () => {
    expect(parseAccession('0000320193-24-000123')).toEqual({
      accession: '0000320193-24-000123',
      directory: '000032019324000123',
    })
  })

  it.each(['../secret.txt', '%2e%2e%2fsecret', 'a/b.htm', 'a\\b.htm', 'bad\0.pdf', '..'])(
    'rejects unsafe document basename %s',
    (value) => expect(() => parseDocumentBasename(value)).toThrow(),
  )
})
