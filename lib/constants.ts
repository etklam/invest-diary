/**
 * Application-wide constants
 * Centralized to avoid magic numbers and improve maintainability
 */

// ============================================
// Polling Intervals (milliseconds)
// ============================================
export const POLLING = {
  /** Base interval for WebSocket fallback polling (60 seconds) */
  BASE_INTERVAL: 60000,
  /** Maximum interval between polls (5 minutes) */
  MAX_INTERVAL: 300000,
  /** Multiplier for exponential backoff */
  BACKOFF_MULTIPLIER: 1.5,
}

// ============================================
// Calendar / Date Constants
// ============================================
export const CALENDAR = {
  /** Month index for January (0-based) */
  JANUARY: 0,
  /** Month index for December (0-based) */
  DECEMBER: 11,
  /** Number of months in a year */
  MONTHS_PER_YEAR: 12,
  /** Number of days in a week */
  DAYS_PER_WEEK: 7,
}

// ============================================
// UI Animation Constants (milliseconds)
// ============================================
export const UI = {
  /** Default debounce delay for inputs */
  DEBOUNCE_DELAY: 300,
  /** Duration for toast notifications */
  TOAST_DURATION: 3000,
  /** Duration for loading spinners before showing timeout */
  LOADING_TIMEOUT: 5000,
}

// ============================================
// Pagination Constants
// ============================================
export const PAGINATION = {
  /** Default items per page */
  DEFAULT_PAGE_SIZE: 20,
  /** Maximum items per page */
  MAX_PAGE_SIZE: 100,
}
