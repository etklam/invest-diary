import { filingListQuerySchema } from '~/server/utils/sec-edgar/validation'
import { getSecEdgarService } from '~/server/utils/sec-edgar/runtime'
import { enforceSecRateLimit, handleSecApiError, secRequestLog } from '~/server/utils/sec-edgar/http'

export default defineEventHandler(async (event) => {
  const log = secRequestLog(event)
  try {
    await enforceSecRateLimit(event, 'metadata')
    const query = filingListQuerySchema.parse(getQuery(event))
    const forms = query.forms ? query.forms.split(',').map(value => value.trim().toUpperCase()).filter(Boolean) : []
    if (forms.length > 20) throw new (await import('~/server/utils/sec-edgar/errors')).SecProviderError('SEC_VALIDATION_ERROR', 'Too many form filters', 400)
    const result = await getSecEdgarService().listFilings(getRouterParam(event, 'cik') ?? '', { ...query, forms })
    return { data: result.value, meta: { stale: result.stale, cacheStatus: result.cacheStatus, fetchedAt: result.fetchedAt } }
  } catch (error) { handleSecApiError(error, log) }
})
