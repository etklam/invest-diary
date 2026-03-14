/**
 * Blog 分類相關類型定義與常數
 * 
 * 統一管理分類的英文 key，確保：
 * 1. 資料庫儲存一致的英文值
 * 2. 前端元件使用統一的來源
 * 3. 透過 i18n 進行多語言翻譯
 */

/**
 * 部落格文章分類的英文 key
 * 這些值會儲存在資料庫中，並作為 i18n 的翻譯鍵
 */
export const BLOG_CATEGORIES = {
  FUNDAMENTAL: 'fundamental',
  TECHNICAL: 'technical',
  MARKET: 'market',
  STRATEGY: 'strategy'
} as const

/**
 * 分類 key 類型
 */
export type CategoryKey = typeof BLOG_CATEGORIES[keyof typeof BLOG_CATEGORIES]

/**
 * 分類選項陣列，供 UI 元件使用
 */
export const CATEGORY_OPTIONS: CategoryKey[] = [
  BLOG_CATEGORIES.FUNDAMENTAL,
  BLOG_CATEGORIES.TECHNICAL,
  BLOG_CATEGORIES.MARKET,
  BLOG_CATEGORIES.STRATEGY
]

/**
 * 舊版中文分類值對照表（用於資料遷移）
 * @deprecated 僅用於資料庫遷移，新程式碼不應使用
 */
export const LEGACY_CATEGORY_MAP: Record<string, CategoryKey> = {
  //基本面分析
  '基本面分析': BLOG_CATEGORIES.FUNDAMENTAL,
  // 技術面分析（繁體/簡體變體）
  '技术面分析': BLOG_CATEGORIES.TECHNICAL,
  '技術面分析': BLOG_CATEGORIES.TECHNICAL,
  // 市場觀察（繁體/簡體變體）
  '市场观察': BLOG_CATEGORIES.MARKET,
  '市場觀察': BLOG_CATEGORIES.MARKET,
  // 投資策略（繁體/簡體變體）
  '投资策略': BLOG_CATEGORIES.STRATEGY,
  '投資策略': BLOG_CATEGORIES.STRATEGY,
  // 英文值（向後相容）
  'Fundamental Analysis': BLOG_CATEGORIES.FUNDAMENTAL,
  'Technical Analysis': BLOG_CATEGORIES.TECHNICAL,
  'Market Watch': BLOG_CATEGORIES.MARKET,
  'Investment Strategy': BLOG_CATEGORIES.STRATEGY,
  'FUNDAMENTAL': BLOG_CATEGORIES.FUNDAMENTAL,
  'TECH': BLOG_CATEGORIES.TECHNICAL,
  'MARKET': BLOG_CATEGORIES.MARKET,
  'STRATEGY': BLOG_CATEGORIES.STRATEGY
}

/**
 * 將舊版分類值轉換為新的標準 key
 * @param category 舊版分類值
 * @returns 標準化的分類 key，如果無法識別則返回原值
 */
export function normalizeCategory(category: string): CategoryKey | string {
  return LEGACY_CATEGORY_MAP[category] || category
}
