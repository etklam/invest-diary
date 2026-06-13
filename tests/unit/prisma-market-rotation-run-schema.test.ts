import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const schema = fs.readFileSync('prisma/schema.prisma', 'utf8')
const migrationsDir = path.resolve('prisma/migrations')

describe('market rotation snapshot run schema', () => {
  it('defines a run metadata table for snapshot batch executions', () => {
    expect(schema).toContain('model MarketRotationSnapshotRun')
    expect(schema).toContain('@@map("market_rotation_snapshot_run")')
    expect(schema).toContain('rankScope')
    expect(schema).toContain('snapshotDate')
    expect(schema).toContain('qualifiedSymbolCount')
    expect(schema).toContain('errorCount')
  })

  it('has a migration that creates the run metadata table', () => {
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .flatMap((entry) => {
        const migrationPath = path.join(migrationsDir, entry, 'migration.sql')
        return fs.existsSync(migrationPath) ? [migrationPath] : []
      })

    const migrationSql = migrationFiles
      .map(file => fs.readFileSync(file, 'utf8'))
      .join('\n')

    expect(migrationSql).toContain('CREATE TABLE `market_rotation_snapshot_run`')
    expect(migrationSql).toContain('`rank_scope` VARCHAR(20) NOT NULL')
    expect(migrationSql).toContain('`snapshot_date` DATE NULL')
  })
})
