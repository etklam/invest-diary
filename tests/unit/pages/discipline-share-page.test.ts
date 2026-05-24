import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('pages/discipline/share.vue', () => {
  const source = readFileSync(resolve(process.cwd(), 'pages/discipline/share.vue'), 'utf-8')

  it('is public and wires social preview meta to the SVG endpoint', () => {
    expect(source).toContain('requiresAuth: false')
    expect(source).toContain('useSeoMeta')
    expect(source).toContain('buildDisciplineOgImageURL')
    expect(source).toContain('twitterCard')
  })

  it('keeps the actual import action on the authenticated discipline page', () => {
    expect(source).toContain('`/discipline${importParam.value')
  })
})
