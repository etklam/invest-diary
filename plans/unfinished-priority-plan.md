# 未完成事項整合計畫（按嚴重度排序）

> 更新日期：2026-02-26
> 範圍：整合目前 `plans/` 內尚未完成的計畫項目

---

## 🔴 Critical（必須先完成）

### 1. 測試基線恢復與覆蓋率達標（阻擋後續重構）
來源：`plans/test-coverage-plan.md`

- [ ] 修復剩餘失敗測試（目前紀錄：56 failures / 7 files）
  - auth-flow、diary-workflow 的 auth context/middleware mock 問題
  - auth API 的 cookie mock 問題（`setCookie/deleteCookie/getCookie`）
  - `usePerformance` 指標評分 assertion 校正
- [ ] 補齊關鍵錯誤情境測試
  - diary API：`401/403/404/500`
  - websocket：`connectionManager`
  - alert：`alert-scheduler`
  - auth middleware
- [ ] 產出 coverage report，達標 `75/65/75/75`（lines/branches/functions/statements）
- [ ] 建立 CI coverage gate（未達門檻即 fail）

完成標準：
- [ ] 所有測試 `0 failures`
- [ ] 覆蓋率達標且 CI 生效

---

## 🟠 High（高風險/高價值，Critical 後立即做）

### 2. 統一 logger 與結構化錯誤處理（production 核心穩定性）
來源：`plans/logger-error-handling-design.md`

- [ ] 導入/確認基礎設施
  - `lib/errors/codes.ts`
  - `lib/errors/factory.ts`
  - `lib/errors/index.ts`
  - `server/middleware/request-id.ts`
  - 增強版 `lib/logger.ts`
- [ ] 依優先級遷移 API
  - P0：`/api/auth/*`、`/api/diaries/*`
  - P1：`/api/alerts/*`、`/api/blog/*`
  - P2：`/api/admin/*`、`/api/discipline/*`
- [ ] 移除 API 內散落的 `console.log/error/warn`
- [ ] 驗證向後相容（回應格式不破壞既有前端）

完成標準：
- [ ] API 全面使用統一 logger
- [ ] 每個 request 可追蹤 request ID
- [ ] 錯誤具備可機器判讀的 error code

---

完成標準：
- [ ] 手機端可在低摩擦流程內完成快速記錄

### 5. Product Roadmap 中期項目
來源：`plans/product-priority-roadmap.md`

- [ ] 投資績效儀表板（報酬率、回撤、策略分類）
- [ ] 智能提醒系統（情境式提醒，避免推播轟炸）
- [ ] 測試覆蓋持續提升（配合功能開發同步補齊）

---


---

## 建議執行順序（單一路線）

1. 完成 Critical 測試基線與 coverage gate
2. 推進 High 的 logger/error handling P0 → P1
3. 完成 High 的 homepage 文案與風險揭露調整
4. 進入 Medium 的 mobile quick diary MVP
5. 依資源排入 Low 的長期戰略項目
