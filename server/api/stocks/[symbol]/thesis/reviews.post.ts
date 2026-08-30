import { z } from 'zod'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import {
  completeThesisReview,
  toCurrentInvestmentThesis,
  toThesisReviewRecord,
} from '~/server/utils/investment-thesis-queries'
import { THESIS_PORTFOLIO_DECISIONS, THESIS_REVIEW_OUTCOMES } from '~/types/investment-thesis'
import { normalizeStockSymbol, parseSymbolParam, symbolSchema } from '~/lib/stocks/symbols'

const optionalReflection = z.string().trim().max(20000).nullable().optional()
const requestSchema = z.object({
  outcome: z.enum(THESIS_REVIEW_OUTCOMES),
  portfolioDecision: z.enum(THESIS_PORTFOLIO_DECISIONS),
  whatImproved: optionalReflection,
  whatDeteriorated: optionalReflection,
  whatChanged: optionalReflection,
  invalidationTriggered: z.boolean().optional(),
}).superRefine((value, context) => {
  if ([value.whatImproved, value.whatDeteriorated, value.whatChanged].some(text => text?.trim())) return
  context.addIssue({ code: 'custom', path: ['whatChanged'], message: 'At least one meaningful reflection is required' })
})

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)
  setHeader(event, 'Cache-Control', 'no-store')

  try {
    const symbol = normalizeStockSymbol(symbolSchema.parse(parseSymbolParam(event)))
    const reviewInput = requestSchema.parse(await readBody(event))
    const result = await completeThesisReview({
      userId: BigInt(user.id),
      symbol,
      review: reviewInput,
    })
    return {
      thesis: toCurrentInvestmentThesis(result.current),
      review: toThesisReviewRecord(result.review),
    }
  } catch (error) {
    handleApiError(error, log)
  }
})
