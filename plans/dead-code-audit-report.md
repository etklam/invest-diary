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

#### [`composables/useMobileDetection.ts`](../composables/useMobileDetection.ts) - 便捷函數未使用

以下便捷函數已定義但未被使用：

| 函數 | 狀態 |
|------|------|
| `useIsMobile()` | 未使用 |
| `useIsTablet()` | 未使用 |
| `useIsDesktop()` | 未使用 |
| `useScreenSize()` | 未使用 |

**建議**: 這些是便捷函數，可以保留供未來使用，或刪除以減少程式碼量。

---

#### [`composables/useGestures.ts`](../composables/useGestures.ts) - 便捷函數未使用

以下便捷函數已定義但未被使用：

| 函數 | 狀態 |
|------|------|
| `useLongPress()` | 未使用 |
| `useDoubleTap()` | 未使用 |

**注意**: `useSwipeGestures()` 被 [`HoldingCard.vue`](../components/HoldingCard.vue) 使用，但該組件本身未被使用。

**建議**: 如果刪除 HoldingCard，這些函數也可以一併刪除。

---

#### [`composables/usePerformance.ts`](../composables/usePerformance.ts) - 部分函數未使用

以下函數已定義但未被外部使用：

| 函數 | 狀態 |
|------|------|
| `useTrackedAsyncData()` | 未使用（僅在文檔示例中） |
| `getMetricRating()` | 未被外部調用 |
| `areCoreVitalsGood` | 未被外部調用 |

**建議**: 
- `useTrackedAsyncData` 可以刪除
- `getMetricRating` 和 `areCoreVitalsGood` 是內部使用的計算屬性，可以保留

---

### Lib/Utils - 未使用的函數

#### [`lib/utils.ts`](../lib/utils.ts)

| 函數 | 狀態 | 說明 |
|------|------|------|
| `getHoldingBySymbol()` | 未使用 | 只在測試中使用 |
| `formatDate()` | 重複定義 | 各頁面有自己的實現 |
| `formatCurrency()` | 重複定義 | 各頁面有自己的實現 |

**建議**: 
- `getHoldingBySymbol` 可以刪除（或保留作為工具函數）
- `formatDate` 和 `formatCurrency` 應該統一使用 lib/utils.ts 中的版本，刪除各頁面中的重複定義

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

## 📊 統計摘要

| 類別 | 可刪除數量 | 可優化數量 |
|------|-----------|-----------|
| Components | 2 | - |
| Composables | 2 | 8 |
| Lib函數 | 1 | 2 |
| Store函數 | - | 11 |
| **總計** | **5** | **21** |

---

## 🔧 建議的清理步驟

### 第一階段：刪除明確未使用的程式碼

1. 刪除 [`components/HealthStatus.vue`](../components/HealthStatus.vue)
2. 刪除 [`components/HoldingCard.vue`](../components/HoldingCard.vue)
3. 刪除 [`composables/useBreakpoints.ts`](../composables/useBreakpoints.ts)
4. 刪除 [`composables/useNavigationAnimation.ts`](../composables/useNavigationAnimation.ts)

### 第二階段：清理未使用的函數

1. 從 [`composables/useMobileDetection.ts`](../composables/useMobileDetection.ts) 刪除便捷函數
2. 從 [`composables/useGestures.ts`](../composables/useGestures.ts) 刪除 `useLongPress` 和 `useDoubleTap`
3. 從 [`composables/usePerformance.ts`](../composables/usePerformance.ts) 刪除 `useTrackedAsyncData`
4. 從 [`lib/utils.ts`](../lib/utils.ts) 刪除 `getHoldingBySymbol`

### 第三階段：重構重複程式碼

1. 統一 `formatDate` 函數使用
2. 統一 `formatCurrency` 函數使用

---

## ⚠️ 注意事項

1. **測試覆蓋**: 刪除程式碼前，請確認沒有測試依賴這些函數
2. **漸進式清理**: 建議分階段清理，每次清理後執行測試確保功能正常
3. **版本控制**: 清理前建議建立新分支，以便需要時回滾

---

## 📋 待確認項目

以下項目需要進一步確認是否需要保留：

- [ ] `stores/navigation.ts` 中的導航歷史功能是否計劃使用？
- [ ] `useNavigationAnimation` 是否為未來的頁面轉場動畫功能？
- [ ] `HealthStatus` 組件是否計劃在管理後台使用？

---

*報告生成時間: 2026-02-18*
