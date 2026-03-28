import { describe, expect, it } from 'vitest'
import eslintConfig from '../eslint.config.mjs'

describe('ESLint config', () => {
  it('does not ignore TypeScript files, Vue files, or tests folder', () => {
    const ignoreList = eslintConfig[0].ignores ?? []
    expect(ignoreList).not.toContain('**/*.ts')
    expect(ignoreList).not.toContain('**/*.vue')
    expect(ignoreList).not.toContain('tests/**')
  })

  it('configures dedicated parser blocks for TypeScript and Vue files', () => {
    const tsBlock = eslintConfig.find(config => config.files?.includes('**/*.{ts,mts,cts,d.ts}'))
    const vueBlock = eslintConfig.find(config => config.files?.includes('**/*.vue'))

    expect(tsBlock?.languageOptions?.parser).toBeDefined()
    expect(tsBlock?.plugins).toHaveProperty('@typescript-eslint')
    expect(vueBlock?.languageOptions?.parser).toBeDefined()
    expect(vueBlock?.plugins).toHaveProperty('vue')
  })
})
