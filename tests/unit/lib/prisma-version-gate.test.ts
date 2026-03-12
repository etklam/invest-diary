import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('Prisma version gate', () => {
  it('uses Prisma major version 7 in dependencies and devDependencies', () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'))

    expect(pkg.dependencies['@prisma/client']).toMatch(/^\^?7\./)
    expect(pkg.devDependencies.prisma).toMatch(/^\^?7\./)
  })
})
