import { getSecEdgarService } from '~/server/utils/sec-edgar/runtime'
import { enforceSecRateLimit, handleSecApiError, secRequestLog } from '~/server/utils/sec-edgar/http'
import { batchQuerySchema, canonicalizeCik, parseAccession } from '~/server/utils/sec-edgar/validation'
import { buildBatchPackage } from '~/server/utils/sec-edgar/package'

export default defineEventHandler(async (event) => {
  const log = secRequestLog(event)
  try {
    await enforceSecRateLimit(event, 'batch')
    const query = batchQuerySchema.parse(getQuery(event))
    const cik = canonicalizeCik(query.cik)
    const accessions = query.accessions.map(value => parseAccession(value).accession)
    await buildBatchPackage(event, getSecEdgarService(), cik, accessions, query.mode)
  } catch (error) { handleSecApiError(error, log) }
})
