# ADR-0006: Multi-client Credential Resolution（fail-closed）

## 決策

所有 `/api/**` request 由單一 credential resolution 演算法處理，產生 `event.context.auth`（verified transport + identity）；`event.context.user` 保留為現有 handler 嘅相容層。演算法：

```text
1. Detect explicit credentials（Authorization header? x-api-key header?）
2. >1 explicit credential source → reject ambiguous（401 AUTH_TOKEN_INVALID）
3. 恰一個 explicit credential：
     Authorization: Bearer dva_xxx → verify API key
     Authorization: Bearer <JWT>   → verify access JWT
     x-api-key: dva_xxx            → verify API key
   驗證成功 → use explicit identity → transport = bearer / api-key
   驗證失敗 → 401 → 唔准 fallback 去 cookie
4. 冇 explicit credential → try cookie
5. Cookie 成功 → transport = cookie
6. 否則 → anonymous
```

CSRF 決策只根據**已驗證嘅** auth transport：`cookie` → requireCsrf；`bearer` / `api-key` → 豁免。CSRF 唔再根據 raw header 嘅存在性或前綴猜測（此決策同時終結 `server/middleware/csrf.ts` `isApiKeyAuth()` 嘅 pre-verification header-sniff 缺陷）。

Cookie 路徑內部嘅 access→refresh transparent recovery 保留：同一 transport、同一 session，唔構成「另一個 identity source」。

核心 invariant：

> **Credential resolution is fail-closed. Once an explicit credential is supplied, its failure must never cause authentication to fall back to another identity source.**

兩條實作約束（本決策的一部分）：

- 「驗證失敗」指 signature、expiry、required claims（`type` / `userId`）任何一項不通。malformed payload（簽章有效但 claim 異常）一律 401，唔構成任何 fallback 條件。
- auth middleware 必須先於 csrf middleware 執行，以 integration test 鎖定；Nitro 檔名字母序（admin → auth → csrf）係巧合，唔係本決策嘅依據。

## 原因

- **Confused deputy 防護**：`Browser cookie = Admin B` + `Authorization = Bearer <garbage>` 嘅 mutation 請求，絕對唔可以靜靜地以 Admin B 身份成功執行。fallback 會令 caller 表示咗「我要用呢粒 token」但 server 用咗另一個身份完成操作 —— 比 401 更難 debug，亦係 security boundary 最唔應該有嘅 implicit behaviour。
- **多 client 可預測性**：Web（cookie）、Native（bearer）、Agent（API key）並存時，「邊個 credential 話事」必須係 deterministic 契約，唔可以係 incidental middleware 行為。
- **修復現存缺陷**：舊邏輯憑 `Bearer dva_` 前綴就跳過 CSRF，未經任何驗證 —— 任何加得呢個 header 嘅 request 都令 cookie 認證免 CSRF（當時靠 `SameSite=strict` 主防線頂住）。

## 取捨

- **選了**：invalid explicit credential → 401，唔 fallback cookie（fail-closed）
- **沒選**：header 驗證失敗跌返 cookie —— 對 browser extension 亂加 Authorization header 嘅少數 user 較「友善」，但代價係 identity 語意混濁；呢類 user 會得到穩定 401（有 log 可查），好過 request 神秘地以 cookie user 身份執行
- **沒選**：`Authorization` > `x-api-key` 優先級 —— 兩個都係 explicit credential，冇 ambient vs explicit 嘅自然優次；拒絕 ambiguity 優於任意揀一個「勝出」
- **沒選**：public endpoint 對 invalid credential 視而不見 —— 統一 401，同一個 header 喺任何 route 語意一致，最易測試

## 影響

- Web 現有行為零變更（web 從不帶 Authorization header）
- Public endpoint 對 invalid explicit credential 一律 401（登入前嘅 `/api/auth` 不受影響，冇 credential 就係 anonymous）
- Mixed credential（valid Bearer + valid cookie 並存）→ Bearer 贏，log warning，唔 log token 內容
- Critical regression test 必須鎖死：`valid cookie + Bearer garbage + 冇 CSRF → must fail`
- Native / Agent client 從此可以信賴：送咗 explicit credential，server 就只會用佢，或者拒絕

## 參考

- `.scratch/app-ready-auth-api/PLAN.md`（Q2，2026-08-30 grill session 拍板）
