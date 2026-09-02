import { requireUser } from '~/server/utils/auth'
import { listUserTimeline, toTimelineResponseItem } from '~/server/utils/stock-timeline-queries'
import { stockTimelineListResponseSchema, stockTimelineQuerySchema } from '~/lib/contracts/stocks'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const query = stockTimelineQuerySchema.parse(getQuery(event))
  const records = await listUserTimeline(user.id, query.limit)
  return stockTimelineListResponseSchema.parse({
    records: records.map(toTimelineResponseItem),
  })
})
