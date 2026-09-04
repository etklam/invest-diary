/**
 * Vitest setup file for Nuxt composables and server API mocking
 * This file runs before all tests to set up global mocks
 */

import { vi } from 'vitest'

type MockLog = {
  info: ReturnType<typeof vi.fn>
  warn: ReturnType<typeof vi.fn>
  error: ReturnType<typeof vi.fn>
  debug: ReturnType<typeof vi.fn>
}

const loggerMocks = new Map<string, {
  logger: Record<string, { withRequestId: ReturnType<typeof vi.fn> }>
  log: MockLog
  withRequestId: ReturnType<typeof vi.fn>
}>()

/** Build the logger module shape used by API handlers. */
export function mockLogger(domain: string) {
  const existing = loggerMocks.get(domain)
  if (existing) return existing

  const log: MockLog = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }
  const withRequestId = vi.fn(() => log)
  const mock = {
    logger: { [domain]: { withRequestId } },
    log,
    withRequestId,
  }
  loggerMocks.set(domain, mock)
  return mock
}

/** Shared auth mock; callers set the return value per test when needed. */
export const mockRequireUser = vi.fn((user: unknown = { id: '1' }) => user)

// Create mock toast functions that can be imported by tests
const mockToastInfo = vi.fn()
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()
const mockToastWarning = vi.fn()

export const mockToast = {
  info: mockToastInfo,
  success: mockToastSuccess,
  error: mockToastError,
  warning: mockToastWarning,
}

// Create mock H3 functions that can be controlled by tests
export const mockReadBody = vi.fn()
export const mockGetQuery = vi.fn()
export const mockGetRouterParam = vi.fn()
export const mockSetCookie = vi.fn()
export const mockDeleteCookie = vi.fn()
export const mockGetCookie = vi.fn()
export const mockGetHeader = vi.fn()
export const mockSetHeader = vi.fn()
export const mockSendRedirect = vi.fn()
export const mockSetResponseStatus = vi.fn()

// Nuxt generates auto-import globals for the application, while Vitest runs
// this setup file in a plain Node global. Keep the runtime mock wiring behind
// one typed test boundary instead of weakening the entire test tsconfig.
const testGlobal = globalThis as typeof globalThis & Record<string, any>

// Mock Nuxt auto-imported functions for server APIs
testGlobal.defineEventHandler = (handler: Function) => handler
testGlobal.readBody = mockReadBody
testGlobal.getQuery = mockGetQuery
testGlobal.getRouterParam = mockGetRouterParam
testGlobal.setCookie = mockSetCookie
testGlobal.deleteCookie = mockDeleteCookie
testGlobal.getCookie = mockGetCookie
testGlobal.getHeader = mockGetHeader
testGlobal.setHeader = mockSetHeader
testGlobal.sendRedirect = mockSendRedirect
testGlobal.setResponseStatus = mockSetResponseStatus
testGlobal.getRequestURL = vi.fn(() => ({ pathname: '/api/test' }))
testGlobal.createError = (params: { statusCode: number; statusMessage: string }) => {
  const error = new Error(params.statusMessage)
  ;(error as any).statusCode = params.statusCode
  ;(error as any).statusMessage = params.statusMessage
  return error
}

// Make useToast available as a global for auto-imported composables
testGlobal.useToast = () => mockToast

// Make useI18n available as a global for auto-imported composables
testGlobal.useI18n = () => ({
  t: (key: string) => key,
  locale: 'zh-TW',
  locales: [],
  setLocale: vi.fn(),
})

// Make useTimezone available as a global for auto-imported composables.
// Per-file tests can override with vi.stubGlobal('useTimezone', ...) for
// deterministic formatted output.
testGlobal.useTimezone = () => ({
  getTimezone: () => 'Asia/Taipei',
  getTodayDateString: () => '2026-01-01',
  formatLocaleDate: (d?: unknown) => (d == null ? '' : String(d)),
  formatLocaleDateTime: (d?: unknown) => (d == null ? '' : String(d)),
  formatLocaleTime: (d?: unknown) => (d == null ? '' : String(d)),
})

// Mock cachedEventHandler for Nuxt caching
testGlobal.cachedEventHandler = (handler: Function) => handler

// Mock event context
;(testGlobal as Record<string, any>).event = {
  context: {
    requestId: 'test-request-id',
  },
}

// Mock $fetch globally
;(testGlobal as Record<string, any>).$fetch = vi.fn()

// Mock useFetch globally（供組件測試使用，預設回傳空資料）
// 注意：必須回傳 ref() 以讓 Vue 模板正確響應
import { ref as _ref } from 'vue'
testGlobal.useFetch = vi.fn(() => ({
  data: _ref(null),
  pending: _ref(false),
  error: _ref(null),
  execute: vi.fn(),
  refresh: vi.fn(),
}))

// Mock useLazyFetch globally
testGlobal.useLazyFetch = vi.fn(() => ({
  data: _ref(null),
  pending: _ref(false),
  error: _ref(null),
  execute: vi.fn(),
  refresh: vi.fn(),
}))

// Mock Nuxt composables (auto-imported)
vi.mock('#app/composables/chrome', () => ({
  useNuxtApp: () => ({
    $fetch: testGlobal.$fetch,
  }),
}))

// Mock useToast - use virtual module path for auto-imported composables
vi.mock('#app/composables/useToast', () => ({
  useToast: () => mockToast,
}))

// Also mock the explicit import path
vi.mock('~/composables/useToast', () => ({
  useToast: () => mockToast,
}))

// Stub Vue composables that might be auto-imported
vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue')>()
  return {
    ...actual,
    // Additional mocks if needed
  }
})
