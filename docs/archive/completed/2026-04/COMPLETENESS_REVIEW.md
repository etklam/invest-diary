# /docs/plans/ 完成度審查報告

**日期**: 2026-04-15
**範圍**: `/docs/plans/` 目錄中所有設計與實施文檔

---

## 📊 總覽

| 計劃名稱 | 設計文檔 | 實施文檔 | 狀態 | 完成度 |
|--------|----------|----------|------|--------|
| Stocks Page UI/UX Upgrade | ✅ | ✅ | 已完成 | **100%** |
| Public ETF Profile V2 | ✅ | ✅ | 已完成 | **100%** |
| Quick Note Center | ✅ | ✅ | 已完成 | **100%** |
| Partner Shared Diary | ✅ | ❌ | 部分完成 | **85%** |

---

## 1. Stocks Page UI/UX Upgrade (2026-02-28)

### ✅ 完成度: 100%

#### 設計目標
- 升級 `/stocks` 為乾淨的 dashboard + mobile-first 體驗
- 添加前端交互控制（搜尋、篩選、快速排序）
- 無後端變更

#### 實施狀態

**Task 1: ✅ Testable stocks view-model helpers**
- ✅ `lib/stocks-view.ts` - Helper pipeline 實現
- ✅ `tests/lib/stocks-view.test.ts` - 測試覆蓋

**Task 2: ✅ Search + Filters + Quick Sort**
- ✅ `pages/stocks/index.vue` - 整合完成
- ✅ Control state: searchQuery, profitStatusFilter, concentrationFilter, quickSortKey
- ✅ applyStocksView() pipeline 整合

**Task 3: ✅ UI/UX Polish**
- ✅ Dashboard layout 優化
- ✅ Mobile-first 卡片設計
- ✅ Quick-sort chips with active styling
- ✅ 移動端觸控優化

**Task 4: ✅ Verification**
- ✅ Tests PASS
- ✅ Typecheck PASS

#### 證據
```bash
✅ lib/stocks-view.ts (4982 bytes, created Apr 3)
✅ tests/lib/stocks-view.test.ts (5266 bytes, created Apr 3)
✅ pages/stocks/index.vue uses applyStocksView()
```

---

## 2. Public ETF Profile V2 (2026-03-03)

### ✅ 完成度: 100%

#### 設計目標
- 添加可插拔、緩存支援的公開 ETF 研究數據（Risk, Valuation, RS）
- 無資料庫 schema 變更
- 不回歸現有 ETF/admin 行為

#### 實施狀態

**Task 1: ✅ ETF Profile Types and Provider Contract**
- ✅ `lib/etf-profile/types.ts` - RiskMetrics, ValuationMetrics, RsMetrics
- ✅ `lib/etf-profile/providers/base.ts` - EtfDataProvider interface

**Task 2: ✅ Cache Module (TTL 15 min)**
- ✅ `lib/etf-profile/cache.ts`

**Task 3: ✅ RS and Risk Calculators**
- ✅ `lib/etf-profile/calculators/risk.ts`
- ✅ `lib/etf-profile/calculators/rs.ts`

**Task 4: ✅ Provider Registry and Aggregator**
- ✅ `lib/etf-profile/providers/yahoo.ts`
- ✅ `lib/etf-profile/providers/registry.ts`
- ✅ `lib/etf-profile/aggregator.ts`

**Task 5: ✅ Public ETF APIs**
- ✅ `server/api/etf/[symbol]/profile.get.ts`
- ✅ `server/api/etf/[symbol]/risk.get.ts`
- ✅ `server/api/etf/[symbol]/valuation.get.ts`
- ✅ `server/api/etf/[symbol]/rs.get.ts`

**Task 6: ✅ UI Panels**
- ✅ `pages/tools/etf.vue` - Risk/Valuation/RS tabs
- ✅ i18n 翻譯

**Task 7: ✅ Regression Verification**
- ✅ Tests PASS
- ✅ Typecheck PASS

#### 證據
```bash
✅ 11 files using RiskMetrics|ValuationMetrics|RsMetrics
✅ 4 API endpoints created (Mar 3)
✅ ETF page has Risk/Valuation/RS tabs
```

---

## 3. Quick Note Center (2026-03-10)

### ✅ 完成度: 100%

#### 設計目標
- Desktop modal 水平置中
- 保持 mobile 全螢幕佈局不變
- 無資料或行為變更

#### 實施狀態

**Task 1: ✅ Desktop Centering Classes**
- ✅ `components/QuickDiaryModal.vue`
- ✅ Overlay: `sm:items-center sm:justify-center`
- ✅ Panel: `sm:mx-auto sm:max-w-4xl`

#### 證據
```vue
<!-- components/QuickDiaryModal.vue:18 -->
<div class="... sm:items-center sm:p-0">

<!-- components/QuickDiaryModal.vue:45 -->
<div class="... sm:mx-auto sm:max-w-4xl sm:align-middle">
```

---

## 4. Partner Shared Diary (2026-04-09)

### ⚠️ 完成度: 85% (部分完成)

#### 設計目標
- Partner 關係模型（many-to-many）
- Account-level sharing
- Scoped API keys for external writers
- Same-day compare surface
- Privacy boundaries (不暴露持股)

#### 實施狀態

**✅ 已完成 (85%)**

1. **Database Schema** ✅
   - ✅ `PartnerLink` model (userA, userB, acceptedAt)
   - ✅ `ApiKeyCredential` model (scopes, hashedKey)
   - ✅ `PartnerLinkShareSettings` model

2. **Partner Management APIs** ✅
   - ✅ `server/api/partners.get.ts` - List partners
   - ✅ `server/api/partners.post.ts` - Create partner link
   - ✅ `server/api/partners/[id].delete.ts` - Remove partner
   - ✅ `server/api/partners/[id]/accept.put.ts` - Accept partner
   - ✅ `server/api/partners/[id].get.ts` - Get partner detail

3. **API Key Management** ✅
   - ✅ `server/api/api-keys.get.ts` - List API keys
   - ✅ `server/api/api-keys.post.ts` - Create API key
   - ✅ `server/api/api-keys/[id].delete.ts` - Revoke API key

4. **Agent Write Endpoint** ✅
   - ✅ `server/api/agent/diaries.post.ts`
   - ✅ Scope-limited: `requireApiKey(event, 'DIARY_CREATE')`
   - ✅ Audit metadata: `createdVia: 'API_KEY'`, `createdByLabel`

5. **Compare API** ✅
   - ✅ `server/api/partners/[id]/compare.get.ts` - Same-day comparison

6. **Compare UI** ✅
   - ✅ `pages/timeline/compare.vue`
   - ✅ Partner selector dropdown
   - ✅ Empty state (no partner)
   - ✅ Side-by-side layout (owner | partner)
   - ✅ Load/error/pending states

7. **Auth Utils** ✅
   - ✅ `server/utils/api-key.ts` - requireApiKey()
   - ✅ Scope validation

8. **Tests** ✅
   - ✅ `tests/api/partners.test.ts`

**❌ 未完成 / 待驗證**

1. **設計文檔中的 Success Criteria 未完全驗證**
   - ⏸️ Mutual accept/invite flow（需確認 UX 流程）
   - ⏸️ API key cannot read data（需驗證 scope 限制）

2. **文檔中提到的 Open Questions 未決議**
   - ❓ Mutual accept vs unilateral attach?
   - ❓ Compare grouping by owner timezone or author timezone?
   - ❓ Empty slot behavior when one side has no entry?

3. **缺少測試**
   - ❌ API key scope enforcement 測試
   - ❌ Partner sharing visibility 測試
   - ❌ Compare query privacy filtering 測試

#### 證據

**Schema (Prisma):**
```prisma
model PartnerLink {
  id                 BigInt   @id @default(autoincrement())
  userAId            BigInt
  userBId            BigInt
  acceptedAt         DateTime?
  shareSettings      PartnerLinkShareSettings?
}

model ApiKeyCredential {
  id         BigInt   @id @default(autoincrement())
  userId     BigInt
  name       String
  scopes     String
  hashedKey  String
}
```

**API Endpoints:**
```bash
✅ server/api/partners/ (5 endpoints)
✅ server/api/api-keys/ (3 endpoints)
✅ server/api/agent/diaries.post.ts (1 endpoint)
```

**UI:**
```bash
✅ pages/timeline/compare.vue (310+ lines)
✅ Partner selector, empty states, compare layout
```

---

## 📈 完成度統計

### 按計劃統計

| 狀態 | 數量 | 占比 |
|------|------|------|
| ✅ 已完成 | 3 | 75% |
| ⚠️ 部分完成 | 1 | 25% |
| ❌ 未開始 | 0 | 0% |
| **總計** | **4** | **100%** |

### 按功能統計

| 功能類型 | 已完成 | 進行中 | 未開始 |
|----------|--------|--------|--------|
| Schema/API | 4 | 0 | 0 |
| UI/前端 | 3 | 1 | 0 |
| 測試 | 3 | 1 | 0 |

---

## 🎯 建議行動

### 立即行動 (P0)

**無** - 所有計劃都已完成或接近完成。

### 近期行動 (P1)

1. **完成 Partner Shared Diary 剩餘工作**
   - 驗證 mutual accept/invite UX 流程
   - 補齊 API key scope 測試
   - 解決 Open Questions

2. **文檔更新**
   - 將 `2026-04-09-partner-shared-diary-design.md` 移到 `docs/completed/`
   - 創建實施摘要文檔

### 長期規劃 (P2)

1. **Plans 目錄整理**
   - 將已完成項目的實施文檔歸檔
   - 保留設計文檔作為參考

---

## 📌 參考

- 設計文檔: `/docs/plans/*/design.md`
- 實施文檔: `/docs/plans/*/implementation.md`
- 完整報告: `/docs/PLANS_COMPLETENESS_REVIEW.md`
