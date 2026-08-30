import type { Prisma } from '@prisma/client'
// Pre-serialization server records remain here because they intentionally
// depend on Prisma and never cross the client boundary.
export {
  DEFAULT_TAGS,
  DIARY_REVIEW_STATUSES,
  DIARY_SORT_FIELDS,
  diaryListParamsSchema,
  type DiaryActivityDay,
  type DiaryGroup,
  type DiaryListParams,
  type DiaryListResponse,
  type DiaryResponse,
  type DiariesApiResponse,
  type DiarySortField,
  type PaginationResponse,
  type TagKey,
  type TransactionInput,
  type AlertInput,
  type CreateDiaryRequest,
  type UpdateDiaryRequest,
  type TransactionResponse,
  type DiaryAlertResponse,
} from '~/lib/contracts/diary'
export {
  REVIEW_OUTCOMES,
  type ReviewOutcome,
  type ReviewStatus,
} from '~/lib/contracts/review'

// ---- Pre-serialization server records ----

export interface DiaryRecordTransaction {
  id: bigint
  diaryId: bigint
  userId: bigint
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: Prisma.Decimal
  price: Prisma.Decimal
  tradeDate: Date
  notes: string | null
  strategy: string | null
  emotion: string | null
  createdAt: Date
}

export interface DiaryRecordAlert {
  id: bigint
  diaryId: bigint
  message: string
  triggerAt: Date
  isDismissed: boolean
  recurringMode: 'WEEK' | 'MONTH' | null
  parentId: bigint | null
  instanceNumber: number | null
  isPaused: boolean
  createdAt: Date
}

export interface DiaryRecord {
  id: bigint
  userId: bigint
  title: string
  content: string | null
  tagsString: string | null
  createdVia: 'WEB' | 'API_KEY' | 'TELEGRAM_BOT'
  createdByLabel: string | null
  date: Date
  createdAt: Date
  updatedAt: Date
  thesis: string | null
  risk: string | null
  execution: string | null
  reviewDueAt: Date | null
  reviewStatus: string | null
  reviewedAt: Date | null
  reviewOutcome: string | null
  reviewSummary: string | null
  reviewLearning: string | null
  reviewAdjustment: string | null
  transactions?: DiaryRecordTransaction[]
  alerts?: DiaryRecordAlert[]
  stockContexts?: Array<{ stock: { symbol: string } }>
  tags?: string[]
  stockSymbols?: string[]
}
