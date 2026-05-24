import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('pages/discipline/index.vue import URL handling', () => {
  const source = readFileSync(resolve(process.cwd(), 'pages/discipline/index.vue'), 'utf-8')

  it('opens the import modal when a valid URL import payload is present', () => {
    expect(source).toContain("import { parseImportFromURL } from '~/lib/disciplineShare'")
    expect(source).toContain('if (parseImportFromURL()?.isValid)')
    expect(source).toContain('showImportModal.value = true')
  })
})
