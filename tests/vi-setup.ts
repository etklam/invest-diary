/**
 * Vitest setup file for Nuxt composables and server API mocking
 * This file runs before all tests to set up global mocks
 */

import { vi } from 'vitest'

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

// Mock Nuxt auto-imported functions for server APIs
global.defineEventHandler = (handler: Function) => handler
global.readBody = mockReadBody
global.getQuery = mockGetQuery
global.getRouterParam = mockGetRouterParam
global.setCookie = mockSetCookie
global.deleteCookie = mockDeleteCookie
global.getCookie = mockGetCookie
global.getHeader = mockGetHeader
global.setHeader = mockSetHeader
global.sendRedirect = mockSendRedirect
global.setResponseStatus = mockSetResponseStatus
global.getRequestURL = vi.fn(() => ({ pathname: '/api/test' }))
global.createError = (params: { statusCode: number; statusMessage: string }) => {
  const error = new Error(params.statusMessage)
  ;(error as any).statusCode = params.statusCode
  ;(error as any).statusMessage = params.statusMessage
  return error
}

// Make useToast available as a global for auto-imported composables
global.useToast = () => mockToast

// Mock cachedEventHandler for Nuxt caching
global.cachedEventHandler = (handler: Function) => handler

// Mock event context
global.event = {
  context: {
    requestId: 'test-request-id',
  },
}

// Mock $fetch globally
global.$fetch = vi.fn()

// Mock useFetch globally（供組件測試使用，預設回傳空資料）
// 注意：必須回傳 ref() 以讓 Vue 模板正確響應
import { ref as _ref } from 'vue'
global.useFetch = vi.fn(() => ({
  data: _ref(null),
  pending: _ref(false),
  error: _ref(null),
  execute: vi.fn(),
  refresh: vi.fn(),
}))

// Mock useLazyFetch globally
global.useLazyFetch = vi.fn(() => ({
  data: _ref(null),
  pending: _ref(false),
  error: _ref(null),
  execute: vi.fn(),
  refresh: vi.fn(),
}))

// Mock Nuxt composables (auto-imported)
vi.mock('#app/composables/chrome', () => ({
  useNuxtApp: () => ({
    $fetch: global.$fetch,
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
