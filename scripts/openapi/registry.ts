import { z } from 'zod'
import { createDocument, type ZodOpenApiOverride } from 'zod-openapi'
import {
  authMutationResponseSchema,
  authUserResponseSchema,
  loginRequestSchema,
  nativeAuthResponseSchema,
  nativeLoginRequestSchema,
  nativeLogoutRequestSchema,
  nativeRefreshRequestSchema,
  registerRequestSchema,
  registerResponseSchema,
} from '../../lib/contracts/auth'
import {
  apiErrorResponseSchema as commonApiErrorResponseSchema,
  serializedIdSchema,
} from '../../lib/contracts/common'
import {
  investmentActivityQuerySchema,
  investmentActivityResponseSchema,
} from '../../lib/contracts/activity'
import {
  createDiaryRequestSchema,
  diaryListParamsSchema,
  diaryListResponseSchema,
  diaryResponseSchema,
  updateDiaryRequestSchema,
} from '../../lib/contracts/diary'
import { structuredReviewInputSchema, diaryReviewResponseSchema } from '../../lib/contracts/review'
import {
  completeThesisReviewRequestSchema,
  investmentThesisMutationResponseSchema,
  investmentThesisResponseSchema,
  saveInvestmentThesisRequestSchema,
  thesisReviewListParamsSchema,
  thesisReviewResponseSchema,
} from '../../lib/contracts/investment-thesis'
import { companyHubResponseSchema } from '../../lib/contracts/company-hub'
import {
  tradePlanInputSchema,
  tradePlanListParamsSchema,
  tradePlanListResponseSchema,
  tradePlanResponseSchema,
  tradePlanUpdateSchema,
} from '../../lib/contracts/trade-plan'
import {
  alertCreateRequestSchema,
  alertListResponseSchema,
  alertResponseSchema,
  createPriceAlertRequestSchema,
  priceAlertListResponseSchema,
  priceAlertResponseSchema,
  updatePriceAlertRequestSchema,
} from '../../lib/contracts/alerts'
import {
  marketRotationMonitorQuerySchema,
  marketRotationMonitorResponseSchema,
  marketStateHistoryQuerySchema,
  marketStateHistoryResponseSchema,
  marketStateSnapshotResponseSchema,
} from '../../lib/contracts/market'
import {
  portfolioAttentionResponseSchema,
  portfolioHoldingsResponseSchema,
  portfolioValuationResponseSchema,
} from '../../lib/contracts/portfolio'
import {
  agentTimelineBatchRequestSchema,
  stockNoteCreateRequestSchema,
  stockNoteResponseSchema,
  stockNoteUpdateRequestSchema,
  stockNoteListItemSchema,
  stockNoteListParamsSchema,
  stockNoteListResponseSchema,
  stockSymbolSchema,
  stockSymbolTimelineResponseSchema,
  stockTimelineListResponseSchema,
  stockTimelineRecordSchema,
  stockTimelineQuerySchema,
  stockWatchlistCreateRequestSchema,
  stockWatchlistMutationResponseSchema,
  stockWatchlistResponseSchema,
  stockWatchlistUpdateRequestSchema,
  webEvidenceRequestSchema,
} from '../../lib/contracts/stocks'

const apiErrorRef = { $ref: '#/components/schemas/ApiErrorResponse' } as const

const authenticated = [{ bearerAuth: [] }, { accessTokenCookie: [] }] as const

const errorResponses = {
  '400': {
    description: 'Validation error',
    content: { 'application/json': { schema: apiErrorRef } },
  },
  '401': {
    description: 'Authentication required or invalid credentials',
    content: { 'application/json': { schema: apiErrorRef } },
  },
  '403': {
    description: 'Authenticated but not allowed',
    content: { 'application/json': { schema: apiErrorRef } },
  },
  '404': {
    description: 'Resource not found or ownership is hidden',
    content: { 'application/json': { schema: apiErrorRef } },
  },
  '409': {
    description: 'Conflict',
    content: { 'application/json': { schema: apiErrorRef } },
  },
  '429': {
    description: 'Rate limited',
    content: { 'application/json': { schema: apiErrorRef } },
  },
  '500': {
    description: 'Unexpected server error',
    content: { 'application/json': { schema: apiErrorRef } },
  },
} as const

function withErrors<T extends Record<string, unknown>>(
  response: T,
  statuses: readonly (keyof typeof errorResponses)[] = ['400', '401', '404', '409', '429', '500'],
) {
  return Object.fromEntries([
    ...Object.entries(response),
    ...statuses.map(status => [status, errorResponses[status]]),
  ])
}

function jsonResponse(schema: unknown, description = 'Success') {
  return {
    description,
    content: { 'application/json': { schema } },
  }
}

const agentTimelineResultSchema = z.object({
  created: z.array(serializedIdSchema),
  updated: z.array(serializedIdSchema),
  skipped: z.array(z.object({
    symbol: stockSymbolSchema,
    reason: z.string(),
  }).strict()),
}).strict()

const successResponseSchema = z.object({ success: z.literal(true) }).strict()

/**
 * z.coerce.number() is correct at runtime but otherwise renders as an integer
 * query parameter. Query values arrive on the wire as strings, so retain the
 * coercion semantics as vendor metadata while making the generated client
 * accept the actual wire type. JSON request-body numbers are intentionally not
 * changed: this override only applies to schemas marked as coercing numbers in
 * a request-parameter context.
 */
const wireFaithfulOverride: ZodOpenApiOverride = ({ jsonSchema, zodSchema, io, path }) => {
  const def = zodSchema._zod.def

  const isQueryParameter = path.some(segment => typeof segment === 'string' && segment.includes('requestParams > query'))
  const numberDef = def.type === 'number'
    ? def
    : def.type === 'default' && def.innerType._zod.def.type === 'number'
      ? def.innerType._zod.def
      : null
  const isCoercedNumber = numberDef?.coerce === true
  if (isCoercedNumber && io === 'input' && isQueryParameter) {
    const minimum = typeof jsonSchema.minimum === 'number' ? jsonSchema.minimum : undefined
    const maximum = typeof jsonSchema.maximum === 'number' ? jsonSchema.maximum : undefined
    const defaultValue = jsonSchema.default
    const checks = (numberDef.checks ?? []) as Array<{ isInt?: boolean; def?: { format?: string } }>
    const isInteger = checks.some(check => check.isInt === true || check.def?.format === 'safeint')
    jsonSchema.type = 'string'
    jsonSchema.pattern = isInteger ? '^-?\\d+$' : '^-?\\d+(?:\\.\\d+)?$'
    if (defaultValue !== undefined) jsonSchema.default = String(defaultValue)
    delete jsonSchema.minimum
    delete jsonSchema.maximum
    if (minimum !== undefined) jsonSchema['x-wire-minimum'] = minimum
    if (maximum !== undefined) jsonSchema['x-wire-maximum'] = maximum
    jsonSchema['x-wire-coerces-to'] = isInteger ? 'integer' : 'number'
  }

  // Zod transforms have no JSON Schema output by design. The public symbol
  // transform is normalization-only and has the same string wire shape on
  // input/output; render its input constraints for response/client fidelity.
  if (def.type === 'pipe' && io === 'output') {
    Object.assign(jsonSchema, z.toJSONSchema(def.in, { io: 'input', unrepresentable: 'any' }))
  }
}

export const openApiDocument = createDocument({
  openapi: '3.1.0',
  info: {
    title: 'Diary API',
    version: '1.0.0',
    description: 'Stable authenticated API contracts for the Diary application.',
  },
  servers: [{ url: '/api', description: 'Diary API base path' }],
  tags: [
    { name: 'Auth' },
    { name: 'Diaries' },
    { name: 'Thesis' },
    { name: 'Trade Plans' },
    { name: 'Alerts' },
    { name: 'Stocks' },
    { name: 'Timeline' },
    { name: 'Portfolio' },
    { name: 'Market' },
  ],
  components: {
    schemas: {
      ApiErrorResponse: commonApiErrorResponseSchema,
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT or API key',
        description: 'Native access JWT or scoped agent API key.',
      },
      accessTokenCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'access-token',
        description: 'Browser access-token cookie.',
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        operationId: 'authRegister',
        summary: 'Register a user',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: registerRequestSchema } },
        },
        responses: withErrors({ '200': jsonResponse(registerResponseSchema, 'Account created') }, ['400', '409', '429', '500']),
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        operationId: 'authLogin',
        summary: 'Create a browser session',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: loginRequestSchema } },
        },
        responses: withErrors({ '200': jsonResponse(authUserResponseSchema, 'Logged in') }, ['400', '401', '429', '500']),
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        operationId: 'authMe',
        summary: 'Get the current user',
        security: authenticated,
        responses: withErrors({ '200': jsonResponse(authUserResponseSchema) }, ['401', '404', '500']),
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        operationId: 'authLogout',
        summary: 'Clear the browser session',
        security: authenticated,
        responses: { '200': jsonResponse(authMutationResponseSchema, 'Logged out') },
      },
    },
    '/auth/logout-all': {
      post: {
        tags: ['Auth'],
        operationId: 'authLogoutAll',
        summary: 'Revoke all sessions for the current user',
        security: authenticated,
        responses: withErrors({ '200': jsonResponse(authMutationResponseSchema, 'All sessions revoked') }, ['401', '403', '500']),
      },
    },
    '/auth/native/login': {
      post: {
        tags: ['Auth'],
        operationId: 'nativeLogin',
        summary: 'Create a native session',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: nativeLoginRequestSchema } },
        },
        responses: withErrors({ '200': jsonResponse(nativeAuthResponseSchema, 'Native session created') }, ['400', '401', '429', '500']),
      },
    },
    '/auth/native/refresh': {
      post: {
        tags: ['Auth'],
        operationId: 'nativeRefresh',
        summary: 'Rotate a native refresh token',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: nativeRefreshRequestSchema } },
        },
        responses: withErrors({ '200': jsonResponse(nativeAuthResponseSchema, 'Native session refreshed') }, ['400', '401', '429', '500']),
      },
    },
    '/auth/native/logout': {
      post: {
        tags: ['Auth'],
        operationId: 'nativeLogout',
        summary: 'Revoke a native session family',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: nativeLogoutRequestSchema } },
        },
        responses: withErrors({ '200': jsonResponse(authMutationResponseSchema, 'Native session revoked') }, ['400', '401', '500']),
      },
    },
    '/diaries': {
      get: {
        tags: ['Diaries'],
        operationId: 'diariesList',
        summary: 'List diaries',
        security: authenticated,
        requestParams: { query: diaryListParamsSchema },
        responses: withErrors({ '200': jsonResponse(diaryListResponseSchema) }, ['400', '401', '429', '500']),
      },
      post: {
        tags: ['Diaries'],
        operationId: 'diariesCreate',
        summary: 'Create a diary',
        security: authenticated,
        requestBody: {
          required: true,
          content: { 'application/json': { schema: createDiaryRequestSchema } },
        },
        responses: withErrors({ '200': jsonResponse(diaryResponseSchema, 'Diary created') }, ['400', '401', '409', '429', '500']),
      },
    },
    '/diaries/{id}': {
      get: {
        tags: ['Diaries'],
        operationId: 'diariesGet',
        summary: 'Get one diary',
        security: authenticated,
        requestParams: { path: z.object({ id: serializedIdSchema }).strict() },
        responses: withErrors({ '200': jsonResponse(diaryResponseSchema) }, ['400', '401', '404', '429', '500']),
      },
      put: {
        tags: ['Diaries'],
        operationId: 'diariesUpdate',
        summary: 'Update one diary',
        security: authenticated,
        requestParams: { path: z.object({ id: serializedIdSchema }).strict() },
        requestBody: {
          required: true,
          content: { 'application/json': { schema: updateDiaryRequestSchema } },
        },
        responses: withErrors({ '200': jsonResponse(diaryResponseSchema, 'Diary updated') }, ['400', '401', '404', '409', '429', '500']),
      },
    },
    '/diaries/{id}/review': {
      get: {
        tags: ['Diaries'],
        operationId: 'diariesReviewGet',
        summary: 'Get a diary review',
        security: authenticated,
        requestParams: { path: z.object({ id: serializedIdSchema }).strict() },
        responses: withErrors({ '200': jsonResponse(diaryReviewResponseSchema) }, ['400', '401', '404', '429', '500']),
      },
      patch: {
        tags: ['Diaries'],
        operationId: 'diariesReview',
        summary: 'Save a diary review',
        security: authenticated,
        requestParams: { path: z.object({ id: serializedIdSchema }).strict() },
        requestBody: {
          required: true,
          content: { 'application/json': { schema: structuredReviewInputSchema } },
        },
        responses: withErrors({ '200': jsonResponse(diaryReviewResponseSchema, 'Diary review saved') }, ['400', '401', '404', '429', '500']),
      },
    },
    '/stocks/{symbol}/hub': {
      get: {
        tags: ['Stocks'],
        operationId: 'stocksGet',
        summary: 'Get a company hub',
        security: authenticated,
        requestParams: { path: z.object({ symbol: stockSymbolSchema }).strict() },
        responses: withErrors({ '200': jsonResponse(companyHubResponseSchema) }, ['400', '401', '404', '500']),
      },
    },
    '/stocks/{symbol}/thesis': {
      get: {
        tags: ['Thesis'],
        operationId: 'thesisGet',
        summary: 'Get an investment thesis and recent reviews',
        security: authenticated,
        requestParams: {
          path: z.object({ symbol: stockSymbolSchema }).strict(),
          query: thesisReviewListParamsSchema,
        },
        responses: withErrors({ '200': jsonResponse(investmentThesisResponseSchema) }, ['400', '401', '500']),
      },
      put: {
        tags: ['Thesis'],
        operationId: 'thesisSave',
        summary: 'Save an investment thesis',
        security: authenticated,
        requestParams: { path: z.object({ symbol: stockSymbolSchema }).strict() },
        requestBody: {
          required: true,
          content: { 'application/json': { schema: saveInvestmentThesisRequestSchema } },
        },
        responses: withErrors({ '200': jsonResponse(investmentThesisMutationResponseSchema, 'Thesis saved') }, ['400', '401', '404', '409', '500']),
      },
    },
    '/stocks/{symbol}/thesis/reviews': {
      post: {
        tags: ['Thesis'],
        operationId: 'thesisReview',
        summary: 'Append a thesis review',
        security: authenticated,
        requestParams: { path: z.object({ symbol: stockSymbolSchema }).strict() },
        requestBody: {
          required: true,
          content: { 'application/json': { schema: completeThesisReviewRequestSchema } },
        },
        responses: withErrors({ '200': jsonResponse(thesisReviewResponseSchema, 'Thesis review created') }, ['400', '401', '404', '409', '500']),
      },
    },
    '/trade-plans': {
      get: {
        tags: ['Trade Plans'],
        operationId: 'tradePlansList',
        summary: 'List trade plans',
        security: authenticated,
        requestParams: { query: tradePlanListParamsSchema },
        responses: withErrors({ '200': jsonResponse(tradePlanListResponseSchema) }, ['400', '401', '500']),
      },
      post: {
        tags: ['Trade Plans'],
        operationId: 'tradePlansCreate',
        summary: 'Create a trade plan',
        security: authenticated,
        requestBody: {
          required: true,
          content: { 'application/json': { schema: tradePlanInputSchema } },
        },
        responses: withErrors({ '200': jsonResponse(tradePlanResponseSchema, 'Trade plan created') }, ['400', '401', '404', '409', '500']),
      },
    },
    '/trade-plans/{id}': {
      get: {
        tags: ['Trade Plans'],
        operationId: 'tradePlansGet',
        summary: 'Get one trade plan',
        security: authenticated,
        requestParams: { path: z.object({ id: serializedIdSchema }).strict() },
        responses: withErrors({ '200': jsonResponse(tradePlanResponseSchema) }, ['400', '401', '404', '500']),
      },
      put: {
        tags: ['Trade Plans'],
        operationId: 'tradePlansUpdate',
        summary: 'Update one trade plan',
        security: authenticated,
        requestParams: { path: z.object({ id: serializedIdSchema }).strict() },
        requestBody: {
          required: true,
          content: { 'application/json': { schema: tradePlanUpdateSchema } },
        },
        responses: withErrors({ '200': jsonResponse(tradePlanResponseSchema, 'Trade plan updated') }, ['400', '401', '404', '409', '500']),
      },
    },
    '/alerts': {
      get: {
        tags: ['Alerts'],
        operationId: 'alertsList',
        summary: 'List active diary alerts',
        security: authenticated,
        responses: withErrors({ '200': jsonResponse(alertListResponseSchema) }, ['401', '500']),
      },
      post: {
        tags: ['Alerts'],
        operationId: 'alertsCreate',
        summary: 'Create a diary alert',
        security: authenticated,
        requestBody: {
          required: true,
          content: { 'application/json': { schema: alertCreateRequestSchema } },
        },
        responses: withErrors({ '200': jsonResponse(alertResponseSchema.nullable(), 'Alert created') }, ['400', '401', '404', '409', '500']),
      },
    },
    '/alerts/{id}/dismiss': {
      put: {
        tags: ['Alerts'],
        operationId: 'alertsDismiss',
        summary: 'Dismiss a diary alert',
        security: authenticated,
        requestParams: { path: z.object({ id: serializedIdSchema }).strict() },
        responses: withErrors({ '200': jsonResponse(alertResponseSchema, 'Alert dismissed') }, ['400', '401', '404', '500']),
      },
    },
    '/stocks/alerts': {
      get: {
        tags: ['Alerts'],
        operationId: 'priceAlertsList',
        summary: 'List price alerts',
        security: authenticated,
        responses: withErrors({ '200': jsonResponse(priceAlertListResponseSchema) }, ['401', '500']),
      },
      post: {
        tags: ['Alerts'],
        operationId: 'priceAlertsCreate',
        summary: 'Create a price alert',
        security: authenticated,
        requestBody: {
          required: true,
          content: { 'application/json': { schema: createPriceAlertRequestSchema } },
        },
        responses: withErrors({ '200': jsonResponse(priceAlertResponseSchema, 'Price alert created') }, ['400', '401', '409', '500']),
      },
    },
    '/stocks/alerts/{id}': {
      put: {
        tags: ['Alerts'],
        operationId: 'priceAlertsUpdate',
        summary: 'Update a price alert',
        security: authenticated,
        requestParams: { path: z.object({ id: serializedIdSchema }).strict() },
        requestBody: {
          required: true,
          content: { 'application/json': { schema: updatePriceAlertRequestSchema } },
        },
        responses: withErrors({ '200': jsonResponse(priceAlertResponseSchema, 'Price alert updated') }, ['400', '401', '404', '500']),
      },
      delete: {
        tags: ['Alerts'],
        operationId: 'priceAlertsDelete',
        summary: 'Delete a price alert',
        security: authenticated,
        requestParams: { path: z.object({ id: serializedIdSchema }).strict() },
        responses: withErrors({ '200': jsonResponse(successResponseSchema, 'Price alert deleted') }, ['400', '401', '404', '500']),
      },
    },
    '/portfolio/attention': {
      get: {
        tags: ['Portfolio'],
        operationId: 'portfolioAttention',
        summary: 'List portfolio attention items',
        security: authenticated,
        responses: withErrors({ '200': jsonResponse(portfolioAttentionResponseSchema) }, ['400', '401', '500']),
      },
    },
    '/stocks/holdings': {
      get: {
        tags: ['Portfolio'],
        operationId: 'portfolioHoldings',
        summary: 'List transaction-derived holdings',
        security: authenticated,
        responses: withErrors({ '200': jsonResponse(portfolioHoldingsResponseSchema) }, ['401', '500']),
      },
    },
    '/stocks/portfolio': {
      get: {
        tags: ['Portfolio'],
        operationId: 'portfolioValuation',
        summary: 'Get the portfolio valuation projection',
        security: authenticated,
        responses: withErrors({ '200': jsonResponse(portfolioValuationResponseSchema) }, ['401', '500']),
      },
    },
    '/market/rotation-monitor': {
      get: {
        tags: ['Market'],
        operationId: 'marketRotationMonitor',
        summary: 'Get the market rotation monitor',
        requestParams: { query: marketRotationMonitorQuerySchema },
        responses: withErrors({ '200': jsonResponse(marketRotationMonitorResponseSchema) }, ['400', '404', '500']),
      },
    },
    '/market/state/snapshot': {
      get: {
        tags: ['Market'],
        operationId: 'marketStateSnapshot',
        summary: 'Get the latest market state snapshot',
        responses: withErrors({ '200': jsonResponse(marketStateSnapshotResponseSchema) }, ['404', '500']),
      },
    },
    '/market/state/history': {
      get: {
        tags: ['Market'],
        operationId: 'marketStateHistory',
        summary: 'Get market state history',
        requestParams: { query: marketStateHistoryQuerySchema },
        responses: withErrors({ '200': jsonResponse(marketStateHistoryResponseSchema) }, ['400', '500']),
      },
    },
    '/stocks/timeline': {
      get: {
        tags: ['Timeline'],
        operationId: 'timelineList',
        summary: 'List stock timeline records',
        security: authenticated,
        requestParams: { query: stockTimelineQuerySchema },
        responses: withErrors({ '200': jsonResponse(stockTimelineListResponseSchema) }, ['400', '401', '500']),
      },
    },
    '/investment-activity': {
      get: {
        tags: ['Timeline'],
        operationId: 'investmentActivityList',
        summary: 'List merged investment activity',
        security: authenticated,
        requestParams: { query: investmentActivityQuerySchema },
        responses: withErrors({ '200': jsonResponse(investmentActivityResponseSchema) }, ['400', '401', '500']),
      },
    },
    '/stocks/{symbol}/timeline': {
      get: {
        tags: ['Timeline'],
        operationId: 'timelineListBySymbol',
        summary: 'List stock timeline records for a symbol',
        security: authenticated,
        requestParams: {
          path: z.object({ symbol: stockSymbolSchema }).strict(),
          query: stockTimelineQuerySchema,
        },
        responses: withErrors({ '200': jsonResponse(stockSymbolTimelineResponseSchema) }, ['400', '401', '404', '500']),
      },
    },
    '/stocks/{symbol}/evidence': {
      post: {
        tags: ['Timeline'],
        operationId: 'timelineEvidenceCreate',
        summary: 'Create stock evidence',
        security: authenticated,
        requestParams: { path: z.object({ symbol: stockSymbolSchema }).strict() },
        requestBody: {
          required: true,
          content: { 'application/json': { schema: webEvidenceRequestSchema } },
        },
        responses: withErrors({ '200': jsonResponse(stockTimelineRecordSchema, 'Evidence created') }, ['400', '401', '404', '409', '500']),
      },
    },
    '/stocks/{symbol}/notes': {
      get: {
        tags: ['Stocks'],
        operationId: 'stockNotesList',
        summary: 'List stock notes',
        security: authenticated,
        requestParams: {
          path: z.object({ symbol: stockSymbolSchema }).strict(),
          query: stockNoteListParamsSchema,
        },
        responses: withErrors({ '200': jsonResponse(stockNoteListResponseSchema) }, ['400', '401', '404', '500']),
      },
      post: {
        tags: ['Stocks'],
        operationId: 'stockNotesCreate',
        summary: 'Create a stock note',
        security: authenticated,
        requestParams: { path: z.object({ symbol: stockSymbolSchema }).strict() },
        requestBody: {
          required: true,
          content: { 'application/json': { schema: stockNoteCreateRequestSchema } },
        },
        responses: withErrors({ '200': jsonResponse(stockNoteListItemSchema, 'Stock note created') }, ['400', '401', '404', '500']),
      },
    },
    '/stocks/{symbol}/notes/{id}': {
      put: {
        tags: ['Stocks'],
        operationId: 'stockNotesUpdate',
        summary: 'Update a stock note',
        security: authenticated,
        requestParams: { path: z.object({ symbol: stockSymbolSchema, id: serializedIdSchema }).strict() },
        requestBody: {
          required: true,
          content: { 'application/json': { schema: stockNoteUpdateRequestSchema } },
        },
        responses: withErrors({ '200': jsonResponse(stockNoteResponseSchema, 'Stock note updated') }, ['400', '401', '404', '500']),
      },
      delete: {
        tags: ['Stocks'],
        operationId: 'stockNotesDelete',
        summary: 'Delete a stock note',
        security: authenticated,
        requestParams: { path: z.object({ symbol: stockSymbolSchema, id: serializedIdSchema }).strict() },
        responses: withErrors({ '200': jsonResponse(successResponseSchema, 'Stock note deleted') }, ['400', '401', '404', '500']),
      },
    },
    '/stocks/watchlist': {
      get: {
        tags: ['Stocks'],
        operationId: 'watchlistList',
        summary: 'List the stock watchlist',
        security: authenticated,
        responses: withErrors({ '200': jsonResponse(stockWatchlistResponseSchema) }, ['401', '500']),
      },
      post: {
        tags: ['Stocks'],
        operationId: 'watchlistCreate',
        summary: 'Add a stock to the watchlist',
        security: authenticated,
        requestBody: {
          required: true,
          content: { 'application/json': { schema: stockWatchlistCreateRequestSchema } },
        },
        responses: withErrors({ '200': jsonResponse(stockWatchlistMutationResponseSchema, 'Watchlist item created') }, ['400', '401', '409', '500']),
      },
    },
    '/stocks/watchlist/{id}': {
      patch: {
        tags: ['Stocks'],
        operationId: 'watchlistUpdate',
        summary: 'Update a watchlist item',
        security: authenticated,
        requestParams: { path: z.object({ id: serializedIdSchema }).strict() },
        requestBody: {
          required: true,
          content: { 'application/json': { schema: stockWatchlistUpdateRequestSchema } },
        },
        responses: withErrors({ '200': jsonResponse(stockWatchlistMutationResponseSchema, 'Watchlist item updated') }, ['400', '401', '404', '500']),
      },
      delete: {
        tags: ['Stocks'],
        operationId: 'watchlistDelete',
        summary: 'Remove a stock from the watchlist',
        security: authenticated,
        requestParams: { path: z.object({ id: serializedIdSchema }).strict() },
        responses: withErrors({ '200': jsonResponse(successResponseSchema, 'Watchlist item removed') }, ['400', '401', '404', '500']),
      },
    },
    '/agent/stocks/records': {
      post: {
        tags: ['Timeline'],
        operationId: 'agentTimelineRecordsCreate',
        summary: 'Write stock timeline records with an API key',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: agentTimelineBatchRequestSchema } },
        },
        responses: withErrors({ '200': jsonResponse(agentTimelineResultSchema, 'Records processed') }, ['400', '401', '403', '500']),
      },
    },
  },
}, {
  override: wireFaithfulOverride,
})
