import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('structured review migration', () => {
  it('adds four nullable Diary fields without rewriting legacy review data', () => {
    const schema = readFileSync(resolve(process.cwd(), 'prisma/schema.prisma'), 'utf8')
    const migration = readFileSync(resolve(
      process.cwd(),
      'prisma/migrations/20260809070000_add_structured_review_v1/migration.sql',
    ), 'utf8')

    expect(schema).toContain('reviewOutcome    String? @map("review_outcome") @db.VarChar(20)')
    expect(schema).toContain('reviewSummary    String? @map("review_summary") @db.Text')
    expect(schema).toContain('reviewLearning   String? @map("review_learning") @db.Text')
    expect(schema).toContain('reviewAdjustment String? @map("review_adjustment") @db.Text')
    expect(migration.match(/ADD COLUMN/g)).toHaveLength(4)
    expect(migration).not.toMatch(/UPDATE|NOT NULL|DEFAULT/i)
  })
})
