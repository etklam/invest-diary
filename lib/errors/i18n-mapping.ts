import { ErrorCodes } from './codes'

/**
 * 將 ErrorCode 轉換為對應的 i18n key
 * 命名規範：error.code.{lowercase_errorcode}
 */
export function errorCodeToI18nKey(code: string): string {
  return `error.code.${code.toLowerCase()}`
}

/** 所有已定義 ErrorCode，用於測試驗證 */
export const ALL_ERROR_CODES: string[] = Object.values(ErrorCodes)
