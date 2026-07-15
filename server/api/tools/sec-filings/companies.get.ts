import { companySearchQuerySchema } from '~/server/utils/sec-edgar/validation'
import { getSecEdgarService } from '~/server/utils/sec-edgar/runtime'
import { enforceSecRateLimit, handleSecApiError, secRequestLog } from '~/server/utils/sec-edgar/http'

export default defineEventHandler(async (event) => {
  const log = secRequestLog(event)
  try {
    await enforceSecRateLimit(event, 'metadata')
    const query = companySearchQuerySchema.parse(getQuery(event))
    const result = await getSecEdgarService().searchCompanies(query.q, query.limit)
    return { data: result.value, meta: { stale: result.stale, cacheStatus: result.cacheStatus, fetchedAt: result.fetchedAt } }
  } catch (error) { handleSecApiError(error, log) }
})
