import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { createPrismaClientOptions } from '../lib/prisma-client-options'
import { toUtcNoonDate } from '../lib/dates/normalize'

config()

const prisma = new PrismaClient(createPrismaClientOptions())

interface DuplicateDiary {
  id: string
  title: string
  createdAt: string
  contentBytes: number
  transactionCount: number
  alertCount: number
  tradePlanCount: number
  timelineRecordCount: number
}

interface DuplicateGroup {
  userId: string
  date: string
  diaries: DuplicateDiary[]
}

function normalizedDate(date: Date): string {
  return toUtcNoonDate(date).toISOString().slice(0, 10)
}

async function main(): Promise<void> {
  const diaries = await prisma.diary.findMany({
    select: {
      id: true,
      userId: true,
      title: true,
      content: true,
      date: true,
      createdAt: true,
      _count: {
        select: {
          transactions: true,
          alerts: true,
          tradePlans: true,
          stockTimelineRecords: true,
        },
      },
    },
    orderBy: [{ userId: 'asc' }, { date: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
  })

  const grouped = new Map<string, DuplicateGroup>()
  for (const diary of diaries) {
    const date = normalizedDate(diary.date)
    const key = `${diary.userId.toString()}:${date}`
    const group = grouped.get(key) ?? { userId: diary.userId.toString(), date, diaries: [] }
    group.diaries.push({
      id: diary.id.toString(),
      title: diary.title,
      createdAt: diary.createdAt.toISOString(),
      contentBytes: Buffer.byteLength(diary.content ?? '', 'utf8'),
      transactionCount: diary._count.transactions,
      alertCount: diary._count.alerts,
      tradePlanCount: diary._count.tradePlans,
      timelineRecordCount: diary._count.stockTimelineRecords,
    })
    grouped.set(key, group)
  }

  const duplicateGroups = [...grouped.values()].filter((group) => group.diaries.length > 1)
  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    totalDiaries: diaries.length,
    duplicateGroupCount: duplicateGroups.length,
    duplicateDiaryCount: duplicateGroups.reduce((sum, group) => sum + group.diaries.length, 0),
    duplicateGroups,
  }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
