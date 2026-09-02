export * from './timeline-source'
import { z } from 'zod'
import { serializedIdSchema, utcInstantSchema } from '../common/ids'
import { stockTimelineSourceTypeSchema } from './timeline-source'

/** Shared symbol wire rule. Server-only route parsing delegates to this rule. */
export const stockSymbolSchema = z.string().trim().min(1).max(32)
  .regex(/^[A-Za-z0-9.]+$/, 'Symbol contains unsupported characters')
  .transform(value => value.toUpperCase())

export const stockWatchStatusSchema = z.enum(['WATCHING', 'ARCHIVED'])

export const stockTimelineRecordSchema = z.object({
  id: serializedIdSchema,
  symbol: stockSymbolSchema,
  summary: z.string(),
  sourceType: stockTimelineSourceTypeSchema,
  sourceTitle: z.string().nullable(),
  sourceUrl: z.string().url().nullable(),
  sourceDiaryId: serializedIdSchema.nullable(),
  sourceExternalId: z.string().nullable(),
  sourceExcerpt: z.string().nullable(),
  confidence: z.number().int().min(0).max(100).nullable(),
  idempotencyKey: z.string().max(128),
  occurredAt: utcInstantSchema,
  createdVia: z.enum(['API_KEY', 'WEB', 'SYSTEM']),
  createdByLabel: z.string().nullable(),
  metadataJson: z.string().nullable(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
}).strict()

export const stockTimelineQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
}).strict()

export const stockTimelineListResponseSchema = z.object({
  records: z.array(stockTimelineRecordSchema).max(200),
}).strict()

export const stockSymbolTimelineResponseSchema = z.object({
  stock: z.object({ symbol: stockSymbolSchema, name: z.string().nullable() }).strict(),
  records: z.array(stockTimelineRecordSchema).max(200),
}).strict()

export const webEvidenceRequestSchema = z.object({
  summary: z.string().trim().min(1).max(10_000),
  sourceType: stockTimelineSourceTypeSchema,
  sourceTitle: z.string().trim().max(255).nullable().optional(),
  sourceUrl: z.string().url().max(1_000).refine(value => value.startsWith('http://') || value.startsWith('https://'), {
    message: 'sourceUrl must be an http(s) URL',
  }).nullable().optional(),
  occurredAt: utcInstantSchema,
  idempotencyKey: z.string().trim().min(1).max(128).optional(),
  metadataJson: z.string().optional(),
}).strict()

export const agentTimelineRecordSchema = z.object({
  symbol: stockSymbolSchema,
  summary: z.string().trim().min(1),
  sourceType: z.enum(['TRADE_BASIC_DIARY', 'VIDEO_TRANSCRIBE_SUMMARIZE', 'DIARY', 'ARTICLE', 'MANUAL', 'SYSTEM']),
  sourceTitle: z.string().trim().max(255).optional(),
  sourceUrl: z.string().url().max(1_000).optional(),
  sourceDiaryId: serializedIdSchema.optional(),
  sourceExternalId: z.string().max(255).optional(),
  sourceExcerpt: z.string().optional(),
  confidence: z.number().int().min(0).max(100).optional(),
  idempotencyKey: z.string().trim().min(1).max(128),
  occurredAt: utcInstantSchema,
  metadataJson: z.string().optional(),
}).strict()

export const agentTimelineBatchRequestSchema = z.object({
  records: z.array(agentTimelineRecordSchema).min(1).max(100),
}).strict()

export const stockNoteCreateRequestSchema = z.object({
  title: z.string().trim().min(1).max(255),
  content: z.string().min(1).max(50_000),
  date: utcInstantSchema.optional(),
}).strict()

export const stockNoteUpdateRequestSchema = stockNoteCreateRequestSchema.partial().refine(
  value => Object.keys(value).length > 0,
  { message: 'At least one field is required' },
)

export const stockNoteResponseSchema = z.object({
  id: serializedIdSchema,
  symbol: stockSymbolSchema,
  name: z.string().nullable(),
  title: z.string(),
  content: z.string(),
  date: utcInstantSchema,
  createdVia: z.enum(['USER', 'AGENT']),
  createdByLabel: z.string().nullable(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
}).strict()

export const stockNoteListItemSchema = stockNoteResponseSchema.extend({
  isOwnedByViewer: z.boolean(),
}).strict()

export const stockNoteListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  createdVia: z.enum(['USER', 'AGENT']).optional(),
  partnerId: serializedIdSchema.optional(),
}).strict()

export const stockNoteListResponseSchema = z.object({
  data: z.array(stockNoteListItemSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }).strict(),
}).strict()

export const stockWatchlistMutationResponseSchema = z.object({
  id: serializedIdSchema,
  symbol: stockSymbolSchema,
  sortOrder: z.number().int().nonnegative(),
  status: stockWatchStatusSchema,
  updatedAt: utcInstantSchema.optional(),
}).strict()

export const stockWatchlistCreateRequestSchema = z.object({ symbol: stockSymbolSchema }).strict()
export const stockWatchlistUpdateRequestSchema = z.object({
  status: stockWatchStatusSchema.optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
}).strict().refine(value => value.status !== undefined || value.sortOrder !== undefined, {
  message: 'status or sortOrder is required',
})

export const stockWatchlistLatestRecordSchema = z.object({
  id: serializedIdSchema,
  summary: z.string(),
  occurredAt: utcInstantSchema,
  sourceType: stockTimelineSourceTypeSchema,
  sourceTitle: z.string().nullable(),
  confidence: z.number().int().min(0).max(100).nullable(),
}).strict()

export const stockWatchlistItemSchema = z.object({
  id: serializedIdSchema,
  status: stockWatchStatusSchema,
  sortOrder: z.number().int().nonnegative(),
  updatedAt: utcInstantSchema,
  stock: z.object({ symbol: stockSymbolSchema, name: z.string().nullable() }).strict(),
  recordCount: z.number().int().nonnegative(),
  latestRecord: stockWatchlistLatestRecordSchema.nullable(),
}).strict()

export const STOCK_WATCHLIST_MAX_ITEMS = 100
export const stockWatchlistResponseSchema = z.object({
  items: z.array(stockWatchlistItemSchema).max(STOCK_WATCHLIST_MAX_ITEMS),
}).strict()

export type StockTimelineRecord = z.infer<typeof stockTimelineRecordSchema>
export type StockNoteResponse = z.infer<typeof stockNoteResponseSchema>
export type StockNoteListItem = z.infer<typeof stockNoteListItemSchema>
export type StockNoteListResponse = z.infer<typeof stockNoteListResponseSchema>
export type StockWatchlistItem = z.infer<typeof stockWatchlistItemSchema>
export type StockWatchlistResponse = z.infer<typeof stockWatchlistResponseSchema>

export function toStockTimelineRecordResponse(item: {
  id: bigint
  stock: { symbol: string }
  summary: string
  sourceType: string
  sourceTitle: string | null
  sourceUrl: string | null
  sourceDiaryId: bigint | null
  sourceExternalId: string | null
  sourceExcerpt: string | null
  confidence: number | null
  idempotencyKey: string
  occurredAt: Date | string
  createdVia: string
  createdByLabel: string | null
  metadataJson: string | null
  createdAt: Date | string
  updatedAt: Date | string
}): StockTimelineRecord {
  const iso = (value: Date | string) => value instanceof Date ? value.toISOString() : new Date(value).toISOString()
  return stockTimelineRecordSchema.parse({
    id: String(item.id),
    symbol: item.stock.symbol,
    summary: item.summary,
    sourceType: item.sourceType,
    sourceTitle: item.sourceTitle,
    sourceUrl: item.sourceUrl,
    sourceDiaryId: item.sourceDiaryId === null ? null : String(item.sourceDiaryId),
    sourceExternalId: item.sourceExternalId,
    sourceExcerpt: item.sourceExcerpt,
    confidence: item.confidence,
    idempotencyKey: item.idempotencyKey,
    occurredAt: iso(item.occurredAt),
    createdVia: item.createdVia,
    createdByLabel: item.createdByLabel,
    metadataJson: item.metadataJson,
    createdAt: iso(item.createdAt),
    updatedAt: iso(item.updatedAt),
  })
}

export function toStockNoteContractResponse(item: {
  id: bigint
  title: string
  content: string
  date: Date | string
  createdVia: string
  createdByLabel: string | null
  createdAt: Date | string
  updatedAt: Date | string
  stock: { symbol: string; name: string | null }
}): StockNoteResponse {
  const iso = (value: Date | string) => value instanceof Date ? value.toISOString() : new Date(value).toISOString()
  return stockNoteResponseSchema.parse({
    id: String(item.id),
    symbol: item.stock.symbol,
    name: item.stock.name,
    title: item.title,
    content: item.content,
    date: iso(item.date),
    createdVia: item.createdVia,
    createdByLabel: item.createdByLabel,
    createdAt: iso(item.createdAt),
    updatedAt: iso(item.updatedAt),
  })
}
