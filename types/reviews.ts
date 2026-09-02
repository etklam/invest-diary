import type { ReviewGroups } from '~/lib/contracts/review'
export type { ReviewGroups, ReviewItem } from '~/lib/contracts/review'

export const emptyReviewGroups = (): ReviewGroups => ({
  unscheduled: [],
  overdue: [],
  today: [],
  upcoming: [],
  completed: [],
})
