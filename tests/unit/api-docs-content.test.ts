/**
 * API documentation contract tests.
 *
 * The previous version of this file asserted raw source-code strings inside
 * docs/API.md (e.g. `expect(apiDocs).toContain('"scope": "AGENT_WRITE"')`).
 * Those checks only verified that a literal substring existed in the doc —
 * they gave no confidence that the runtime endpoints actually behave the way
 * the docs describe.
 *
 * This file cross-checks the documented contract against real runtime behavior
 * for a small set of critical endpoints. The docs claim:
 *
 *   POST /api/auth/login — 200: auth cookies set, login succeeded.
 *
 * We invoke the real handler (with Prisma / bcrypt / JWT mocked per repo
 * convention) and assert the response shape and cookie side-effects match
 * what the docs claim. If the handler drifts from the docs, this test fails.
 *
 * If API.md is ever regenerated from a schema, replace the parseSection()
 * helper below with an assertion against the generated artifact.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { mockReadBody, mockSetCookie } from '../vi-setup'

// ---- Doc loader ---------------------------------------------------------

type DocSection = { title: string; body: string }

async function loadDocSections(): Promise<DocSection[]> {
  const apiDocs = await readFile(resolve(process.cwd(), 'docs/API.md'), 'utf8')
  const sections: DocSection[] = []
  // Match `### \`METHOD /path\`` headings and capture their bodies.
  const heading = /^### `([A-Z]+ [^\s]+)`\s*$/gm
  let match: RegExpExecArray | null
  const matches: { title: string; index: number }[] = []
  while ((match = heading.exec(apiDocs)) !== null) {
    matches.push({ title: match[1], index: match.index + match[0].length })
  }
  for (let i = 0; i < matches.length; i++) {
    const end = i + 1 < matches.length ? matches[i + 1].index : apiDocs.length
    sections.push({
      title: matches[i].title,
      body: apiDocs.slice(matches[i].index, end),
    })
  }
  return sections
}

// ---- Mocks for POST /api/auth/login -------------------------------------

const mockUserFindUnique = vi.fn()
const mockRefreshTokenCreate = vi.fn()
const mockBcryptCompare = vi.fn()
const mockSignAccessToken = vi.fn()
const mockSignRefreshToken = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    user: { findUnique: mockUserFindUnique },
    refreshToken: { create: mockRefreshTokenCreate, update: vi.fn() },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  },
}))

vi.mock('bcryptjs', () => ({
  default: { compare: mockBcryptCompare, hash: vi.fn() },
}))

vi.mock('~/lib/jwt', () => ({
  signAccessToken: mockSignAccessToken,
  signRefreshToken: mockSignRefreshToken,
  ACCESS_TOKEN_MAX_AGE_SECONDS: 3600,
  REFRESH_TOKEN_MAX_AGE_SECONDS: 60 * 60 * 24 * 30,
}))

vi.mock('h3', () => ({
  createError: (params: { statusCode: number; statusMessage: string }) => {
    const err: any = new Error(params.statusMessage)
    err.statusCode = params.statusCode
    err.statusMessage = params.statusMessage
    return err
  },
  defineEventHandler: (handler: Function) => handler,
}))

vi.mock('~/lib/logger', () => ({
  logger: {
    auth: { withRequestId: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }) },
  },
}))

vi.mock('~/lib/rate-limiter', () => ({
  rateLimiters: {
    authLoginIp: vi.fn(),
    authLoginIdentity: vi.fn(),
  },
  getRateLimitIdentifier: vi.fn(() => '127.0.0.1'),
}))

vi.mock('~/server/utils/rate-limit', () => ({
  enforceRateLimit: vi.fn(),
}))

// ---- Tests --------------------------------------------------------------

describe('API documentation contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignAccessToken.mockResolvedValue('mock-access-token')
    mockSignRefreshToken.mockResolvedValue('mock-refresh-token')
    mockRefreshTokenCreate.mockResolvedValue({ id: 1n })
    mockBcryptCompare.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('documents the priority API groups', async () => {
    const apiDocs = await readFile(resolve(process.cwd(), 'docs/API.md'), 'utf8')
    expect(apiDocs).toContain('# API Reference')
    expect(apiDocs).toContain('## Auth')
    expect(apiDocs).toContain('## Diaries')
    expect(apiDocs).toContain('## API Keys')
    expect(apiDocs).toContain('## Agent')
    expect(apiDocs).toContain('## Stocks')
  })

  it('does not introduce swagger runtime dependencies', async () => {
    const packageJson = await readFile(resolve(process.cwd(), 'package.json'), 'utf8')
    const dependencies = JSON.parse(packageJson).dependencies ?? {}
    expect(dependencies).not.toHaveProperty('nuxt-swagger')
    expect(dependencies).not.toHaveProperty('swagger-ui')
  })

  describe('POST /api/auth/login — docs match runtime contract', () => {
    it('docs claim "auth cookies set" on 200; runtime actually sets both cookies', async () => {
      const sections = await loadDocSections()
      const loginSection = sections.find((s) => s.title === 'POST /api/auth/login')
      expect(loginSection, 'docs must document POST /api/auth/login').toBeDefined()
      expect(loginSection!.body).toMatch(/200.*cookie|cookie.*200/i)

      // Drive the real handler with a valid mock user.
      mockUserFindUnique.mockResolvedValue({
        id: 1n,
        email: 'test@example.com',
        password: 'hashed',
        name: 'Test',
        role: 'USER',
        tokenVersion: 0,
        expectedMonthlyTrades: 5,
        expectedProfit: 1000,
        expectedAvgHolding: 7,
        timezone: 'UTC',
      })
      mockReadBody.mockResolvedValue({
        email: 'test@example.com',
        password: 'password',
      })

      const { default: handler } = await import('~/server/api/auth/login.post')
      const result: any = await handler({ context: {} } as any)

      // Response body shape contract from docs ("login succeeded").
      expect(result.ok).toBe(true)
      expect(result.data).toMatchObject({
        email: 'test@example.com',
        role: 'USER',
      })

      // Cookie side-effect contract — the docs explicitly call out cookie set.
      expect(mockSetCookie).toHaveBeenCalledTimes(2)
      const cookieNames = mockSetCookie.mock.calls.map((c) => c[1])
      expect(cookieNames).toEqual(
        expect.arrayContaining(['access-token', 'refresh-token']),
      )
    })

    it('docs list 400/401/429 error responses; runtime throws on invalid credentials', async () => {
      const sections = await loadDocSections()
      const loginSection = sections.find((s) => s.title === 'POST /api/auth/login')
      expect(loginSection!.body).toContain('400')
      expect(loginSection!.body).toContain('401')
      expect(loginSection!.body).toContain('429')

      mockUserFindUnique.mockResolvedValue(null)
      mockReadBody.mockResolvedValue({
        email: 'unknown@example.com',
        password: 'whatever',
      })

      const { default: handler } = await import('~/server/api/auth/login.post')
      await expect(handler({ context: {} } as any)).rejects.toMatchObject({
        statusCode: 401,
      })
    })
  })
})
