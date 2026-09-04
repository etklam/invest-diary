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
      '/auth/logout-all',
      '/auth/native/login',
      '/auth/native/refresh',
      '/auth/native/logout',
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

  it('freezes native auth schemas, bearer security, and mobile error statuses', () => {
    const paths = document.paths as Record<string, any>
    const nativeLogin = paths['/auth/native/login'].post
    const nativeRefresh = paths['/auth/native/refresh'].post
    const nativeLogout = paths['/auth/native/logout'].post
    const logoutAll = paths['/auth/logout-all'].post

    expect(nativeLogin.requestBody.content['application/json'].schema).toMatchObject({
      required: ['email', 'password'],
      additionalProperties: false,
    })
    expect(nativeRefresh.requestBody.content['application/json'].schema).toMatchObject({
      required: ['refreshToken'],
      additionalProperties: false,
    })
    expect(nativeLogout.requestBody.content['application/json'].schema).toMatchObject({
      required: ['refreshToken'],
      additionalProperties: false,
    })
    expect(nativeLogin.responses).toEqual(expect.objectContaining({ '400': expect.anything(), '401': expect.anything(), '429': expect.anything() }))
    expect(nativeRefresh.responses).toEqual(expect.objectContaining({ '400': expect.anything(), '401': expect.anything(), '429': expect.anything() }))
    expect(nativeLogout.responses).toEqual(expect.objectContaining({ '400': expect.anything(), '401': expect.anything() }))
    expect(logoutAll.security).toEqual([{ bearerAuth: [] }, { accessTokenCookie: [] }])
    expect(logoutAll.responses).toEqual(expect.objectContaining({ '401': expect.anything(), '403': expect.anything(), '500': expect.anything() }))

    for (const path of ['/auth/me', '/auth/logout-all']) {
      expect(paths[path].get?.security ?? paths[path].post.security).toEqual([
        { bearerAuth: [] },
        { accessTokenCookie: [] },
      ])
    }
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
