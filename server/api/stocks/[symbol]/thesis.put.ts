import { z } from 'zod'
import { Errors } from '~/lib/errors/factory'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import { saveCurrentThesis, toCurrentInvestmentThesis } from '~/server/utils/investment-thesis-queries'
import { INVESTMENT_THESIS_STATUSES } from '~/types/investment-thesis'

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional()
const requestSchema = z.object({
  status: z.enum(INVESTMENT_THESIS_STATUSES).optional(),
  summary: optionalText(10000),
  whyIOwnIt: optionalText(20000),
  growthDrivers: optionalText(20000),
  risks: optionalText(20000),
  invalidationConditions: optionalText(20000),
  expectedHoldingPeriod: optionalText(255),
  reviewDueAt: z.string().datetime().nullable().optional(),
}).superRefine((value, context) => {
  // Single authority for the "ACTIVE thesis requires summary/whyIOwnIt" rule —
  // saveCurrentThesis is full-replace and does not re-validate against persisted values.
  if (value.status !== 'ACTIVE') return
  if (!value.summary?.trim()) context.addIssue({ code: 'custom', path: ['summary'], message: 'Summary is required to activate a Thesis' })
  if (!value.whyIOwnIt?.trim()) context.addIssue({ code: 'custom', path: ['whyIOwnIt'], message: 'Why I own it is required to activate a Thesis' })
})

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)
  setHeader(event, 'Cache-Control', 'no-store')

  try {
    const symbol = decodeURIComponent(String(event.context.params?.symbol ?? ''))
    if (!symbol.trim()) throw Errors.validationError([{ field: 'symbol', message: 'symbol is required' }])
    const body = requestSchema.parse(await readBody(event))
    const thesis = await saveCurrentThesis({
      userId: BigInt(user.id),
      symbol,
      draft: body,
      status: body.status,
    })
    return { thesis: toCurrentInvestmentThesis(thesis) }
  } catch (error) {
    handleApiError(error, log)
  }
})
