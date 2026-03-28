import { describe, expect, it } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'

const typecheckConfigPath = path.resolve('tsconfig.typecheck.json')
const healthCheckPath = path.resolve('scripts/health-check.ts')

describe('typecheck configuration', () => {
  it('does not exclude server directory', () => {
    const config = JSON.parse(fs.readFileSync(typecheckConfigPath, 'utf8'))
    const excludes: string[] = config.exclude ?? []
    expect(excludes).not.toContain('server/**/*')
    expect(excludes).not.toContain('server/**')
  })

  it('covers both frontend and server source directories', () => {
    const config = JSON.parse(fs.readFileSync(typecheckConfigPath, 'utf8'))
    const includes: string[] = config.include ?? []
    expect(includes).toContain('components/**/*')
    expect(includes).toContain('pages/**/*')
    expect(includes).toContain('server/**/*')
  })

  it('does not force the vue-router volar plugin to load', () => {
    const config = JSON.parse(fs.readFileSync(typecheckConfigPath, 'utf8'))
    const plugins: string[] = config.vueCompilerOptions?.plugins ?? []
    expect(plugins).not.toContain('vue-router/volar/sfc-route-blocks')
  })
})

describe('health-check typecheck behavior', () => {
  it('runs the project typecheck gate without suppressing errors', () => {
    const content = fs.readFileSync(healthCheckPath, 'utf8')
    expect(content).toContain('TypeScript Compilation')
    expect(content).toContain("exec('npm run typecheck'")
    expect(content).not.toContain('|| true')
  })
})

describe('coverage gate script', () => {
  it('exists in package.json', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    expect(pkg.scripts).toHaveProperty('coverage:gate')
  })

  it('uses vue-tsc for the dedicated typecheck gate', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    expect(pkg.scripts.typecheck).toBe('vue-tsc --noEmit -p tsconfig.typecheck.json')
  })
})
