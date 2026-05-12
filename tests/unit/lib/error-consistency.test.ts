import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const projectRoot = path.resolve(__dirname, '../../..')

/**
 * Recursively find all .ts files under a directory.
 */
function findTsFiles(dir: string): string[] {
  const results: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      // Skip node_modules and hidden directories
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      results.push(...findTsFiles(fullPath))
    } else if (entry.name.endsWith('.ts')) {
      results.push(fullPath)
    }
  }
  return results
}

describe('Error Consistency — API Handlers use Errors.* pattern', () => {
  /**
   * Files that are ALLOWED to use createError directly:
   * - lib/errors/factory.ts: Where AppError.toH3Error() wraps createError
   * - server/utils/error-handler.ts: The handleApiError utility (though it now uses Errors.* internally)
   */
  const allowedCreateErrorFiles = new Set([
    path.join(projectRoot, 'lib/errors/factory.ts'),
  ])

  it('API handler files under server/api/ use Errors.* instead of raw createError', () => {
    const apiDir = path.join(projectRoot, 'server/api')
    if (!fs.existsSync(apiDir)) return // Skip if no api dir

    const violations: string[] = []
    const files = findTsFiles(apiDir)

    for (const file of files) {
      if (allowedCreateErrorFiles.has(file)) continue
      const content = fs.readFileSync(file, 'utf-8')

      // Check for raw createError calls (not inside a string/comment)
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!.trim()
        // Skip comments
        if (line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')) continue
        if (line.includes('createError(')) {
          violations.push(`${file}:${i + 1}: ${line.trim()}`)
        }
      }
    }

    if (violations.length > 0) {
      expect.fail(
        `Found ${violations.length} raw createError() call(s) in API handlers:\n` +
        violations.join('\n')
      )
    }

    expect(violations).toHaveLength(0)
  })

  it('middleware files under server/middleware/ use Errors.* instead of raw createError', () => {
    const middlewareDir = path.join(projectRoot, 'server/middleware')
    if (!fs.existsSync(middlewareDir)) return

    const violations: string[] = []
    const files = findTsFiles(middlewareDir)

    for (const file of files) {
      if (allowedCreateErrorFiles.has(file)) continue
      const content = fs.readFileSync(file, 'utf-8')

      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!.trim()
        if (line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')) continue
        if (line.includes('createError(')) {
          violations.push(`${file}:${i + 1}: ${line.trim()}`)
        }
      }
    }

    if (violations.length > 0) {
      expect.fail(
        `Found ${violations.length} raw createError() call(s) in middleware files:\n` +
        violations.join('\n')
      )
    }

    expect(violations).toHaveLength(0)
  })

  it('lib/errors/factory.ts is the only file allowed to call createError directly', () => {
    const allTsFiles = [
      ...findTsFiles(path.join(projectRoot, 'server')),
      ...findTsFiles(path.join(projectRoot, 'lib')),
    ]

    const violations: string[] = []

    for (const file of allTsFiles) {
      if (allowedCreateErrorFiles.has(file)) continue
      const content = fs.readFileSync(file, 'utf-8')

      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!.trim()
        if (line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')) continue
        if (line.includes('createError(')) {
          violations.push(`${file}:${i + 1}`)
        }
      }
    }

    expect(violations, 'Raw createError calls outside factory').toHaveLength(0)
  })
})
