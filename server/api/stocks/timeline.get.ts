import { z } from 'zod'
import { requireUser } from '~/server/utils/auth'
import { listUserTimeline, toTimelineResponseItem } from '~/server/utils/stock-timeline-records'
import { logger } from '~/lib/logger'

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
})

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)
  const query = querySchema.parse(getQuery(event))
  const records = await listUserTimeline(user.id, query.limit)
  return {
    records: records.map(toTimelineResponseItem),
  }
})
