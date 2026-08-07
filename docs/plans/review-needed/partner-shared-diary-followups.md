# Partner Shared Diary 後續項目（待重新盤點）

Status: Review needed — the original 85% estimate predates the current API-key and partner regression suites.

**日期**: 2026-04-15
**當前狀態**: 85% 完成

---

## ✅ 已完成部分 (85%)

### 1. Database Schema ✅
- ✅ `PartnerLink` model (userA, userB, acceptedAt)
- ✅ `ApiKeyCredential` model (scopes, hashedKey)
- ✅ `PartnerLinkShareSettings` model

### 2. Backend APIs ✅
- ✅ `server/api/partners.get.ts` - List partners
- ✅ `server/api/partners.post.ts` - Create partner link
- ✅ `server/api/partners/[id].delete.ts` - Remove partner
- ✅ `server/api/partners/[id].accept.put.ts` - Accept partner
- ✅ `server/api/partners/compare.get.ts` - Compare endpoint
- ✅ `server/api/api-keys.*` - API key management
- ✅ `server/api/agent/diaries.post.ts` - Agent write endpoint

### 3. Auth & Privacy ✅
- ✅ `server/utils/api-key.ts` - requireApiKey()
- ✅ Scope validation: `DIARY_CREATE`
- ✅ Privacy filtering in `serializeDiaryForPartnerView()`:
  ```typescript
  transactions: undefined,  // ❌ 排除持股資料
  alerts: undefined,         // ❌ 排除提醒
  ```

### 4. Frontend UI ✅
- ✅ `pages/timeline/compare.vue` - Compare page
- ✅ `components/settings/PartnerSettingsPanel.vue` - Partner management
- ✅ `components/settings/ApiKeySettingsPanel.vue` - API key management

### 5. Audit Metadata ✅
- ✅ `createdVia: 'API_KEY'`
- ✅ `createdByLabel: string`

### 6. Basic Tests ✅
- ✅ `tests/api/partners.test.ts` (166 lines, 4 test suites)

---

## ❌ 未完成部分 (15%)

### 1. 測試覆蓋不足

設計文檔要求：
> Cover the risky seams with tests.
> - API key scope enforcement
> - Partner sharing visibility
> - Compare query privacy filtering
> - Single-user regression coverage

**缺失測試：**

| 測試類型 | 狀態 | 優先級 |
|----------|------|--------|
| API key scope enforcement 測試 | ❌ 不存在 | P0 |
| API key cannot read data 驗證 | ❌ 不存在 | P0 |
| Partner sharing visibility 測試 | ❌ 不存在 | P1 |
| Compare query privacy filtering 測試 | ❌ 不存在 | P1 |
| Single-user regression 測試 | ❌ 不存在 | P1 |

**現有測試覆蓋：**
```
tests/api/partners.test.ts
├── describe('GET /api/partners')     ✅
├── describe('POST /api/partners')    ✅
├── describe('DELETE /api/partners/:id') ✅
└── (缺少 API key scope 測試)
```

### 2. Open Questions 未決議

設計文檔中的問題仍未回答：

1. **Mutual accept vs unilateral attach?**
   - 當前實施：需要 accept（見 `acceptedAt` 欄位）
   - 狀態：已實施 mutual accept，但未確認是否為最終 UX

2. **Compare grouping by which timezone?**
   - 當前實施：使用 viewer timezone (`viewer.timezone || 'Asia/Taipei'`)
   - 狀態：已實施，但未確認是否為正確行為

3. **Empty slot behavior?**
   - 當前實施：`serializeDiaryForPartnerView(null)` 返回 `null`
   - 狀態：已實施，但未確認 UX 是否符合預期

4. **Rich schema for AI write API?**
   - 當前實施：使用現有 freeform diary schema
   - 狀態：未決議

### 3. Success Criteria 驗證

| Success Criterion | 實施狀態 | 驗證狀態 |
|-------------------|----------|----------|
| User can create/link partner | ✅ 已實施 | ⚠️ 需手動驗證 |
| Single-user flows unchanged | ✅ 已實施 | ❌ 無回歸測試 |
| Partner can login/write normally | ✅ 已實施 | ⚠️ 需手動驗證 |
| API key can create diary | ✅ 已實施 | ⚠️ 需手動驗證 |
| API key **cannot** read data | ✅ 已實施 | ❌ **無測試** |
| Compare page works | ✅ 已實施 | ⚠️ 需手動驗證 |
| Compare excludes holdings | ✅ 已實施 | ❌ **無測試** |
| Single-user flows stable | ✅ 已實施 | ❌ **無回歸測試** |

---

## 🎯 待辦清單 (按優先級)

### P0 - Critical

1. **API Key Scope Enforcement Test**
   ```typescript
   // 需要測試
   describe('API key scope enforcement', () => {
     it('should reject API key with wrong scope', async () => {
       // scope: 'DIARY_READ' 不能呼叫 DIARY_CREATE
     })
     it('should reject API key trying to read diaries', async () => {
       // 驗證 API key 不能用於 GET /api/diaries
     })
   })
   ```

2. **Privacy Filtering Test**
   ```typescript
   // 需要測試
   describe('Compare privacy filtering', () => {
     it('should exclude transactions from partner view', () => {
       // serializeDiaryForPartnerView 必須移除 transactions
     })
     it('should exclude alerts from partner view', () => {
       // serializeDiaryForPartnerView 必須移除 alerts
     })
   })
   ```

### P1 - High

3. **Single-User Regression Test**
   ```typescript
   // 需要測試
   describe('Single-user diary flows', () => {
     it('should work normally without partners', async () => {
       // 無 partner 時應為標準單一用戶行為
     })
   })
   ```

4. **Partner Sharing Visibility Test**
   ```typescript
   // 需要測試
   describe('Partner sharing visibility', () => {
     it('should only show diaries after accept', async () => {
       // acceptedAt 之前的日記不應出現
     })
   })
   ```

### P2 - Medium

5. **解決 Open Questions**
   - 確認 mutual accept UX
   - 確認 timezone 行為
   - 確認 empty slot UX

6. **手動 QA Checklist**
   - [ ] Partner 創建流程
   - [ ] Partner 接受流程
   - [ ] API key 創建與使用
   - [ ] Compare 頁面正常顯示
   - [ ] Privacy 過濾生效（持股不顯示）

---

## 📊 完成度重評估

如果以「功能可用性」為標準：
- **核心功能**: 100% 完成
- **測試覆蓋**: 30% 完成
- **文檔驗證**: 50% 完成

如果以「生產就緒」為標準：
- **當前狀態**: 85% 完成
- **阻礙因素**: 缺少關鍵安全測試（API key scope、privacy filtering）

---

## 💡 建議

1. **立即添加 P0 測試** - 這是安全相關，不應跳過
2. **完成後移到 `docs/completed/`** - 功能本身已完成
3. **創建實施摘要** - 記錄實施決策（timezone、accept UX 等）
