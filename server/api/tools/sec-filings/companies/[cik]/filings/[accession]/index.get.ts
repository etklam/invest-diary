import { getSecEdgarService } from '~/server/utils/sec-edgar/runtime'
import { enforceSecRateLimit, handleSecApiError, secRequestLog } from '~/server/utils/sec-edgar/http'

export default defineEventHandler(async (event) => {
  const log = secRequestLog(event)
  try {
    await enforceSecRateLimit(event, 'metadata')
    const result = await getSecEdgarService().getFilingDetail(getRouterParam(event, 'cik') ?? '', getRouterParam(event, 'accession') ?? '')
    return { data: result.value, meta: { stale: result.stale, cacheStatus: result.cacheStatus, fetchedAt: result.fetchedAt } }
  } catch (error) { handleSecApiError(error, log) }
})
