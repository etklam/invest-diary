import { describe, expectTypeOf, it } from 'vitest'
import type alertsHandler from '~/server/api/alerts/index.get'
import type reviewsHandler from '~/server/api/reviews.get'
import type portfolioAttentionHandler from '~/server/api/portfolio/attention.get'
import type stockNotesHandler from '~/server/api/stocks/[symbol]/notes/index.get'
import type stockNoteCreateHandler from '~/server/api/stocks/[symbol]/notes/index.post'
import type recentTradesHandler from '~/server/api/stats/recent-trades.get'
import type { Serialized } from '~/server/utils/serialize'
import type { AlertApiResponse } from '~/types/alert'
import type { PortfolioAttentionResponse } from '~/types/portfolio-attention'
import type { RecentClosedTradesResponse } from '~/types/quicknote'
import type { ReviewGroups } from '~/types/reviews'
import type { StockNoteResponse, StockNotesResponse } from '~/types/stock-note'

type AsyncHandlerResult<T> = T extends (...args: never[]) => infer R ? Awaited<R> : never

describe('serialize response type contracts', () => {
  it('maps BigInt, Date, nested objects, and arrays to JSON-boundary types', () => {
    type Raw = {
      id: bigint
      createdAt: Date
      children: Array<{ id: bigint; occurredAt: Date }>
    }
    type Expected = {
      id: string
      createdAt: string
      children: Array<{ id: string; occurredAt: string }>
    }

    expectTypeOf<Serialized<Raw>>().toEqualTypeOf<Expected>()
  })

  it('pins API handlers to the existing client-facing response types', () => {
    expectTypeOf<AsyncHandlerResult<typeof alertsHandler>>().toEqualTypeOf<AlertApiResponse[]>()
    expectTypeOf<AsyncHandlerResult<typeof reviewsHandler>>().toEqualTypeOf<ReviewGroups>()
    expectTypeOf<AsyncHandlerResult<typeof portfolioAttentionHandler>>().toEqualTypeOf<PortfolioAttentionResponse>()
    expectTypeOf<AsyncHandlerResult<typeof stockNotesHandler>>().toEqualTypeOf<StockNotesResponse>()
    expectTypeOf<AsyncHandlerResult<typeof stockNoteCreateHandler>>().toEqualTypeOf<StockNoteResponse>()
    expectTypeOf<AsyncHandlerResult<typeof recentTradesHandler>>().toEqualTypeOf<RecentClosedTradesResponse>()
  })
})
