import { describe, expect, it } from 'vitest'
import { enforceManifestLimits, selectPackageDocuments } from '~/server/utils/sec-edgar/package'
import { safeDownloadName } from '~/server/utils/sec-edgar/download'
import type { SecFilingDetail, SecFilingDocument } from '~/types/sec-filings'

const doc = (basename: string, flags: Partial<SecFilingDocument>): SecFilingDocument => ({ basename, description: null, type: null, sequence: null, size: 10, classification: 'other', isPrimary: false, isPdf: false, isXbrl: false, isExhibit: false, ...flags })

describe('SEC filing packages', () => {
  it('selects and deduplicates requested document classes', () => {
    const detail = { documents: [doc('main.htm', { isPrimary: true, classification: 'primary' }), doc('ex.pdf', { isPdf: true, isExhibit: true, classification: 'pdf' })] } as SecFilingDetail
    expect(selectPackageDocuments(detail, ['primary', 'pdf', 'exhibits']).map(item => item.basename)).toEqual(['main.htm', 'ex.pdf'])
  })

  it('sanitizes archive names and rejects empty manifests', () => {
    expect(safeDownloadName('../../AAPL 10-K.pdf')).toBe('_.._AAPL_10-K.pdf')
    expect(() => enforceManifestLimits([])).toThrow('No matching SEC documents')
  })
})
