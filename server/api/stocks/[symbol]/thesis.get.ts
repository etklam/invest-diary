import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import {
  findCurrentThesisBySymbol,
  listThesisReviews,
  toCurrentInvestmentThesis,
  toThesisReviewRecord,
} from '~/server/utils/investment-thesis-queries'

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)
  setHeader(event, 'Cache-Control', 'no-store')

  try {
    const symbol = decodeURIComponent(String(event.context.params?.symbol ?? ''))
    const thesis = await findCurrentThesisBySymbol(BigInt(user.id), symbol)
    if (!thesis) return { thesis: null, reviews: [] }
    const reviews = await listThesisReviews(BigInt(user.id), thesis.id)
    return {
      thesis: toCurrentInvestmentThesis(thesis),
      reviews: (reviews ?? []).map(toThesisReviewRecord),
    }
  } catch (error) {
    handleApiError(error, log)
  }
})
