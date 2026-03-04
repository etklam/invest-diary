# Issue: Token 比預期快到期（使用者需頻繁重新登入）

日期: 2026-03-05  
狀態: 已定位主因，已修正主要路徑，仍有次要風險待評估

## 問題描述
- 使用者回報 token 比預期快到期，希望至少一個月內不需要重新 login。

## 預期行為
- `refresh-token` 在 30 天內有效時，`access-token` 到期應可自動續發，不應強制重新登入。

## 實際行為（修正前）
- `access-token`（1h）過期後，部分請求會回 401，前端部分頁面會直接清空登入狀態並導頁，造成「約 1 小時就像 session 到期」。

## Root Cause（主因）
1. Access token 設計為 1 小時（預期行為）。
2. 先前 `server/middleware/auth.ts` 對 access token 驗證失敗時，直接視為未登入，沒有在該請求路徑嘗試以 refresh token 恢復會話。
3. 前端多個頁面在 catch 401 時直接 `user.value = null` + `navigateTo('/')`，放大了體感上的「提早過期」。

## 已完成修正
- 檔案: `server/middleware/auth.ts`
- 行為:
  - API 請求若 access token 失效，改為嘗試驗證 refresh token。
  - refresh token 通過驗證且資料庫仍有效時，立即補發新的 access token cookie，並建立 `event.context.user`。
  - 這樣 access token 過期不會直接導致重新登入（refresh token 仍有效時）。

## 驗證證據
- `npm run test -- tests/unit/server/auth.middleware.test.ts`
  - 新增回歸測試: access token 過期可由 refresh token 恢復，測試通過。
- `npm run test -- tests/unit/server/auth.cookies.test.ts tests/api/auth.test.ts`
  - Auth 相關測試通過。

## 其他潛在原因（再次排查後）
1. Cookie 條件風險:
  - `server/utils/auth.ts` 使用 `sameSite: 'strict'`、`secure: process.env.NODE_ENV === 'production'`。
  - 若部署拓樸為跨站/跨子網域請求，或非 HTTPS 生產環境，cookie 可能不帶上或不落地，會導致 refresh 失敗，進而被迫重登。
2. 安全性主動失效（預期）:
  - `server/api/user/password.put.ts` 變更密碼後會 `tokenVersion + 1` 並刪除該使用者全部 refresh token，會要求重新登入。
3. 絕對期限而非滑動期限:
  - 目前 refresh token 30 天是固定到期，未啟用「每次使用延長 30 天」的 sliding session。

## 後續建議
1. 若希望「持續活躍就不需重新登入」，設計 refresh token 旋轉 + sliding expiration。
2. 若部署有跨網域需求，調整 cookie 策略（`sameSite`/`secure`/domain）並驗證實際請求是否攜帶 cookie。
3. 統一前端 401 處理，避免頁面級別直接清空登入狀態（改由單一 auth 策略處理）。
