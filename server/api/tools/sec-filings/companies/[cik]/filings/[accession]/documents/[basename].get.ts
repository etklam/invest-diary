import { getSecEdgarService } from '~/server/utils/sec-edgar/runtime'
import { enforceSecRateLimit, handleSecApiError, secRequestLog } from '~/server/utils/sec-edgar/http'
import { responseNodeStream, safeDownloadName, SEC_LIMITS } from '~/server/utils/sec-edgar/download'

export default defineEventHandler(async (event) => {
  const log = secRequestLog(event)
  try {
    await enforceSecRateLimit(event, 'download')
    const opened = await getSecEdgarService().openDocument(getRouterParam(event, 'cik') ?? '', getRouterParam(event, 'accession') ?? '', getRouterParam(event, 'basename') ?? '')
    setResponseHeader(event, 'Content-Type', opened.response.headers.get('content-type') || 'application/octet-stream')
    setResponseHeader(event, 'Content-Disposition', `attachment; filename="${safeDownloadName(opened.document.basename)}"`)
    setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')
    if (opened.document.size) setResponseHeader(event, 'Content-Length', opened.document.size)
    return sendStream(event, responseNodeStream(opened.response, SEC_LIMITS.documentBytes))
  } catch (error) { handleSecApiError(error, log) }
})
