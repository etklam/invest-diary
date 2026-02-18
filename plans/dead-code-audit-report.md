#專案程式碼審計報告 - 未使用程式碼分析

## 概述

本報告針對 diary-vue 專案進行全面的程式碼審計，識別出未被使用的組件、composables、函數和其他程式碼。

---

## 🔴 高優先級 - 完全未使用的檔案

### Components

| 檔案 | 說明 | 建議 |
|------|------|------|
| [`components/HealthStatus.vue`](../components/HealthStatus.vue) | 健康狀態檢查組件，沒有被任何地方引用 | **可刪除** |
| [`components/HoldingCard.vue`](../components/HoldingCard.vue) | 持股卡片組件，沒有被任何地方引用（但內部使用了 MiniChart） | **可刪除** |

---

## 🟡 中優先級 - 未被引用的函數/Composables

### Composables - 未使用的函數

#### [`composables/useBreakpoints.ts`](../composables/useBreakpoints.ts)
整個檔案的 `useBreakpoints()` 函數沒有被任何地方使用。

```typescript
// 這個 composable 完全沒有被引用
export function useBreakpoints() { ... }
```

**建議**: 可刪除整個檔案，或考慮是否要在響應式設計中使用。

---

#### [`composables/useNavigationAnimation.ts`](../composables/useNavigationAnimation.ts)
`useNavigationAnimation()` 函數沒有被任何地方使用。

```typescript
// 這個 composable 完全沒有被引用
export function useNavigationAnimation(config) { ... }
```

**建議**: 可刪除整個檔案。

---

### Lib/Utils - 重複函數 (已修正)

#### [`lib/utils.ts`](../lib/utils.ts)

| 函數 | 狀態 | 說明 |
|------|------|------|
| `formatDate()` | ✅ 已修正 | 增強後支援 `Date\|string`，已移除所有頁面中的重複實現 |
| `formatCurrency()` | ✅ 已修正 | 已移除 `pages/stocks/index.vue` 中的重複實現 |
| `formatShortDate()` | ✅ 新增 | 簡短日期格式 (年/月/日) |
| `formatDateWithWeekday()` | ✅ 新增 | 日期格式帶星期 (年/月/日 (週X)) |

**修正項目**:
- 新增 `formatShortDate` 和 `formatDateWithWeekday` 支援不同的日期格式需求
- 統一所有頁面使用 `lib/utils.ts` 中的格式化函數
- 移除以下檔案中的重複定義：
  - `pages/admin/blog/[id]/edit.vue`
  - `pages/admin/blog/index.vue`
  - `pages/admin/index.vue`
  - `pages/timeline/index.vue` (使用 `formatDateWithWeekday`)
  - `pages/diaries/[id]/index.vue` (使用 `formatShortDate`)
  - `pages/stocks/index.vue` (formatCurrency)

---

### Stores - 未使用的函數

#### [`stores/navigation.ts`](../stores/navigation.ts)

以下函數已定義但未被外部使用：

| 函數 | 狀態 |
|------|------|
| `subscribe()` | 未使用 |
| `getState()` | 未使用 |
| `updateNavigationItem()` | 僅內部使用 |
| `addNavigationItem()` | 未使用 |
| `removeNavigationItem()` | 未使用 |
| `clearHistory()` | 未使用 |
| `goBack()` | 未使用 |
| `filterNavigationItems()` | 未使用 |
| `clearLocalStorage()` | 僅內部使用 |
| `loadFromLocalStorage()` | 僅內部使用 |
| `saveToLocalStorage()` | 僅內部使用 |

**建議**: 這些函數可能是為未來功能預留的，可以：
1. 保留供未來使用
2. 刪除未使用的函數以減少程式碼量

---

## 🟢 低優先級 - 可能有用途的程式碼

### Scripts - 工具腳本

| 檔案 | 說明 | 建議 |
|------|------|------|
| [`scripts/generate-icons.js`](../scripts/generate-icons.js) | PWA 圖標生成腳本 | 保留（工具腳本） |
| [`scripts/generate-png-icons.js`](../scripts/generate-png-icons.js) | PNG 圖標生成腳本 | 保留（工具腳本） |
| [`scripts/verify-admin.ts`](../scripts/verify-admin.ts) | 管理員驗證腳本 | 保留（工具腳本） |
| [`scripts/health-check.ts`](../scripts/health-check.ts) | 健康檢查腳本 | 保留（在 package.json 中使用） |

---

### Plugins - 自動載入

Nuxt plugins 會自動載入，不需要顯式引用：

| 檔案 | 說明 |
|------|------|
| [`plugins/nuxt-warn-filter.client.ts`](../plugins/nuxt-warn-filter.client.ts) | 開發環境警告過濾 |
| [`plugins/error-handler.ts`](../plugins/error-handler.ts) | 全局錯誤處理 |
| [`plugins/auth.ts`](../plugins/auth.ts) | 認證初始化 |
| [`plugins/router.client.ts`](../plugins/router.client.ts) | 路由導航處理 |

---

### Server Plugins

| 檔案 | 說明 |
|------|------|
| [`server/plugins/alerts-checker.ts`](../server/plugins/alerts-checker.ts) | 警報檢查定時任務 |
| [`server/plugins/bigint.ts`](../server/plugins/bigint.ts) | BigInt 序列化處理 |

---

## 📊 統計摘要 (更新於 2026-02-18)

| 類別 | 已刪除 | 已修正 | 待處理 |
|------|--------|--------|--------|
| Components | 2 | - | - |
| Composables | 2 | - | - |
| Lib函數 | - | 2 | - |
| Store函數 | - | - | 11 |
| **總計** | **4** | **2** | **11** |

### 已完成項目 ✅
1. ✅ 刪除 `components/HealthStatus.vue`
2. ✅ 刪除 `components/HoldingCard.vue`
3. ✅ 刪除 `composables/useBreakpoints.ts`
4. ✅ 刪除 `composables/useNavigationAnimation.ts`
5. ✅ 統一 `formatDate` 函數 (新增 `formatShortDate` 和 `formatDateWithWeekday`)
6. ✅ 統一 `formatCurrency` 函數

### 待處理項目 📋
1. `stores/navigation.ts` 中的 11 個未使用函數

---

## ⚠️ 報告更正說明

原報告中以下項目經驗證**不存在**，已從本報告中移除：
- `useIsMobile()`, `useIsTablet()`, `useIsDesktop()`, `useScreenSize()` - 未在 `useMobileDetection.ts` 中定義
- `useLongPress()`, `useDoubleTap()` - 未在 `useGestures.ts` 中定義
- `useTrackedAsyncData()` - 未在 `usePerformance.ts` 中定義
- `getHoldingBySymbol()` - 未在 `lib/utils.ts` 中定義

---

## 🔧 建議的清理步驟 (更新)

### ✅ 第一階段：刪除明確未使用的程式碼 (已完成)

1. ✅ 刪除 [`components/HealthStatus.vue`](../components/HealthStatus.vue)
2. ✅ 刪除 [`components/HoldingCard.vue`](../components/HoldingCard.vue)
3. ✅ 刪除 [`composables/useBreakpoints.ts`](../composables/useBreakpoints.ts)
4. ✅ 刪除 [`composables/useNavigationAnimation.ts`](../composables/useNavigationAnimation.ts)

### ✅ 第二階段：重構重複程式碼 (已完成)

1. ✅ 統一 `formatDate` 函數使用
   - 新增 `formatShortDate` 和 `formatDateWithWeekday` 支援不同格式
   - 移除 5 個頁面中的重複實現
2. ✅ 統一 `formatCurrency` 函數使用
   - 移除 `pages/stocks/index.vue` 中的重複實現

### 📋 第三階段：清理未使用的 Store 函數 (待處理)

1. 清理 [`stores/navigation.ts`](../stores/navigation.ts) 中的 11 個未使用函數

---

## ⚠️ 注意事項

1. **測試覆蓋**: 刪除程式碼前，請確認沒有測試依賴這些函數
2. **漸進式清理**: 建議分階段清理，每次清理後執行測試確保功能正常
3. **版本控制**: 清理前建議建立新分支，以便需要時回滾

---

## 📋 待確認項目

以下項目需要進一步確認是否需要保留：

- [ ] `stores/navigation.ts` 中的導航歷史功能是否計劃使用？
- [ ] 未使用的導航函數是否應該刪除以減少 bundle 大小？

---

*報告生成時間: 2026-02-18*
*最後更新: 2026-02-18*
