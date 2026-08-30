import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const contractsRoot = path.resolve(process.cwd(), 'lib/contracts')

function contractFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return contractFiles(entryPath)
    return /\.(?:ts|tsx|js|jsx|vue)$/.test(entry.name) ? [entryPath] : []
  })
}

describe('shared contracts import boundary', () => {
  it('contains no server-only or framework-only imports', () => {
    const forbiddenImports = [
      { name: '@prisma/client', pattern: /@prisma\/client/ },
      { name: 'Node-only API', pattern: /\bnode:/ },
      { name: 'Vue/Nuxt', pattern: /(?:from|import\s*\()\s*['"](?:vue|nuxt|#imports)(?:['"]|\/)/ },
    ]

    const offenders = contractFiles(contractsRoot).flatMap((filePath) => {
      const source = fs.readFileSync(filePath, 'utf8')
      return forbiddenImports
        .filter(({ pattern }) => pattern.test(source))
        .map(({ name }) => `${path.relative(process.cwd(), filePath)}: ${name}`)
    })

    expect(offenders).toEqual([])
  })
})
