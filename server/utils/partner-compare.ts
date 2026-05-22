import { formatYmdInTimezone } from '~/lib/diary-date'
import { parseDiaryTags } from '~/lib/diary-tags'

// ─── Types ────────────────────────────────────────────────────────────────────

/** A diary stripped of private relations (transactions/alerts) with tags attached. */
export type PartnerDiary = {
  id: bigint
  userId: bigint
  title: string
  content: string
  tagsString: string | null
  createdVia: string
  createdByLabel: string | null
  date: Date
  createdAt: Date
  updatedAt: Date
  tags: string[]
}

export interface CompareDay {
  dateKey: string
  ownerDiary: PartnerDiary | null
  partnerDiary: PartnerDiary | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface RawDiary {
  id: bigint
  userId: bigint
  title: string
  content: string
  tagsString: string | null
  createdVia: string
  createdByLabel: string | null
  date: Date
  createdAt: Date
  updatedAt: Date
  transactions?: any[]
  alerts?: any[]
}

function stripAndTag(diary: RawDiary | undefined): PartnerDiary | null {
  if (!diary) return null
  const { transactions, alerts, ...rest } = diary
  return {
    ...rest,
    tags: parseDiaryTags(diary.tagsString),
  }
}

// ─── Core ─────────────────────────────────────────────────────────────────────

/**
 * Build an array of CompareDay entries from owner and partner diaries.
 *
 * 1. Map each diary to a dateKey via formatYmdInTimezone
 * 2. Build Maps for O(1) lookup by dateKey
 * 3. Collect unique dateKeys from both sets
 * 4. Sort descending (most recent first)
 * 5. Slice to `limit`
 * 6. For each dateKey, look up owner and partner diaries
 * 7. Strip transactions/alerts, attach tags
 */
export function buildCompareDays(
  ownerDiaries: RawDiary[],
  partnerDiaries: RawDiary[],
  timeZone: string,
  limit: number,
): CompareDay[] {
  const ownerDatePairs = ownerDiaries.map((diary) =>
    [formatYmdInTimezone(diary.date, timeZone), diary] as const,
  )
  const partnerDatePairs = partnerDiaries.map((diary) =>
    [formatYmdInTimezone(diary.date, timeZone), diary] as const,
  )

  const ownerByDate = new Map(ownerDatePairs)
  const partnerByDate = new Map(partnerDatePairs)

  const uniqueDateKeys = new Set<string>([
    ...ownerDatePairs.map(([dateKey]) => dateKey),
    ...partnerDatePairs.map(([dateKey]) => dateKey),
  ])

  return Array.from(uniqueDateKeys)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, limit)
    .map((dateKey) => ({
      dateKey,
      ownerDiary: stripAndTag(ownerByDate.get(dateKey)),
      partnerDiary: stripAndTag(partnerByDate.get(dateKey)),
    }))
}
