import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@prisma/client'
import { createConnection, type Connection } from 'mariadb'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { reconcileDuplicateDiaries } from '../../scripts/diary-reconcile-duplicates'

const databaseUrl = process.env.DIARY_RECONCILIATION_TEST_DATABASE_URL
const describeMysql = databaseUrl ? describe.sequential : describe.skip

function assertDisposableDatabase(url: string): void {
  const parsed = new URL(url)
  const database = parsed.pathname.replace(/^\//, '')
  if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)) {
    throw new Error(`Refusing to run destructive reconciliation test against non-loopback host ${parsed.hostname}`)
  }
  if (database !== 'diary_reconciliation_test') {
    throw new Error(`Refusing to run reconciliation integration test against database ${database || '(empty)'}`)
  }
}

describeMysql('Diary duplicate reconciliation on disposable MariaDB', () => {
  let connection: Connection
  let prisma: PrismaClient

  beforeAll(async () => {
    assertDisposableDatabase(databaseUrl!)
    connection = await createConnection(databaseUrl!.replace(/^mysql:/, 'mariadb:'))
    prisma = new PrismaClient({ adapter: new PrismaMariaDb(databaseUrl!) })

    await connection.query('SET FOREIGN_KEY_CHECKS = 0')
    for (const table of [
      'diary_reconciliation_audits',
      'diary_stocks',
      'stock_timeline_records',
      'trade_plans',
      'alerts',
      'transactions',
      'stocks',
      'diaries',
      'users',
    ]) {
      await connection.query(`DROP TABLE IF EXISTS \`${table}\``)
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1')

    await connection.query(`
      CREATE TABLE users (
        id BIGINT NOT NULL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL
      ) ENGINE=InnoDB
    `)
    await connection.query(`
      CREATE TABLE diaries (
        id BIGINT NOT NULL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NULL,
        tags VARCHAR(500) NULL,
        created_via VARCHAR(32) NOT NULL DEFAULT 'WEB',
        created_by_label VARCHAR(100) NULL,
        date DATETIME(3) NOT NULL,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        thesis TEXT NULL,
        risk TEXT NULL,
        execution TEXT NULL,
        review_due_at DATETIME(3) NULL,
        review_status VARCHAR(20) NULL,
        reviewed_at DATETIME(3) NULL,
        review_outcome VARCHAR(20) NULL,
        review_summary TEXT NULL,
        review_learning TEXT NULL,
        review_adjustment TEXT NULL,
        CONSTRAINT diaries_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `)
    await connection.query(`CREATE TABLE transactions (
      id BIGINT NOT NULL PRIMARY KEY, diary_id BIGINT NOT NULL, user_id BIGINT NOT NULL,
      CONSTRAINT transactions_diary_fk FOREIGN KEY (diary_id) REFERENCES diaries(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`)
    await connection.query(`CREATE TABLE alerts (
      id BIGINT NOT NULL PRIMARY KEY, diary_id BIGINT NOT NULL,
      CONSTRAINT alerts_diary_fk FOREIGN KEY (diary_id) REFERENCES diaries(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`)
    await connection.query(`CREATE TABLE trade_plans (
      id BIGINT NOT NULL PRIMARY KEY, diary_id BIGINT NULL, updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      CONSTRAINT trade_plans_diary_fk FOREIGN KEY (diary_id) REFERENCES diaries(id) ON DELETE SET NULL
    ) ENGINE=InnoDB`)
    await connection.query(`CREATE TABLE stock_timeline_records (
      id BIGINT NOT NULL PRIMARY KEY, source_diary_id BIGINT NULL, updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      CONSTRAINT timeline_diary_fk FOREIGN KEY (source_diary_id) REFERENCES diaries(id) ON DELETE SET NULL
    ) ENGINE=InnoDB`)
    await connection.query('CREATE TABLE stocks (id BIGINT NOT NULL PRIMARY KEY, symbol VARCHAR(32) NOT NULL UNIQUE) ENGINE=InnoDB')
    await connection.query(`CREATE TABLE diary_stocks (
      diary_id BIGINT NOT NULL, stock_id BIGINT NOT NULL, created_at DATETIME(3) NOT NULL,
      PRIMARY KEY (diary_id, stock_id),
      CONSTRAINT diary_stocks_diary_fk FOREIGN KEY (diary_id) REFERENCES diaries(id) ON DELETE CASCADE,
      CONSTRAINT diary_stocks_stock_fk FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`)
    await connection.query(`CREATE TABLE diary_reconciliation_audits (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      migration_id VARCHAR(100) NOT NULL,
      user_id BIGINT NOT NULL,
      diary_date DATETIME(3) NOT NULL,
      canonical_diary_id BIGINT NOT NULL,
      merged_diary_id BIGINT NOT NULL,
      canonical_content_hash_before CHAR(64) NOT NULL,
      merged_content_hash_before CHAR(64) NOT NULL,
      canonical_content_hash_after CHAR(64) NOT NULL,
      transaction_count INT NOT NULL,
      alert_count INT NOT NULL,
      trade_plan_count INT NOT NULL,
      timeline_record_count INT NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE KEY diary_reconciliation_audits_migration_merged_key (migration_id, merged_diary_id)
    ) ENGINE=InnoDB`)

    await connection.query("INSERT INTO users (id, email, password) VALUES (1, 'test@example.com', 'unused')")
    await connection.query(`
      INSERT INTO diaries (
        id, user_id, title, content, tags, date, created_at, updated_at,
        thesis, risk, execution, review_due_at, review_status, reviewed_at,
        review_outcome, review_summary, review_learning, review_adjustment
      ) VALUES
        (10, 1, 'Canonical', 'Canonical body', 'shared,canonical', '2026-08-20 08:00:00.000', '2026-08-20 08:00:00.000', '2026-08-20 08:00:00.000', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
        (20, 1, 'Merged', 'Merged body', 'shared,merged', '2026-08-20 18:00:00.000', '2026-08-20 09:00:00.000', '2026-08-20 09:00:00.000', 'Merged thesis', 'Merged risk', 'Merged execution', '2026-09-01 12:00:00.000', 'reviewed', '2026-08-25 12:00:00.000', 'PARTIAL', 'Merged summary', 'Merged learning', 'Merged adjustment')
    `)
    await connection.query('INSERT INTO transactions (id, diary_id, user_id) VALUES (1, 20, 1)')
    await connection.query('INSERT INTO alerts (id, diary_id) VALUES (1, 20)')
    await connection.query('INSERT INTO trade_plans (id, diary_id) VALUES (1, 20)')
    await connection.query('INSERT INTO stock_timeline_records (id, source_diary_id) VALUES (1, 20)')
    await connection.query("INSERT INTO stocks (id, symbol) VALUES (1, 'AAA'), (2, 'BBB')")
    await connection.query("INSERT INTO diary_stocks (diary_id, stock_id, created_at) VALUES (10, 1, NOW(3)), (20, 1, NOW(3)), (20, 2, NOW(3))")
  }, 30_000)

  afterAll(async () => {
    await prisma?.$disconnect()
    await connection?.end()
  })

  it('preserves review fields, reparents children, unions DiaryStock, then accepts the unique index', async () => {
    const preview = await reconcileDuplicateDiaries(prisma, { apply: false, migrationId: 'integration-test' })
    expect(preview.duplicateGroupCount).toBe(1)
    expect(preview.policy.optionalRelations).toContain(
      'DiaryStock associations are unioned; an existing canonical association wins a duplicate key',
    )

    const result = await reconcileDuplicateDiaries(prisma, { apply: true, migrationId: 'integration-test' })
    expect(result.reconciled).toEqual([expect.objectContaining({
      canonicalDiaryId: '10',
      mergedDiaryId: '20',
      transactionCount: 1,
      alertCount: 1,
      tradePlanCount: 1,
      timelineRecordCount: 1,
      diaryStockCount: 2,
    })])

    const diary = await prisma.diary.findUniqueOrThrow({ where: { id: 10n } })
    expect(diary.date.toISOString()).toBe('2026-08-20T12:00:00.000Z')
    expect(diary.tagsString).toBe('shared,canonical,merged')
    expect(diary.content).toContain('Original reviewOutcome: PARTIAL')
    expect(diary.content).toContain('Original reviewSummary: Merged summary')
    expect(diary.content).toContain('Original reviewLearning: Merged learning')
    expect(diary.content).toContain('Original reviewAdjustment: Merged adjustment')
    expect(await prisma.diary.count()).toBe(1)
    expect(await prisma.diaryStock.findMany({ orderBy: { stockId: 'asc' } })).toEqual([
      expect.objectContaining({ diaryId: 10n, stockId: 1n }),
      expect.objectContaining({ diaryId: 10n, stockId: 2n }),
    ])
    expect(await prisma.transaction.findUniqueOrThrow({ where: { id: 1n }, select: { diaryId: true } })).toEqual({ diaryId: 10n })
    expect(await prisma.alert.findUniqueOrThrow({ where: { id: 1n }, select: { diaryId: true } })).toEqual({ diaryId: 10n })
    expect(await prisma.tradePlan.findUniqueOrThrow({ where: { id: 1n }, select: { diaryId: true } })).toEqual({ diaryId: 10n })
    expect(await prisma.stockTimelineRecord.findUniqueOrThrow({ where: { id: 1n }, select: { sourceDiaryId: true } })).toEqual({ sourceDiaryId: 10n })
    expect(await prisma.diaryReconciliationAudit.count()).toBe(1)

    await connection.query('ALTER TABLE diaries ADD UNIQUE INDEX diaries_user_date_key (user_id, date)')
    await expect(connection.query(`
      INSERT INTO diaries (id, user_id, title, date, created_at, updated_at)
      VALUES (30, 1, 'Should conflict', '2026-08-20 12:00:00.000', NOW(3), NOW(3))
    `)).rejects.toThrow()
  }, 30_000)

  it('runs against the legacy pre-0900 schema without later review fields or DiaryStock', async () => {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0')
    for (const table of [
      'diary_reconciliation_audits',
      'diary_stocks',
      'stock_timeline_records',
      'trade_plans',
      'alerts',
      'transactions',
      'stocks',
      'diaries',
      'users',
    ]) {
      await connection.query(`DROP TABLE IF EXISTS \`${table}\``)
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1')

    await connection.query('CREATE TABLE users (id BIGINT NOT NULL PRIMARY KEY, email VARCHAR(255) NOT NULL, password VARCHAR(255) NOT NULL) ENGINE=InnoDB')
    await connection.query(`CREATE TABLE diaries (
      id BIGINT NOT NULL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NULL,
      tags VARCHAR(500) NULL,
      date DATETIME(3) NOT NULL,
      created_at DATETIME(3) NOT NULL,
      updated_at DATETIME(3) NOT NULL,
      thesis TEXT NULL,
      risk TEXT NULL,
      execution TEXT NULL,
      review_due_at DATETIME(3) NULL,
      review_status VARCHAR(20) NULL,
      reviewed_at DATETIME(3) NULL
    ) ENGINE=InnoDB`)
    await connection.query('CREATE TABLE transactions (id BIGINT NOT NULL PRIMARY KEY, diary_id BIGINT NOT NULL, user_id BIGINT NOT NULL) ENGINE=InnoDB')
    await connection.query('CREATE TABLE alerts (id BIGINT NOT NULL PRIMARY KEY, diary_id BIGINT NOT NULL) ENGINE=InnoDB')
    await connection.query('CREATE TABLE trade_plans (id BIGINT NOT NULL PRIMARY KEY, diary_id BIGINT NULL, updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)) ENGINE=InnoDB')
    await connection.query('CREATE TABLE stock_timeline_records (id BIGINT NOT NULL PRIMARY KEY, source_diary_id BIGINT NULL, updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)) ENGINE=InnoDB')
    await connection.query(`CREATE TABLE diary_reconciliation_audits (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      migration_id VARCHAR(100) NOT NULL,
      user_id BIGINT NOT NULL,
      diary_date DATETIME(3) NOT NULL,
      canonical_diary_id BIGINT NOT NULL,
      merged_diary_id BIGINT NOT NULL,
      canonical_content_hash_before CHAR(64) NOT NULL,
      merged_content_hash_before CHAR(64) NOT NULL,
      canonical_content_hash_after CHAR(64) NOT NULL,
      transaction_count INT NOT NULL,
      alert_count INT NOT NULL,
      trade_plan_count INT NOT NULL,
      timeline_record_count INT NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE KEY diary_reconciliation_audits_migration_merged_key (migration_id, merged_diary_id)
    ) ENGINE=InnoDB`)
    await connection.query("INSERT INTO users (id, email, password) VALUES (1, 'legacy@example.com', 'unused')")
    await connection.query(`INSERT INTO diaries (
      id, user_id, title, content, tags, date, created_at, updated_at,
      thesis, risk, execution, review_due_at, review_status, reviewed_at
    ) VALUES
      (100, 1, 'Legacy canonical', 'Canonical legacy body', 'canonical', '2026-08-21 07:00:00.000', '2026-08-21 07:00:00.000', '2026-08-21 07:00:00.000', NULL, NULL, NULL, NULL, NULL, NULL),
      (200, 1, 'Legacy merged', 'Merged legacy body', 'merged', '2026-08-21 19:00:00.000', '2026-08-21 08:00:00.000', '2026-08-21 08:00:00.000', 'Legacy thesis', 'Legacy risk', 'Legacy execution', NULL, 'pending', NULL)
    `)
    await connection.query('INSERT INTO transactions (id, diary_id, user_id) VALUES (10, 200, 1)')

    const preview = await reconcileDuplicateDiaries(prisma, { apply: false, migrationId: 'legacy-integration-test' })
    expect(preview.duplicateGroupCount).toBe(1)
    expect(preview.policy.optionalRelations).toContain('DiaryStock table is not present in this schema and is not touched')

    await connection.query(`INSERT INTO diary_reconciliation_audits (
      migration_id, user_id, diary_date, canonical_diary_id, merged_diary_id,
      canonical_content_hash_before, merged_content_hash_before, canonical_content_hash_after,
      transaction_count, alert_count, trade_plan_count, timeline_record_count
    ) VALUES (
      'legacy-integration-test', 1, '2026-08-21 12:00:00.000', 100, 200,
      REPEAT('0', 64), REPEAT('0', 64), REPEAT('0', 64), 0, 0, 0, 0
    )`)
    await expect(reconcileDuplicateDiaries(prisma, {
      apply: true,
      migrationId: 'legacy-integration-test',
    })).rejects.toThrow()
    expect(await prisma.diary.count()).toBe(2)
    expect(await prisma.transaction.findUniqueOrThrow({ where: { id: 10n }, select: { diaryId: true } })).toEqual({ diaryId: 200n })
    expect(await prisma.diary.findUniqueOrThrow({ where: { id: 100n }, select: { content: true } })).toEqual({ content: 'Canonical legacy body' })
    await connection.query("DELETE FROM diary_reconciliation_audits WHERE migration_id = 'legacy-integration-test'")

    const result = await reconcileDuplicateDiaries(prisma, { apply: true, migrationId: 'legacy-integration-test' })
    expect(result.reconciled).toEqual([expect.objectContaining({
      canonicalDiaryId: '100',
      mergedDiaryId: '200',
      diaryStockCount: 0,
      transactionCount: 1,
    })])

    const rows = await connection.query('SELECT id, content, date FROM diaries ORDER BY id') as Array<{ id: bigint; content: string; date: Date }>
    expect(rows).toHaveLength(1)
    expect(String(rows[0].id)).toBe('100')
    expect(rows[0].content).toContain('Original thesis: Legacy thesis')
    expect(rows[0].content).toContain('Merged legacy body')

    await connection.query('ALTER TABLE diaries ADD UNIQUE INDEX diaries_user_date_key (user_id, date)')
    await expect(connection.query(`INSERT INTO diaries (
      id, user_id, title, date, created_at, updated_at
    ) VALUES (300, 1, 'Legacy conflict', '2026-08-21 12:00:00.000', NOW(3), NOW(3))`)).rejects.toThrow()
  }, 30_000)
})
