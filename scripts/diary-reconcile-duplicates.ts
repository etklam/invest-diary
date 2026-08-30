import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { config } from 'dotenv'
import { PrismaClient, type Prisma } from '@prisma/client'
import { createPrismaClientOptions } from '../lib/prisma-client-options'
import { getUtcDayRange, toUtcNoonDate } from '../lib/dates/normalize'
import { normalizeDiaryTags, parseDiaryTags, stringifyDiaryTags } from '../lib/diary-tags'

config()

const TEXT_MAX_BYTES = 65_535

export interface DiaryReconciliationCapabilities {
  reviewOutcome: boolean
  reviewSummary: boolean
  reviewLearning: boolean
  reviewAdjustment: boolean
  diaryStocks: boolean
  reconciliationAudit: boolean
}

export interface DiaryRow {
  id: bigint
  userId: bigint
  title: string
  content: string | null
  tagsString: string | null
  date: Date
  createdAt: Date
  thesis: string | null
  risk: string | null
  execution: string | null
  reviewDueAt: Date | null
  reviewStatus: string | null
  reviewedAt: Date | null
  reviewOutcome?: string | null
  reviewSummary?: string | null
  reviewLearning?: string | null
  reviewAdjustment?: string | null
}

interface ReconciledDiary {
  userId: string
  date: string
  canonicalDiaryId: string
  mergedDiaryId: string
  transactionCount: number
  alertCount: number
  tradePlanCount: number
  timelineRecordCount: number
  diaryStockCount: number
  rangeStart: string
  rangeEnd: string
}

export interface ReconciliationResult {
  apply: boolean
  migrationId: string
  duplicateGroupCount: number
  policy: {
    canonical: string
    content: string
    tags: string
    childRelations: string[]
    optionalRelations: string[]
  }
  reconciled: ReconciledDiary[]
}

function hashContent(content: string | null): string {
  return createHash('sha256').update(content ?? '', 'utf8').digest('hex')
}

function normalizedDate(date: Date): string {
  return toUtcNoonDate(date).toISOString().slice(0, 10)
}

function diarySelect(capabilities: DiaryReconciliationCapabilities): Prisma.DiarySelect {
  return {
    id: true,
    userId: true,
    title: true,
    content: true,
    tagsString: true,
    date: true,
    createdAt: true,
    thesis: true,
    risk: true,
    execution: true,
    reviewDueAt: true,
    reviewStatus: true,
    reviewedAt: true,
    reviewOutcome: capabilities.reviewOutcome,
    reviewSummary: capabilities.reviewSummary,
    reviewLearning: capabilities.reviewLearning,
    reviewAdjustment: capabilities.reviewAdjustment,
  }
}

export async function inspectDiaryReconciliationCapabilities(
  prisma: PrismaClient,
): Promise<DiaryReconciliationCapabilities> {
  const [columnRows, tableRows] = await Promise.all([
    prisma.$queryRaw<Array<{ COLUMN_NAME: string }>>`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'diaries'
        AND COLUMN_NAME IN ('review_outcome', 'review_summary', 'review_learning', 'review_adjustment')
    `,
    prisma.$queryRaw<Array<{ TABLE_NAME: string }>>`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('diary_stocks', 'diary_reconciliation_audits')
    `,
  ])

  const columns = new Set(columnRows.map(row => row.COLUMN_NAME))
  const tables = new Set(tableRows.map(row => row.TABLE_NAME))
  return {
    reviewOutcome: columns.has('review_outcome'),
    reviewSummary: columns.has('review_summary'),
    reviewLearning: columns.has('review_learning'),
    reviewAdjustment: columns.has('review_adjustment'),
    diaryStocks: tables.has('diary_stocks'),
    reconciliationAudit: tables.has('diary_reconciliation_audits'),
  }
}

async function loadDiaries(
  prisma: PrismaClient,
  capabilities: DiaryReconciliationCapabilities,
): Promise<DiaryRow[]> {
  const rows = await prisma.diary.findMany({
    select: diarySelect(capabilities),
    orderBy: [{ userId: 'asc' }, { date: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
  })
  return rows as unknown as DiaryRow[]
}

function optionalField(label: string, value: string | null | undefined): string {
  return `${label}: ${value ?? ''}`
}

export function reconciliationSection(diary: DiaryRow): string {
  return [
    `## Reconciled diary ${diary.id.toString()}`,
    `Original title: ${diary.title}`,
    `Original createdAt: ${diary.createdAt.toISOString()}`,
    optionalField('Original thesis', diary.thesis),
    optionalField('Original risk', diary.risk),
    optionalField('Original execution', diary.execution),
    `Original reviewDueAt: ${diary.reviewDueAt?.toISOString() ?? ''}`,
    optionalField('Original reviewStatus', diary.reviewStatus),
    `Original reviewedAt: ${diary.reviewedAt?.toISOString() ?? ''}`,
    optionalField('Original reviewOutcome', diary.reviewOutcome),
    optionalField('Original reviewSummary', diary.reviewSummary),
    optionalField('Original reviewLearning', diary.reviewLearning),
    optionalField('Original reviewAdjustment', diary.reviewAdjustment),
    '',
    diary.content ?? '',
  ].join('\n')
}

function buildMergedContent(canonical: DiaryRow, merged: DiaryRow): string {
  const canonicalContent = canonical.content ?? ''
  const section = reconciliationSection(merged)
  const mergedContent = canonicalContent ? `${canonicalContent}\n\n---\n\n${section}` : section
  if (Buffer.byteLength(mergedContent, 'utf8') > TEXT_MAX_BYTES) {
    throw new Error(
      `Refusing to merge diary ${merged.id.toString()}: resulting content exceeds ${TEXT_MAX_BYTES} UTF-8 bytes`,
    )
  }
  return mergedContent
}

function getMigrationId(): string {
  const argument = process.argv.find(value => value.startsWith('--migration-id='))
  return argument?.slice('--migration-id='.length) || `diary-date-reconciliation-${new Date().toISOString()}`
}

function reconciliationPolicy(capabilities: DiaryReconciliationCapabilities): ReconciliationResult['policy'] {
  return {
    canonical: 'earliest createdAt, then lowest id wins',
    content: 'duplicate title, content, timestamps, thesis, execution, risk, and every available structured review field are appended under a source heading',
    tags: 'canonical and duplicate tags are normalized and unioned',
    childRelations: ['transactions', 'alerts', 'trade plans', 'stock timeline records'],
    optionalRelations: capabilities.diaryStocks
      ? ['DiaryStock associations are unioned; an existing canonical association wins a duplicate key']
      : ['DiaryStock table is not present in this schema and is not touched'],
  }
}

async function reconcileGroup(
  prisma: PrismaClient,
  group: DiaryRow[],
  migrationId: string,
  capabilities: DiaryReconciliationCapabilities,
): Promise<ReconciledDiary[]> {
  const ordered = [...group].sort((left, right) => {
    const createdAt = left.createdAt.getTime() - right.createdAt.getTime()
    return createdAt || (left.id < right.id ? -1 : 1)
  })
  const canonicalId = ordered[0].id
  const date = toUtcNoonDate(ordered[0].date)
  const { startOfDayUtc, endOfDayUtc } = getUtcDayRange(date)
  const select = diarySelect(capabilities)

  return prisma.$transaction(async (tx) => {
    const reconciled: ReconciledDiary[] = []
    for (const mergedRow of ordered.slice(1)) {
      const canonical = await tx.diary.findUnique({ where: { id: canonicalId }, select }) as unknown as DiaryRow | null
      const merged = await tx.diary.findUnique({ where: { id: mergedRow.id }, select }) as unknown as DiaryRow | null
      if (!canonical || !merged) {
        throw new Error(`Duplicate group changed while reconciling ${canonicalId.toString()}/${mergedRow.id.toString()}`)
      }
      if (canonical.userId !== merged.userId) {
        throw new Error(`Refusing to merge diaries owned by different users: ${canonicalId}/${mergedRow.id}`)
      }

      const mergedContent = buildMergedContent(canonical, merged)
      const mergedTags = normalizeDiaryTags([
        ...parseDiaryTags(canonical.tagsString),
        ...parseDiaryTags(merged.tagsString),
      ])

      const [transactionCount, alertCount, tradePlanCount, timelineRecordCount] = await Promise.all([
        tx.transaction.count({ where: { diaryId: merged.id } }),
        tx.alert.count({ where: { diaryId: merged.id } }),
        tx.tradePlan.count({ where: { diaryId: merged.id } }),
        tx.stockTimelineRecord.count({ where: { sourceDiaryId: merged.id } }),
      ])

      let diaryStockCount = 0
      if (capabilities.diaryStocks) {
        const stockContexts = await tx.diaryStock.findMany({
          where: { diaryId: merged.id },
          select: { stockId: true, createdAt: true },
        })
        diaryStockCount = stockContexts.length
        if (stockContexts.length > 0) {
          await tx.diaryStock.createMany({
            data: stockContexts.map(context => ({
              diaryId: canonicalId,
              stockId: context.stockId,
              createdAt: context.createdAt,
            })),
            skipDuplicates: true,
          })
          await tx.diaryStock.deleteMany({ where: { diaryId: merged.id } })
        }
      }

      await tx.transaction.updateMany({ where: { diaryId: merged.id }, data: { diaryId: canonicalId, userId: canonical.userId } })
      await tx.alert.updateMany({ where: { diaryId: merged.id }, data: { diaryId: canonicalId } })
      await tx.tradePlan.updateMany({ where: { diaryId: merged.id }, data: { diaryId: canonicalId } })
      await tx.stockTimelineRecord.updateMany({ where: { sourceDiaryId: merged.id }, data: { sourceDiaryId: canonicalId } })

      await tx.diary.update({
        where: { id: canonicalId },
        data: {
          content: mergedContent,
          tagsString: stringifyDiaryTags(mergedTags),
          date,
        },
        select: { id: true },
      })

      await tx.diaryReconciliationAudit.create({
        data: {
          migrationId,
          userId: canonical.userId,
          diaryDate: date,
          canonicalDiaryId: canonicalId,
          mergedDiaryId: merged.id,
          canonicalContentHashBefore: hashContent(canonical.content),
          mergedContentHashBefore: hashContent(merged.content),
          canonicalContentHashAfter: hashContent(mergedContent),
          transactionCount,
          alertCount,
          tradePlanCount,
          timelineRecordCount,
        },
      })

      await tx.diary.delete({ where: { id: merged.id }, select: { id: true } })

      reconciled.push({
        userId: canonical.userId.toString(),
        date: normalizedDate(date),
        canonicalDiaryId: canonicalId.toString(),
        mergedDiaryId: merged.id.toString(),
        transactionCount,
        alertCount,
        tradePlanCount,
        timelineRecordCount,
        diaryStockCount,
        rangeStart: startOfDayUtc.toISOString(),
        rangeEnd: endOfDayUtc.toISOString(),
      })
    }

    return reconciled
  })
}

export async function reconcileDuplicateDiaries(
  prisma: PrismaClient,
  options: { apply: boolean; migrationId: string },
): Promise<ReconciliationResult> {
  const capabilities = await inspectDiaryReconciliationCapabilities(prisma)
  const diaries = await loadDiaries(prisma, capabilities)
  const grouped = new Map<string, DiaryRow[]>()
  for (const diary of diaries) {
    const key = `${diary.userId.toString()}:${normalizedDate(diary.date)}`
    grouped.set(key, [...(grouped.get(key) ?? []), diary])
  }
  const duplicateGroups = [...grouped.values()].filter(group => group.length > 1)
  const policy = reconciliationPolicy(capabilities)

  if (!options.apply) {
    return {
      apply: false,
      migrationId: options.migrationId,
      duplicateGroupCount: duplicateGroups.length,
      policy,
      reconciled: [],
    }
  }
  if (!capabilities.reconciliationAudit) {
    throw new Error('Refusing to reconcile before the diary_reconciliation_audits table exists')
  }

  const reconciled: ReconciledDiary[] = []
  for (const group of duplicateGroups) {
    reconciled.push(...await reconcileGroup(prisma, group, options.migrationId, capabilities))
  }
  return {
    apply: true,
    migrationId: options.migrationId,
    duplicateGroupCount: duplicateGroups.length,
    policy,
    reconciled,
  }
}

async function main(): Promise<void> {
  const prisma = new PrismaClient(createPrismaClientOptions())
  try {
    const result = await reconcileDuplicateDiaries(prisma, {
      apply: process.argv.includes('--apply'),
      migrationId: getMigrationId(),
    })
    console.log(JSON.stringify(result, null, 2))
  }
  finally {
    await prisma.$disconnect()
  }
}

const entrypoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : null
if (entrypoint === import.meta.url) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
