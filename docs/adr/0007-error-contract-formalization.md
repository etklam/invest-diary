# ADR-0007: Error Contract 正式化（保留 H3 wire shape）

## 決策

跨 client 錯誤契約採用**現有** H3 wire shape，正式化為官方契約：

```text
HTTP status：statusCode
Body：
{
  "statusCode": 404,
  "statusMessage": "...",
  "message": "...",
  "data": { "code": "DIARY_NOT_FOUND", "details": [...] | null, "requestId": "..." }
}
```

- Machine-readable code 位於 `data.code`，值為 `lib/contracts/common/error-codes.ts` 嘅 per-resource code（命名規則 `MODULE_ACTION_REASON`）
- 呢輪唯一新增：`requestId` 加入 error `data`（原本只入 log）；注入點係 nitro `error` hook 一處集中處理 —— `Errors` factory 同 `handleApiError` 都攞唔到 `event`，改佢哋簽名係死路
- Validation error 維持 **400**（`SYS_VALIDATION_ERROR`；Zod → 400 已統一）
- 404/403 語意按 ADR-0006 同 PLAN.md Q5 原則（ownership secrecy → 404；capability/state denial → 403）
- Mobile / native client 嘅 401 處理採 dumb flow：**任何 401 → single-flight refresh → retry 一次 → 再失敗 logout**，唔依賴細分 access-token error code（未來不新增 `AUTH_ACCESS_EXPIRED` 之類區分）

## 原因

- Web client 已經依賴呢個契約：`composables/useErrorI18n.ts` 讀 `data.code`，`lib/errors/i18n-mapping.ts` 將 code 映射三語 i18n key，`tests/unit/i18n-parity.test.ts` 鎖死三語 key set
- Per-resource codes（`DIARY_NOT_FOUND`、`ETF_ALREADY_IN_WATCHLIST`）資訊量嚴格大於 generic codes（`RESOURCE_NOT_FOUND`）—— client 要知「邊種資源出咗咩事」，而家已經有
- 契約已存在且被測試覆蓋，缺嘅只係「寫低 + 補 requestId + 跨 client 測試」

## 取捨

- **選了**：formalize existing contract（保留 envelope + per-resource codes + 400 策略）
- **沒選**：新 envelope `{"error": {code, message, requestId}}` + 11 個 generic codes —— 換契約 = web error handling + 三語 i18n mapping + parity tests 全部重寫，兩個 client 同時 break，換嚟零新能力（mobile 讀 `data.code` 一樣係一行代碼）
- **沒選**：validation 改 422 —— 現狀 400 已統一，改 429/422 類遷移又係一次無意義 break
- **沒選**：新增 `AUTH_ACCESS_EXPIRED` 細分 code 俾 mobile refresh flow —— dumb 401 flow 唔需要區分，少一個 code 少一份語意要維護

## 影響

- 新增 error code 跟 `MODULE_ACTION_REASON` 命名 + 補三語 i18n key（parity test 把關）
- 刪 code 時要同步刪三語 key（例：本輪刪 `DIARY_ACCESS_DENIED`）
- Expo client 嘅 error 處理直接以 `data.code` + HTTP status 為準，不 parse message
- `requestId` 令 client 回報問題時可以直接對返 server log

## 參考

- `.scratch/app-ready-auth-api/PLAN.md`（Q1，2026-08-30 grill session 拍板）
- `lib/contracts/common/error-codes.ts`、`lib/errors/factory.ts`、`server/utils/error-handler.ts`
