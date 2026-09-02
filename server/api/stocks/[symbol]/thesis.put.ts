import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import { saveCurrentThesis, toCurrentInvestmentThesis } from '~/server/utils/investment-thesis-queries'
import { saveInvestmentThesisRequestSchema } from '~/lib/contracts/investment-thesis'
import { currentInvestmentThesisSchema } from '~/lib/contracts/investment-thesis'
import { parseSymbolParam } from '~/lib/stocks/symbols'
import { stockSymbolSchema } from '~/lib/contracts/stocks'

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)
  setHeader(event, 'Cache-Control', 'no-store')

  try {
    const symbol = stockSymbolSchema.parse(parseSymbolParam(event))
    const body = saveInvestmentThesisRequestSchema.parse(await readBody(event))
    const thesis = await saveCurrentThesis({
      userId: BigInt(user.id),
      symbol,
      draft: body,
      status: body.status,
    })
    return { thesis: currentInvestmentThesisSchema.parse(toCurrentInvestmentThesis(thesis)) }
  } catch (error) {
    handleApiError(error, log)
  }
})
