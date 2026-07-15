import { ZipArchive } from 'archiver'
import { PassThrough, Transform } from 'node:stream'
import type { H3Event } from 'h3'
import type { SecFilingDetail, SecFilingDocument } from '~/types/sec-filings'
import { createReadStream, SEC_LIMITS, safeDownloadName, stageDocument, withTempWorkspace } from './download'
import { SecProviderError } from './errors'
import type { SecEdgarService } from './service'

export function selectPackageDocuments(detail: SecFilingDetail, includes: string[]): SecFilingDocument[] {
  const selected = new Map<string, SecFilingDocument>()
  const add = (document: SecFilingDocument) => selected.set(document.basename, document)
  const choices = includes.length ? includes : ['all']
  for (const choice of choices) {
    for (const document of detail.documents) {
      if (choice === 'all' || choice === 'primary' && document.isPrimary || choice === 'complete' && document.classification === 'complete-submission' || choice === 'xbrl' && document.isXbrl || choice === 'exhibits' && document.isExhibit || choice === 'pdf' && document.isPdf) add(document)
    }
  }
  return [...selected.values()]
}

export async function streamZip(event: H3Event, filename: string, entries: Array<{ path: string; name: string }>, manifest: unknown): Promise<void> {
  setResponseHeader(event, 'Content-Type', 'application/zip')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${safeDownloadName(filename)}"`)
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')
  const archive = new ZipArchive({ zlib: { level: 6 } })
  let written = 0
  const outputLimit = new Transform({ transform(chunk, _encoding, callback) {
    written += chunk.length
    callback(written > SEC_LIMITS.zipBytes ? new SecProviderError('SEC_PACKAGE_LIMIT_EXCEEDED', 'ZIP output exceeds limit', 413) : null, chunk)
  } })
  const output = new PassThrough()
  archive.on('error', (error: Error) => output.destroy(error))
  archive.pipe(outputLimit).pipe(output)
  const sending = sendStream(event, output)
  archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' })
  for (const entry of entries) archive.append(createReadStream(entry.path), { name: safeDownloadName(entry.name) })
  await archive.finalize()
  await sending
}

export async function buildSingleFilingPackage(event: H3Event, service: SecEdgarService, cik: string, accession: string, includes: string[]): Promise<void> {
  const detailResult = await service.getFilingDetail(cik, accession)
  const documents = selectPackageDocuments(detailResult.value, includes)
  enforceManifestLimits(documents)
  await withTempWorkspace(async directory => {
    const entries = []
    for (const [index, document] of documents.entries()) {
      const opened = await service.openDocument(cik, accession, document.basename)
      entries.push(await stageDocument(directory, index, document, opened.response))
    }
    const manifest = { source: 'SEC EDGAR', createdAt: new Date().toISOString(), company: detailResult.value.company, filing: detailResult.value.filing, files: documents.map(({ basename, size, classification }) => ({ basename, size, classification })) }
    await streamZip(event, `${detailResult.value.company.tickers[0] ?? cik}_${detailResult.value.filing.form}_${accession}.zip`, entries, manifest)
  })
}

export function enforceManifestLimits(documents: SecFilingDocument[]): void {
  if (documents.length === 0) throw new SecProviderError('SEC_DOCUMENT_NOT_FOUND', 'No matching SEC documents', 404)
  if (documents.length > SEC_LIMITS.packageFiles || documents.reduce((sum, item) => sum + item.size, 0) > SEC_LIMITS.packageBytes) {
    throw new SecProviderError('SEC_PACKAGE_LIMIT_EXCEEDED', 'SEC package exceeds resource limits', 413)
  }
}

export async function buildBatchPackage(event: H3Event, service: SecEdgarService, cik: string, accessions: string[], mode: 'primary' | 'complete'): Promise<void> {
  const resolved: Array<{ detail: SecFilingDetail; document: SecFilingDocument }> = []
  for (const accession of accessions) {
    const detail = await service.getFilingDetail(cik, accession)
    const document = mode === 'primary'
      ? detail.value.documents.find(item => item.isPrimary)
      : detail.value.documents.find(item => item.classification === 'complete-submission')
    if (!document) throw new SecProviderError('SEC_DOCUMENT_NOT_FOUND', `Required ${mode} document is unavailable`, 404)
    resolved.push({ detail: detail.value, document })
  }
  enforceManifestLimits(resolved.map(item => item.document))
  await withTempWorkspace(async directory => {
    const entries = []
    for (const [index, item] of resolved.entries()) {
      const opened = await service.openDocument(cik, item.detail.filing.accession, item.document.basename)
      const staged = await stageDocument(directory, index, item.document, opened.response)
      const ticker = item.detail.company.tickers[0] ?? cik
      entries.push({ ...staged, name: `${ticker}_${item.detail.filing.form}_${item.detail.filing.filingDate}_${item.detail.filing.accession}_${item.document.basename}` })
    }
    const manifest = { source: 'SEC EDGAR', createdAt: new Date().toISOString(), cik, mode, filings: resolved.map(item => ({ filing: item.detail.filing, document: { basename: item.document.basename, size: item.document.size } })) }
    await streamZip(event, `${resolved[0]?.detail.company.tickers[0] ?? cik}_sec-filings_${mode}.zip`, entries, manifest)
  })
}
