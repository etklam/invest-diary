import { createReadStream, createWriteStream } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { SecFilingDocument } from '~/types/sec-filings'
import { SecProviderError } from './errors'

export const SEC_LIMITS = {
  documentBytes: 250 * 1024 * 1024,
  packageFiles: 200,
  packageBytes: 500 * 1024 * 1024,
  zipBytes: 550 * 1024 * 1024,
}

export function safeDownloadName(value: string): string {
  const safe = value.normalize('NFKD').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^\.+/, '').slice(0, 180)
  return safe || 'sec-document'
}

export function responseNodeStream(response: Response, maxBytes: number): Readable {
  if (!response.body) throw new SecProviderError('SEC_UPSTREAM_INVALID_RESPONSE', 'SEC response body is empty', 502)
  const length = Number(response.headers.get('content-length') ?? 0)
  if (length > maxBytes) throw new SecProviderError('SEC_FILE_TOO_LARGE', 'SEC document exceeds size limit', 413)
  let received = 0
  const limiter = new Transform({
    transform(chunk, _encoding, callback) {
      received += chunk.length
      if (received > maxBytes) callback(new SecProviderError('SEC_FILE_TOO_LARGE', 'SEC document exceeds size limit', 413))
      else callback(null, chunk)
    },
  })
  return Readable.fromWeb(response.body as never).pipe(limiter)
}

export async function withTempWorkspace<T>(operation: (directory: string) => Promise<T>): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), 'sec-filings-'))
  try { return await operation(directory) } finally { await rm(directory, { recursive: true, force: true }) }
}

export async function stageDocument(directory: string, index: number, document: SecFilingDocument, response: Response): Promise<{ path: string; name: string; size: number }> {
  if (document.size > SEC_LIMITS.documentBytes) throw new SecProviderError('SEC_FILE_TOO_LARGE', 'SEC document exceeds size limit', 413)
  const name = `${String(index + 1).padStart(3, '0')}-${safeDownloadName(document.basename)}`
  const path = join(directory, name)
  await pipeline(responseNodeStream(response, SEC_LIMITS.documentBytes), createWriteStream(path, { flags: 'wx', mode: 0o600 }))
  return { path, name, size: document.size }
}

export { createReadStream }
