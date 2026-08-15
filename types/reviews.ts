import type { ReviewBuckets, ReviewItem as ServerReviewItem } from '~/server/utils/diary-read'
import type { SerializedId } from '~/types/common'

/** JSON shape returned by /api/reviews after server serialization. */
export type ReviewItem = Omit<ServerReviewItem, 'id' | 'date' | 'reviewDueAt' | 'reviewedAt' | 'thesisId'> & {
  id: SerializedId
  date: string
  reviewDueAt: string | null
  reviewedAt: string | null
  thesisId?: SerializedId
}

export type ReviewGroups = {
  [K in keyof ReviewBuckets]: ReviewItem[]
}

export const emptyReviewGroups = (): ReviewGroups => ({
  unscheduled: [],
  overdue: [],
  today: [],
  upcoming: [],
  completed: [],
})
