import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const rootDir = path.resolve('.')
const legacyProductName = ['market', 'bee'].join('')
const legacyComponentName = ['Market', 'bee', 'Section'].join('')
const legacyComposableName = ['use', 'Market', 'bee'].join('')
const blockedTerms = [
  new RegExp(legacyProductName, 'i'),
  new RegExp(legacyComponentName),
  new RegExp(legacyComposableName),
]
const ignoredDirs = new Set([
  '.git',
  '.nuxt',
  '.output',
  'coverage',
  'node_modules',
])

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) continue

    const fullPath = path.join(dir, entry.name)
    const relativePath = path.relative(rootDir, fullPath)

    if (relativePath.startsWith(`prisma${path.sep}migrations${path.sep}`)) {
      continue
    }

    if (entry.isDirectory()) {
      files.push(...walk(fullPath))
      continue
    }

    if (entry.isFile()) {
      files.push(fullPath)
    }
  }

  return files
}

describe('market state terminology', () => {
  it('does not keep legacy external naming outside migration history', () => {
    const offenders = walk(rootDir).flatMap((file) => {
      const relativePath = path.relative(rootDir, file)
      const pathHit = blockedTerms.some(term => term.test(relativePath))
      const content = fs.readFileSync(file, 'utf8')
      const contentHit = blockedTerms.some(term => term.test(content))

      return pathHit || contentHit ? [relativePath] : []
    })

    expect(offenders).toEqual([])
  })
})
