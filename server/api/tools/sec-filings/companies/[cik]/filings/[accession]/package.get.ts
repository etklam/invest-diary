import { getSecEdgarService } from '~/server/utils/sec-edgar/runtime'
import { enforceSecRateLimit, handleSecApiError, secRequestLog } from '~/server/utils/sec-edgar/http'
import { buildSingleFilingPackage } from '~/server/utils/sec-edgar/package'

export default defineEventHandler(async (event) => {
  const log = secRequestLog(event)
  try {
    await enforceSecRateLimit(event, 'package')
    const raw = getQuery(event).include
    const includes = (Array.isArray(raw) ? raw : raw ? [raw] : []).map(String)
    const allowed = new Set(['all', 'primary', 'complete', 'xbrl', 'exhibits', 'pdf'])
    if (includes.some(value => !allowed.has(value))) throw new (await import('~/server/utils/sec-edgar/errors')).SecProviderError('SEC_VALIDATION_ERROR', 'Invalid package selection', 400)
    await buildSingleFilingPackage(event, getSecEdgarService(), getRouterParam(event, 'cik') ?? '', getRouterParam(event, 'accession') ?? '', includes)
  } catch (error) { handleSecApiError(error, log) }
})
