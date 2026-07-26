type TranslateFn = (key: string) => string

/**
 * 從 API 錯誤中提取 ErrorCode，查 i18n 翻譯並回傳
 *
 * Fallback 順序：
 *   1. i18n 翻譯（error.code.{lowercase_code}）
 *   2. 服務端 statusMessage（若存在）
 *   3. 呼叫端提供的 fallback（若有）
 *   4. error.somethingWrong（硬編碼 fallback）
 *
 * `fallback` 是已解析的字串（呼叫端自行決定用 t(key) 或字面訊息），
 * 讓 caller 保留原本各自的 fallback 語意，同時接上 error-code 翻譯層。
 */
export function resolveErrorMessage(error: unknown, t?: TranslateFn, fallback?: string): string {
  let code: string | undefined

  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>

    // 試著從 data.code 提取
    const data = err.data as Record<string, unknown> | undefined
    code = typeof data?.code === 'string' ? data.code : undefined

    // fallback: 從 response._data 提取
    if (!code) {
      const resp = err.response as Record<string, unknown> | undefined
      const respData = resp?._data as Record<string, unknown> | undefined
      const innerData = respData?.data as Record<string, unknown> | undefined
      code = typeof innerData?.code === 'string' ? innerData.code
        : typeof respData?.code === 'string' ? respData.code
        : undefined
    }
  }

  if (code && t) {
    const key = `error.code.${code.toLowerCase()}`
    const translated = t(key)
    // 若未找到翻譯，i18n 會回傳 key 本身，這時退回 statusMessage
    if (translated !== key) {
      return translated
    }
  }

  // Fallback 2: statusMessage
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>
    const data = err.data as Record<string, unknown> | undefined
    const statusMessage = typeof data?.statusMessage === 'string' ? data.statusMessage : undefined
    if (statusMessage) {
      return statusMessage
    }
  }

  // Fallback 3: 呼叫端提供的 fallback
  if (fallback) {
    return fallback
  }

  // Fallback 4: hardcoded
  if (t) {
    return t('error.somethingWrong')
  }
  return '出了點問題'
}
