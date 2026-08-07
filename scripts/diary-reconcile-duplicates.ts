import { createHash } from 'node:crypto'
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { createPrismaClientOptions } from '../lib/prisma-client-options'
import { getUtcDayRange, toUtcNoonDate } from '../lib/dates/normalize'
import { normalizeDiaryTags, parseDiaryTags, stringifyDiaryTags } from '../lib/diary-tags'

config()

const prisma = new PrismaClient(createPrismaClientOptions())
const TEXT_MAX_BYTES = 65_535

type DiaryRow = Awaited<ReturnType<typeof loadDiaries>>[number]

function hashContent(content: string | null): string {
  return createHash('sha256').update(content ?? '', 'utf8').digest('hex')
}

function normalizedDate(date: Date): string {
  return toUtcNoonDate(date).toISOString().slice(0, 10)
}

async function loadDiaries() {
  return prisma.diary.findMany({
    select: {
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
    },
    orderBy: [{ userId: 'asc' }, { date: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
  })
}

function reconciliationSection(diary: DiaryRow): string {
  return [
    `## Reconciled diary ${diary.id.toString()}`,
    `Original title: ${diary.title}`,
    `Original createdAt: ${diary.createdAt.toISOString()}`,
    `Original thesis: ${diary.thesis ?? ''}`,
    `Original risk: ${diary.risk ?? ''}`,
    `Original execution: ${diary.execution ?? ''}`,
    `Original reviewDueAt: ${diary.reviewDueAt?.toISOString() ?? ''}`,
    `Original reviewStatus: ${diary.reviewStatus ?? ''}`,
    `Original reviewedAt: ${diary.reviewedAt?.toISOString() ?? ''}`,
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
  const argument = process.argv.find((value) => value.startsWith('--migration-id='))
  return argument?.slice('--migration-id='.length) || `diary-date-reconciliation-${new Date().toISOString()}`
}

async function reconcileGroup(
  group: DiaryRow[],
  migrationId: string,
): Promise<Array<Record<string, string | number>>> {
  const ordered = [...group].sort((left, right) => {
    const createdAt = left.createdAt.getTime() - right.createdAt.getTime()
    return createdAt || (left.id < right.id ? -1 : 1)
  })
  const canonicalId = ordered[0].id
  const date = toUtcNoonDate(ordered[0].date)
  const { startOfDayUtc, endOfDayUtc } = getUtcDayRange(date)

  return prisma.$transaction(async (tx) => {
    const reconciled: Array<Record<string, string | number>> = []
    for (const mergedRow of ordered.slice(1)) {
      const canonical = await tx.diary.findUnique({ where: { id: canonicalId } })
      const merged = await tx.diary.findUnique({ where: { id: mergedRow.id } })
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

      await tx.diary.delete({ where: { id: merged.id } })

      reconciled.push({
        userId: canonical.userId.toString(),
        date: normalizedDate(date),
        canonicalDiaryId: canonicalId.toString(),
        mergedDiaryId: merged.id.toString(),
        transactionCount,
        alertCount,
        tradePlanCount,
        timelineRecordCount,
        rangeStart: startOfDayUtc.toISOString(),
        rangeEnd: endOfDayUtc.toISOString(),
      })
    }

    return reconciled
  })
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply')
  const migrationId = getMigrationId()
  const diaries = await loadDiaries()
  const grouped = new Map<string, DiaryRow[]>()
  for (const diary of diaries) {
    const key = `${diary.userId.toString()}:${normalizedDate(diary.date)}`
    grouped.set(key, [...(grouped.get(key) ?? []), diary])
  }
  const duplicateGroups = [...grouped.values()].filter((group) => group.length > 1)

  if (!apply) {
    console.log(JSON.stringify({
      apply: false,
      migrationId,
      duplicateGroupCount: duplicateGroups.length,
      policy: 'earliest createdAt, then lowest id wins; duplicate content is appended with source headings; all child rows are reparented',
      nextStep: 'Review this plan and rerun with --apply after human approval.',
    }, null, 2))
    return
  }

  const reconciled = []
  for (const group of duplicateGroups) {
    reconciled.push(...await reconcileGroup(group, migrationId))
  }
  console.log(JSON.stringify({ apply: true, migrationId, reconciled }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
