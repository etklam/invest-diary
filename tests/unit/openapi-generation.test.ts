import { describe, expect, it } from 'vitest'
import { openApiDocument } from '~/scripts/openapi/registry'

describe('OpenAPI contract artifact', () => {
  const document = openApiDocument as {
    openapi: string
    paths: Record<string, Record<string, { parameters?: Array<{ name: string; schema?: Record<string, unknown> }> }>>
  }

  it('is OpenAPI 3.1 and contains the frozen core resource paths', () => {
    expect(document.openapi).toBe('3.1.0')
    expect(Object.keys(document.paths)).toEqual(expect.arrayContaining([
      '/auth/login',
      '/auth/me',
      '/diaries',
      '/diaries/{id}',
      '/diaries/{id}/review',
      '/stocks/{symbol}/hub',
      '/stocks/{symbol}/thesis',
      '/trade-plans',
      '/alerts',
      '/stocks/alerts',
      '/investment-activity',
    ]))
  })

  it('documents diary query values as wire strings while preserving defaults and limits', () => {
    const parameters = document.paths['/diaries']?.get?.parameters ?? []
    const page = parameters.find(parameter => parameter.name === 'page')?.schema
    const limit = parameters.find(parameter => parameter.name === 'limit')?.schema

    expect(page).toMatchObject({ type: 'string', default: '1', pattern: '^-?\\d+$', 'x-wire-coerces-to': 'integer' })
    expect(limit).toMatchObject({
      type: 'string',
      default: '20',
      pattern: '^-?\\d+$',
      'x-wire-minimum': 1,
      'x-wire-maximum': 100,
      'x-wire-coerces-to': 'integer',
    })
  })

  it('uses one stable error envelope for documented failure responses', () => {
    const response = document.paths['/diaries']?.get?.responses as unknown as Record<string, unknown>
    expect(response?.['400']).toBeDefined()
    expect(response?.['401']).toBeDefined()
    expect(JSON.stringify(response?.['400'])).toContain('#/components/schemas/ApiErrorResponse')
    expect(document as unknown as { components: { schemas: { ApiErrorResponse: unknown } } }).toHaveProperty('components.schemas.ApiErrorResponse')
  })
})
