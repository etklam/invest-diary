import type { Ref } from 'vue'

type TestEventHandler = (...args: any[]) => any

declare global {
  interface globalThis {
    defineEventHandler: (handler: TestEventHandler) => TestEventHandler
    readBody: TestEventHandler
    getQuery: TestEventHandler
    getRouterParam: TestEventHandler
    setCookie: TestEventHandler
    deleteCookie: TestEventHandler
    getCookie: TestEventHandler
    getHeader: TestEventHandler
    setHeader: TestEventHandler
    sendRedirect: TestEventHandler
    setResponseStatus: TestEventHandler
    getRequestURL: TestEventHandler
    createError: TestEventHandler
    cachedEventHandler: (handler: TestEventHandler) => TestEventHandler
    useToast: () => Record<string, TestEventHandler>
    useI18n: () => Record<string, unknown>
    useTimezone: () => Record<string, TestEventHandler>
    useFetch: TestEventHandler
    useLazyFetch: TestEventHandler
    $fetch: TestEventHandler
    event: { context: Record<string, unknown> }
    useNuxtApp: () => { $fetch?: TestEventHandler; $websocket?: Record<string, unknown> }
  }

  var defineEventHandler: (handler: TestEventHandler) => TestEventHandler
  var readBody: TestEventHandler
  var getQuery: TestEventHandler
  var getRouterParam: TestEventHandler
  var setCookie: TestEventHandler
  var deleteCookie: TestEventHandler
  var getCookie: TestEventHandler
  var getHeader: TestEventHandler
  var setHeader: TestEventHandler
  var sendRedirect: TestEventHandler
  var setResponseStatus: TestEventHandler
  var getRequestURL: TestEventHandler
  var createError: TestEventHandler
  var cachedEventHandler: (handler: TestEventHandler) => TestEventHandler
  var useToast: () => Record<string, TestEventHandler>
  var useI18n: () => Record<string, unknown>
  var useTimezone: () => Record<string, TestEventHandler>
  var useFetch: TestEventHandler
  var useLazyFetch: TestEventHandler
  var $fetch: TestEventHandler
  var event: { context: Record<string, unknown> }

  // A minimal shape used by composable tests when they stub a Nuxt app.
  var useNuxtApp: () => { $fetch?: TestEventHandler; $websocket?: Record<string, unknown> }
}

export type TestRef<T> = Ref<T>
export {}
