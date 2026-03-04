# Investigation Log - Auth Session Expiry

## 2026-03-05

### 1. 初始排查
- 檢查 token 設定:
  - `lib/jwt.ts`
  - `ACCESS_TOKEN_EXPIRY = '1h'`
  - `REFRESH_TOKEN_EXPIRY = '30d'`
- 檢查 cookie 設定:
  - `server/utils/auth.ts`
  - access maxAge = 1h, refresh maxAge = 30d

### 2. 行為追蹤
- 檢查 refresh flow:
  - `server/api/auth/refresh.post.ts` 可驗 refresh token 並補發 access token（僅 access）。
- 檢查舊 middleware:
  - `server/middleware/auth.ts`（修正前）在 access token 無效時直接 `event.context.user = undefined`，未嘗試 refresh 恢復。
- 檢查前端 401 handling:
  - 多個頁面在 catch 401 時直接清 user 並導頁，放大了 session 中斷體感。

### 3. TDD 驗證（先紅後綠）
- 新增測試:
  - `tests/unit/server/auth.middleware.test.ts`
  - 測試情境: access token 過期、refresh token 有效時應可恢復 session。
- RED:
  - 執行 `npm run test -- tests/unit/server/auth.middleware.test.ts`
  - 新增測試失敗（預期）。
- GREEN:
  - 實作 `server/middleware/auth.ts` refresh recovery。
  - 重跑同一測試後通過。

### 4. 相關回歸
- 執行:
  - `npm run test -- tests/unit/server/auth.cookies.test.ts tests/api/auth.test.ts`
- 結果:
  - 全部通過（15/15）。

### 5. 其他原因再次確認
- `server/api/user/password.put.ts`:
  - 密碼更新會遞增 `tokenVersion` 並刪除所有 refresh token（預期安全機制）。
- `server/utils/auth.ts`:
  - `sameSite: 'strict'` + `secure` 在某些部署拓樸可能影響 cookie 傳遞（需依部署型態確認）。
- refresh token 非 sliding:
  - 目前是固定 30 天絕對期限，非活動延長。
