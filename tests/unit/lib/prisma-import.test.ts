import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

describe('Prisma import contract', () => {
  it('avoids ESM import of PrismaClient in runtime code', async () => {
    const filePath = path.resolve(process.cwd(), 'lib/prisma.ts')
    const source = await readFile(filePath, 'utf8')

    expect(source).toContain('createRequire')
    expect(source).toContain("require('@prisma/client')")
    expect(source).not.toContain("import { PrismaClient } from '@prisma/client'")
  })
})
