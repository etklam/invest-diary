# 個股追蹤系統提案：Agent-first Timeline

## 0. 結論先講

這個功能要改方向。舊提案把個股追蹤想成「使用者手動 CRUD watchlist + 分類筆記」，這條路現在不對。主要 writer 不是 end user，而是 Ana 這類 AI agent。用戶真正需要的是：Ana 處理財經影片、文章、交易日記時，發現內容提到已追蹤股票，就自動替該股票追加一條線性 timeline record。

所以新架構核心不是 `StockNote` 分類筆記本，而是：

- `Stock`: 股票主檔，做 canonical symbol。
- `StockWatchlist`: 使用者追蹤哪些股票。
- `StockTimelineRecord`: Ana 寫入的線性記錄，包含日期、摘要、來源、信心分數、idempotency key。

前端也不要再搞完整筆記 CRUD UI。用戶主要是「看」：看某隻股票過去被 Ana 提到過什麼、來源是哪支影片或哪篇文章、時間線怎麼演進。最多讓用戶加/刪追蹤股票。原本那套技術面、基本面、關注點、風險分類先收起來，別第一版就把產品做成表單博物館，挺熱鬧但沒抓到真正使用場景。

## 1. 本次檢查範圍

這次修改基於以下實際 codebase：

- 舊 proposal：`plans/stock-tracking-proposal.md`
- Agent diary API：`server/api/agent/diaries.post.ts`
- API key 驗證：`server/utils/api-key.ts`
- Diary 寫入集中入口：`server/utils/diary-write.ts`
- Web diary API：`server/api/diaries.post.ts`
- Diary update path：`server/api/diaries/[id].put.ts`
- 目前 Prisma schema：`prisma/schema.prisma`

現有 agent API pattern 很清楚：

- `server/api/agent/diaries.post.ts` 不吃 web session，而是呼叫 `requireApiKey(event, 'DIARY_CREATE')`。
- API key 從 `x-api-key` 或 `Authorization: Bearer ...` 讀取。
- 驗證通過後用 `auth.user.id` 當真正 user scope。
- 寫入 diary 時走 `createDiaryForUser()`，並標記 `createdVia: 'API_KEY'`、`createdByLabel: auth.label`。
- `appendToToday` 對 API key diary creation 被明確禁止。
- 錯誤處理走 `AppError -> toH3Error()`，其他錯誤記 log 後包成 internal error。

個股追蹤 agent API 應該照這條路走：專用 `/api/agent/stocks/...` endpoint、API key auth、user scope 來自 key、寫入集中 utility、可追溯 `createdByLabel`。別自己另起一套鑑權，不然後面會變成「同一個 Ana 兩種身份」，那就真有點離譜了。

## 2. 新產品模型

### 2.1 寫入者

主要 writer 是 Ana。

典型流程：

1. 用戶讓 Ana 執行 `trade-basic-diary` 或 `video-transcribe-summarize`。
2. Ana 解析內容時取得目前追蹤股票清單。
3. Ana 發現內容提到已追蹤股票，例如 `NVDA`、`TSLA`、`2330.TW`。
4. Ana 產生一條短摘要和來源資訊。
5. Ana 呼叫 agent API，把 record 寫入該股票 timeline。
6. 用戶稍後打開股票頁，只看到一條按時間排列的脈絡記錄。

### 2.2 使用者角色

用戶不是主要筆記輸入者。

P0 用戶能力應該只有：

- 新增追蹤股票。
- 移除或封存追蹤股票。
- 查看所有追蹤股票的最新 record。
- 查看單一股票的 timeline。
- 從 timeline record 跳回來源 diary、影片、文章或外部 URL。

可以有少量管理能力，例如刪除錯誤 record 或隱藏 record，但不要做大型手動 editor。要寫手動研究筆記的衝動先忍一下，現在的主線是 Ana 寫入。

### 2.3 資料形狀

每條 record 應該像這樣：

```json
{
  "symbol": "NVDA",
  "occurredAt": "2026-05-01T09:30:00.000Z",
  "summary": "影片提到 NVDA 的資料中心需求仍強，但市場已經開始關注毛利率能否維持。",
  "sourceType": "VIDEO_TRANSCRIBE_SUMMARIZE",
  "sourceTitle": "某某財經頻道 2026-05-01",
  "sourceUrl": "https://example.com/video/123",
  "sourceExcerpt": "原文或 transcript 中提到 NVDA 的片段",
  "confidence": 86,
  "idempotencyKey": "video:123:nvda:segment-4"
}
```

這就是 timeline，不是分類筆記。分類可以後面再從 timeline 上衍生，不要倒過來把第一版 schema 綁死。

## 3. 架構決策

### 3.1 不做 `StockNoteCategory`

舊版的 `GENERAL / TECHNICAL / FUNDAMENTAL / WATCHPOINT / RISK / TRADE_REVIEW` 先砍掉。

原因：

- Ana 寫入的是「來源事件摘要」，不是使用者在填研究模板。
- 同一段內容可能同時有基本面和風險，硬分類會逼 agent 做無意義判斷。
- UI 第一需求是 chronological context，不是分類管理。
- P0 分類會增加 schema、API、filter、i18n、測試成本，但不增加核心價值。

要分類，P1 以後可在 record 上加 `tagsString` 或 AI-generated labels。第一版不要把未驗證的分類當核心資料模型，這玩意兒一旦進 DB，後面遷移就是自找罪受。

### 3.2 來源欄位內嵌在 timeline record

舊版 `StockNoteSource` 是為「一條 note 可連多個來源」設計的。新需求是一條 timeline record 本身就是一次來源事件，所以 P0 不需要拆 source table。

P0 做法：

- `StockTimelineRecord.summary` 是 Ana 給用戶看的摘要。
- `sourceType/sourceTitle/sourceUrl/sourceDiaryId/sourceExcerpt/sourceExternalId` 直接放 record。
- 若未來真的需要多來源合併，再加 `StockTimelineRecordSource`，不要第一版就過度正規化。

### 3.3 Server 只寫已追蹤股票

核心規則：提到已追蹤的股票才追加 record。

所以 P0 server 行為應該是：

- Ana 可送一批候選 records。
- Server 逐筆確認 `userId + symbol` 是否存在 active watchlist。
- 已追蹤：寫入 timeline。
- 未追蹤：跳過，回傳 `skipped` reason。
- 不要因為 Ana 提到一堆 ticker 就自動建立 watchlist。

自動幫用戶追蹤一堆股票看起來很勤快，實際上就是高級垃圾製造機。這裡得保守。

### 3.4 Agent API 是 P0 核心，不是 P1 加分項

舊提案把 extraction / automation 放在後面，這次要反過來。

P0 成功標準：

- Ana 能用 API key 讀到用戶 watchlist。
- Ana 能把已追蹤股票的 record 寫入 timeline。
- 寫入具備 idempotency，重跑同一支影片不會重複塞資料。
- 用戶能讀 timeline。

如果沒有 agent write-in，這功能就只剩一個普通 watchlist，白忙活。

## 4. Database Schema 設計

### 4.1 建議新增 enum

```prisma
enum StockWatchStatus {
  WATCHING
  ARCHIVED
}

enum StockTimelineSourceType {
  TRADE_BASIC_DIARY
  VIDEO_TRANSCRIBE_SUMMARIZE
  DIARY
  ARTICLE
  MANUAL
  SYSTEM
}

enum StockTimelineCreatedVia {
  API_KEY
  WEB
  SYSTEM
}
```

`MANUAL` 和 `WEB` 只是保留逃生門，不代表 P0 要做完整手動寫入 UI。

### 4.2 `Stock`

```prisma
model Stock {
  id          BigInt   @id @default(autoincrement())
  symbol      String   @unique @db.VarChar(32)
  quoteSymbol String?  @map("quote_symbol") @db.VarChar(32)
  name        String?  @db.VarChar(255)
  exchange    String?  @db.VarChar(32)
  currency    String?  @db.VarChar(8)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  watchlists  StockWatchlist[]
  records     StockTimelineRecord[]

  @@index([symbol], map: "stocks_symbol_idx")
  @@map("stocks")
}
```

設計重點：

- `symbol` 是 app canonical symbol，例如 `AAPL`、`NVDA`、`2330.TW`。
- `quoteSymbol` 是報價 provider 需要的 symbol，例如 `^GSPC` 這種轉換值。
- P0 不要求 name/exchange/currency 必填，Ana 寫 timeline 不該被報價資料卡住。

### 4.3 `StockWatchlist`

```prisma
model StockWatchlist {
  id        BigInt           @id @default(autoincrement())
  userId    BigInt           @map("user_id")
  stockId   BigInt           @map("stock_id")
  status    StockWatchStatus @default(WATCHING)
  sortOrder Int              @default(0) @map("sort_order")
  createdAt DateTime         @default(now()) @map("created_at")
  updatedAt DateTime         @updatedAt @map("updated_at")

  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  stock     Stock            @relation(fields: [stockId], references: [id], onDelete: Cascade)

  @@unique([userId, stockId], map: "stock_watchlists_user_stock_key")
  @@index([userId, status, sortOrder], map: "stock_watchlists_user_status_sort_idx")
  @@map("stock_watchlists")
}
```

設計重點：

- P0 只有追蹤狀態和排序。
- 不放 `thesis`、`priority`、`tags`，因為用戶不是主要 writer。
- `ARCHIVED` 用於停止追蹤但保留歷史 timeline。

### 4.4 `StockTimelineRecord`

```prisma
model StockTimelineRecord {
  id               BigInt                  @id @default(autoincrement())
  userId           BigInt                  @map("user_id")
  stockId          BigInt                  @map("stock_id")
  summary          String                  @db.Text
  sourceType       StockTimelineSourceType @map("source_type")
  sourceTitle      String?                 @map("source_title") @db.VarChar(255)
  sourceUrl        String?                 @map("source_url") @db.VarChar(1000)
  sourceDiaryId    BigInt?                 @map("source_diary_id")
  sourceExternalId String?                 @map("source_external_id") @db.VarChar(255)
  sourceExcerpt    String?                 @map("source_excerpt") @db.Text
  confidence       Int?                    @db.UnsignedTinyInt
  idempotencyKey   String                  @map("idempotency_key") @db.VarChar(128)
  occurredAt       DateTime                @map("occurred_at")
  createdVia       StockTimelineCreatedVia @default(API_KEY) @map("created_via")
  createdByLabel   String?                 @map("created_by_label") @db.VarChar(100)
  metadataJson     String?                 @map("metadata_json") @db.Text
  createdAt        DateTime                @default(now()) @map("created_at")
  updatedAt        DateTime                @updatedAt @map("updated_at")

  user             User                    @relation(fields: [userId], references: [id], onDelete: Cascade)
  stock            Stock                   @relation(fields: [stockId], references: [id], onDelete: Cascade)
  sourceDiary      Diary?                  @relation(fields: [sourceDiaryId], references: [id], onDelete: SetNull)

  @@unique([userId, stockId, idempotencyKey], map: "stock_timeline_records_user_stock_idempotency_key")
  @@index([userId, stockId, occurredAt(sort: Desc)], map: "stock_timeline_records_user_stock_time_idx")
  @@index([userId, occurredAt(sort: Desc)], map: "stock_timeline_records_user_time_idx")
  @@index([sourceType, sourceExternalId], map: "stock_timeline_records_source_external_idx")
  @@index([sourceDiaryId], map: "stock_timeline_records_source_diary_idx")
  @@map("stock_timeline_records")
}
```

需要補 relation：

```prisma
model User {
  stockWatchlist       StockWatchlist[]
  stockTimelineRecords StockTimelineRecord[]
}

model Diary {
  stockTimelineRecords StockTimelineRecord[]
}
```

`Transaction` P0 不需要 relation。來源是 Ana 處理流程，不是交易明細本身。交易可以在 UI 額外查現有 `transactions` 來顯示，不要硬塞進 timeline source。

### 4.5 API key scope 調整

目前 `ApiKeyScope` 只有：

```prisma
enum ApiKeyScope {
  DIARY_CREATE
}
```

P0 建議改成：

```prisma
enum ApiKeyScope {
  DIARY_CREATE
  AGENT_WRITE
}
```

並把 `requireApiKey()` 從只接受單一 expected scope，調整成可接受 allowed scopes：

```ts
requireApiKey(event, ['DIARY_CREATE', 'AGENT_WRITE'])
requireApiKey(event, ['AGENT_WRITE'])
```

原因：

- 既有 diary API 保持向後相容，舊 key 還能只做 diary create。
- Ana 新 key 可用 `AGENT_WRITE` 同時寫 diary 和 stock timeline。
- 不要逼 Ana 同時帶兩把 API key，一把寫 diary、一把寫股票，這種設計一看就像半夜拍腦袋拍出來的。

如果想做更完整的權限模型，P1 再把單一 `scope` 升級成多 scopes；P0 用 `AGENT_WRITE` 先把產品跑通。

## 5. Agent API 設計

### 5.1 `GET /api/agent/stocks/watchlist`

用途：Ana 先取得用戶目前追蹤股票，處理影片或文章時只針對這些 symbols 產生 record。

Auth：

- `requireApiKey(event, ['AGENT_WRITE'])`

Response：

```json
{
  "symbols": [
    {
      "symbol": "NVDA",
      "name": "NVIDIA Corporation",
      "status": "WATCHING"
    },
    {
      "symbol": "TSLA",
      "name": "Tesla Inc.",
      "status": "WATCHING"
    }
  ]
}
```

行為：

- 只回 `status=WATCHING`。
- 永遠用 `auth.user.id` scope。
- 不回 archived symbols，避免 Ana 對停止追蹤的股票繼續寫。

### 5.2 `POST /api/agent/stocks/records`

用途：Ana 批量追加 timeline records。

Auth：

- `requireApiKey(event, ['AGENT_WRITE'])`

Request：

```json
{
  "records": [
    {
      "symbol": "NVDA",
      "summary": "影片提到 NVDA 資料中心需求仍強，但毛利率壓力是後續觀察點。",
      "occurredAt": "2026-05-01T09:30:00.000Z",
      "sourceType": "VIDEO_TRANSCRIBE_SUMMARIZE",
      "sourceTitle": "AI 晶片產業更新",
      "sourceUrl": "https://example.com/video/123",
      "sourceExternalId": "youtube:abc123",
      "sourceExcerpt": "transcript 原文片段",
      "confidence": 86,
      "idempotencyKey": "youtube:abc123:nvda:segment-04",
      "metadata": {
        "workflow": "video-transcribe-summarize",
        "segmentIndex": 4
      }
    }
  ]
}
```

Response：

```json
{
  "created": [
    {
      "id": "101",
      "symbol": "NVDA",
      "occurredAt": "2026-05-01T09:30:00.000Z"
    }
  ],
  "updated": [],
  "skipped": [
    {
      "symbol": "AMD",
      "reason": "NOT_WATCHED"
    }
  ]
}
```

Validation：

- `records` 必須是非空 array，P0 上限建議 50。
- `symbol` 必須 normalize，例如 trim + uppercase，保留 `.TW` 類 suffix。
- `summary` 必填，長度建議 1-2000。
- `sourceType` 必須是 enum。
- `confidence` 若提供，必須是 0-100。
- `idempotencyKey` 必填。若 Ana 沒提供，server 可以用 `sourceType + sourceExternalId/sourceUrl + symbol + normalized summary hash` 生成，但 API contract 應鼓勵 Ana 明確提供。

寫入規則：

- `Stock` 不存在時可 upsert `Stock`，但只有 watchlist active 才寫 record。
- `StockWatchlist` 不存在或 `ARCHIVED`：不寫，回 `skipped: NOT_WATCHED`。
- 同一 `userId + stockId + idempotencyKey` 已存在：更新 `summary/confidence/sourceExcerpt/metadataJson/updatedAt`，回 `updated`，不要新增。
- 單筆失敗不應讓整批全失敗，除非 request schema 本身非法。
- 所有 BigInt 回傳 string，沿用現有 API 習慣。

### 5.3 `POST /api/agent/stocks/records/from-diary`

這個 endpoint 可選，P0 不一定要做。

用途：如果 Ana 已透過 `/api/agent/diaries` 建立 diary，並希望 stock timeline record 直接關聯該 diary，可送：

```json
{
  "diaryId": "123",
  "records": [
    {
      "symbol": "TSLA",
      "summary": "今日交易日記中提到 TSLA 反彈失敗，後續觀察 180 支撐。",
      "sourceType": "TRADE_BASIC_DIARY",
      "idempotencyKey": "diary:123:tsla:main"
    }
  ]
}
```

Server 必須確認：

- diary 存在。
- diary 屬於 `auth.user.id`。
- 寫入時填 `sourceDiaryId`。

如果要省 endpoint，`POST /api/agent/stocks/records` 也可以接受 `sourceDiaryId`，但一定要做 ownership check。這種地方偷懶就是跨用戶資料外洩預告片。

## 6. User-facing API 設計

### 6.1 Watchlist

| Method | Endpoint | 用途 |
|---|---|---|
| `GET` | `/api/stocks/watchlist` | 取得使用者追蹤股票，含 latest record summary/count |
| `POST` | `/api/stocks/watchlist` | 加入 symbol，upsert `Stock`，建立或恢復 `StockWatchlist` |
| `PATCH` | `/api/stocks/watchlist/[id]` | 更新 `sortOrder` 或 `status` |
| `DELETE` | `/api/stocks/watchlist/[id]` | P0 建議改成 `ARCHIVED`，保留 timeline |

`POST /api/stocks/watchlist`：

```json
{
  "symbol": "NVDA",
  "name": "NVIDIA Corporation"
}
```

注意：

- 不要要求 Yahoo validation 成功才能加入。追蹤名單是研究資料，不是報價系統的附庸。
- duplicate active watchlist 回既有 item 或 `409` 都可以，但行為要固定。

### 6.2 Timeline

| Method | Endpoint | 用途 |
|---|---|---|
| `GET` | `/api/stocks/[symbol]/timeline` | 取得單一股票 timeline |
| `GET` | `/api/stocks/timeline` | 取得所有追蹤股票 timeline feed，可支援 `symbol/sourceType/page` |
| `DELETE` | `/api/stocks/timeline/[id]` | 用戶刪除錯誤 record，P0 可選 |

`GET /api/stocks/[symbol]/timeline` response：

```json
{
  "stock": {
    "symbol": "NVDA",
    "name": "NVIDIA Corporation"
  },
  "watchlist": {
    "id": "10",
    "status": "WATCHING"
  },
  "records": [
    {
      "id": "101",
      "summary": "影片提到 NVDA 資料中心需求仍強，但毛利率壓力是後續觀察點。",
      "occurredAt": "2026-05-01T09:30:00.000Z",
      "sourceType": "VIDEO_TRANSCRIBE_SUMMARIZE",
      "sourceTitle": "AI 晶片產業更新",
      "sourceUrl": "https://example.com/video/123",
      "sourceExcerpt": "transcript 原文片段",
      "confidence": 86,
      "createdByLabel": "Ana"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 30,
    "total": 1
  }
}
```

所有 user-facing API 都必須：

- 用 `requireUser(event)`。
- 永遠用 `userId` scope。
- 查 record 時不能只靠 record id，必須確認 record 屬於 current user。

## 7. Ana 觸發點設計

### 7.1 `trade-basic-diary`

建議流程：

1. Ana 開始處理前呼叫 `GET /api/agent/stocks/watchlist`。
2. Ana 產生日記內容時，同步掃描 diary summary、交易標的、反思內容。
3. 對命中的 watchlist symbol 產生 timeline record。
4. 若 diary 已透過 `/api/agent/diaries` 寫入成功，record 帶 `sourceDiaryId`。
5. 呼叫 `POST /api/agent/stocks/records`。

`idempotencyKey` 建議：

```text
trade-basic-diary:{diaryId}:{symbol}:{normalized-section-hash}
```

若 diary 尚未建立、只有外部 workflow run id：

```text
trade-basic-diary:{workflowRunId}:{symbol}:{normalized-section-hash}
```

### 7.2 `video-transcribe-summarize`

建議流程：

1. Ana 取得 watchlist symbols。
2. 轉錄或摘要每個 segment 時比對 symbols。
3. 只對被提到且在 watchlist 的 symbol 產生 record。
4. 每段影片或每個主題最多產生一條摘要，不要每提一次 ticker 就塞一條。

`idempotencyKey` 建議：

```text
video-transcribe-summarize:{videoId}:{symbol}:{segmentIndex}
```

或：

```text
video-transcribe-summarize:{sourceUrlHash}:{symbol}:{excerptHash}
```

### 7.3 Server 是否需要再做 symbol extraction

P0 不把 server-side extraction 當主線。

理由：

- Ana 已經在處理影片/文章/日記，最懂當下上下文。
- Server regex 很容易把 `AI`、`CEO`、`EPS` 這類詞搞成股票。
- 需求說的是 Ana 發現提到股票後追加 record，不是 server 偷偷在所有 diary 後面掃一遍。

但 server 必須做防線：

- Normalize symbol。
- 檢查 watchlist。
- idempotency 去重。
- ownership check。
- confidence range validation。

P1 可以補 `server/utils/stock-timeline-extraction.ts` 做 backfill 或 diary update 掃描，但不要搶 P0 主線。

## 8. 前端設計

### 8.1 路由

P0 建議：

- `/stocks/watchlist`: 追蹤股票清單。
- `/stocks/[symbol]`: 單一股票 timeline。
- `/stocks`: 保留現有持倉/績效 dashboard，只加入口，不要硬塞 timeline。

原因：`pages/stocks/index.vue` 目前已經是交易儀表板。再把 agent timeline 塞進去，會變成一鍋東北亂燉，香是香，維護的人會想離職。

### 8.2 Components

新增 `components/stocks/`：

- `StockWatchlistTable.vue`: 顯示 symbol、最新 record、record count、最後更新時間、移除/封存。
- `StockWatchlistAddForm.vue`: 新增追蹤股票。
- `StockTimeline.vue`: 按日期排序顯示 records。
- `StockTimelineItem.vue`: 單條 record，顯示摘要、來源、confidence、外部連結。
- `StockSourceBadge.vue`: 顯示 `TRADE_BASIC_DIARY` / `VIDEO_TRANSCRIBE_SUMMARIZE` / `ARTICLE`。
- `StockEmptyTimeline.vue`: 已追蹤但尚無 Ana record 的空狀態。

不做：

- `StockNoteEditor.vue`
- `StockAnalysisSections.vue`
- 技術面/基本面/風險四區塊
- 大型手動 CRUD note UI

### 8.3 Detail 頁資訊架構

`/stocks/[symbol]`：

1. Header：symbol、name、watch status、latest quote（如果既有 quote helper 可用）。
2. Timeline：主要內容，按 `occurredAt desc` 顯示。
3. Source affordance：每條 record 可點來源 URL 或 diary link。
4. 側邊/下方輔助資訊：最近交易、目前持倉，可使用既有 stocks API 補資料。

UI 重點是掃讀時間線，不是填表。Timeline item 的摘要應該短、清楚、有來源。不要用一堆 badge 把畫面弄成機票登機牌。

## 9. 實作優先級

### P0: Agent write-in MVP

目標：Ana 能穩定寫入 timeline，用戶能管理 watchlist 並閱讀 timeline。

工作：

1. Schema migration
   - 新增 `Stock`。
   - 新增 `StockWatchlist`。
   - 新增 `StockTimelineRecord`。
   - 補 `User`、`Diary` relations。
   - 新增 enum：`StockWatchStatus`、`StockTimelineSourceType`、`StockTimelineCreatedVia`、`ApiKeyScope.AGENT_WRITE`。

2. API key auth
   - 調整 `requireApiKey()` 支援 allowed scopes array。
   - `/api/agent/diaries.post.ts` 接受 `DIARY_CREATE` 或 `AGENT_WRITE`。
   - 新增 agent stock endpoints 使用 `AGENT_WRITE`。

3. Agent API
   - `GET /api/agent/stocks/watchlist`
   - `POST /api/agent/stocks/records`
   - 實作 batch validation、watchlist gating、idempotent upsert、BigInt string serialization。

4. User API
   - `GET/POST/PATCH/DELETE /api/stocks/watchlist`
   - `GET /api/stocks/[symbol]/timeline`
   - `GET /api/stocks/timeline`

5. Frontend
   - `/stocks/watchlist`
   - `/stocks/[symbol]`
   - timeline read-only components。
   - 現有 `/stocks` 加入口即可。

6. Ana integration contract
   - 更新 `trade-basic-diary` workflow：寫 diary 後寫 stock records。
   - 更新 `video-transcribe-summarize` workflow：摘要 segment 時寫 stock records。
   - 明確定義 `idempotencyKey` 生成規則。

7. Tests
   - API key scope tests。
   - agent watchlist read tests。
   - agent record write tests：created / updated / skipped。
   - idempotency regression tests。
   - timeline read authorization tests。

P0 不做：

- LLM server-side extraction。
- 文章 backfill。
- 完整手動 note editor。
- 分類 tab。
- review queue。

### P1: 來源品質與補救能力

目標：讓 timeline 更可靠、更可查。

工作：

- 支援 `sourceDiaryId` ownership check 與 diary link。
- 支援 source excerpt 摺疊/展開。
- 支援用戶刪除或隱藏錯誤 record。
- 新增 `GET /api/stocks/[symbol]/timeline?sourceType=...` filter。
- 補 `metadataJson` schema 規範，例如 `workflowRunId`、`segmentIndex`、`model`。
- 若 OpenClaw/Ana workflow 有 run id，統一寫入 metadata。

### P2: Backfill / Candidate

目標：處理歷史資料，但保持可控。

工作：

- `POST /api/stocks/timeline/backfill/diaries`：掃既有 diary，只針對 watchlist symbols。
- `POST /api/stocks/timeline/preview`：只回 candidates，不寫 DB。
- 對未追蹤股票建立 candidate，不自動加入 watchlist。
- 可選新增 `StockMentionCandidate`，讓用戶決定是否追蹤。

### P3: 智能整理

目標：在 timeline 上疊加更高階理解，不破壞原始線性記錄。

工作：

- AI 產生每週/每月 stock digest。
- 從 timeline record 自動產生 labels/tags。
- 合併相似 records。
- 提供「這隻股票最近觀點變化」摘要。
- 對低 confidence record 進 review queue。

## 10. 測試策略

### Unit tests

- `normalizeStockSymbol()`
  - trim / uppercase。
  - `$NVDA` -> `NVDA`。
  - `2330.TW` 保留 suffix。
  - 空字串或非法 symbol 拒絕。

- `buildStockTimelineIdempotencyKey()`
  - 同 source + symbol + segment 產生穩定 key。
  - 不同 segment 不碰撞。

### API tests

- `GET /api/agent/stocks/watchlist`
  - 沒 API key 回 unauthorized。
  - `DIARY_CREATE` legacy key 不可讀。
  - `AGENT_WRITE` key 可讀。
  - 只回 current key user 的 active watchlist。

- `POST /api/agent/stocks/records`
  - 寫入已追蹤股票成功。
  - 未追蹤股票回 `skipped: NOT_WATCHED`。
  - 重複 `idempotencyKey` update 而不是 insert。
  - `sourceDiaryId` 不屬於 user 時拒絕。
  - batch 中一筆 skipped 不影響其他 valid records。

- User timeline API
  - 只能讀 current user records。
  - archived watchlist 的 timeline 仍可讀，或產品若決定不可讀，要測清楚。
  - pagination 正確。

### Integration tests

- 建立 watchlist `NVDA`。
- 用 `AGENT_WRITE` key 寫入 `NVDA` record。
- 讀 `/api/stocks/NVDA/timeline` 能看到 record。
- 對同一 `idempotencyKey` 再寫一次，record count 不增加。
- 寫入 `AMD` 且未追蹤，timeline 不出現。

## 11. 主要風險與應對

### 11.1 Ana 誤判 symbol

風險：影片裡的 `AI`、`CEO`、`EPS` 被當 ticker。

應對：

- Ana 先讀 watchlist，只匹配已追蹤 symbols。
- Server 再做 watchlist gating。
- 未追蹤永遠不自動寫入 timeline。

### 11.2 重複寫入

風險：同一影片重跑、同一 diary 重建，timeline 塞一堆重複摘要。

應對：

- `idempotencyKey` 必填或 server fallback 生成。
- DB unique：`userId + stockId + idempotencyKey`。
- duplicate 時 update，不 insert。

### 11.3 API key scope 過粗

風險：`AGENT_WRITE` 同時能寫 diary 和 stock timeline，權限比 `DIARY_CREATE` 大。

應對：

- P0 明確標示 `AGENT_WRITE` 是 Ana 專用。
- API key UI 顯示 scope 說明。
- P1 再改多 scopes 或細分 `STOCK_TIMELINE_WRITE`。

### 11.4 Timeline 變垃圾桶

風險：Ana 太勤快，每支影片每個 ticker 都寫十幾條。

應對：

- Agent contract 規定每個 `source + symbol + topic/segment` 最多一條。
- API batch 上限 50。
- UI 顯示 source grouping。
- P1 增加刪除/隱藏錯誤 record。

### 11.5 來源刪除語義

風險：source diary 被刪除後，timeline record 怎麼辦？

建議：

- `sourceDiaryId` 用 `onDelete: SetNull`。
- 保留 `sourceTitle/sourceExcerpt`。
- UI 顯示來源已刪除。
- 不要默默 cascade delete timeline，除非產品明確要求。

## 12. 建議落地檔案清單

Schema / migration：

- `prisma/schema.prisma`
- `prisma/migrations/<timestamp>_add_agent_stock_timeline/migration.sql`

Server utils：

- `lib/stocks/symbols.ts`
- `server/utils/stock-timeline-records.ts`
- 修改 `server/utils/api-key.ts`

Agent API：

- `server/api/agent/stocks/watchlist.get.ts`
- `server/api/agent/stocks/records.post.ts`

User API：

- `server/api/stocks/watchlist/index.get.ts`
- `server/api/stocks/watchlist/index.post.ts`
- `server/api/stocks/watchlist/[id].patch.ts`
- `server/api/stocks/watchlist/[id].delete.ts`
- `server/api/stocks/[symbol]/timeline.get.ts`
- `server/api/stocks/timeline.get.ts`
- `server/api/stocks/timeline/[id].delete.ts`（P1 可選）

Frontend：

- `pages/stocks/watchlist.vue`
- `pages/stocks/[symbol].vue`
- `components/stocks/StockWatchlistTable.vue`
- `components/stocks/StockWatchlistAddForm.vue`
- `components/stocks/StockTimeline.vue`
- `components/stocks/StockTimelineItem.vue`
- `components/stocks/StockSourceBadge.vue`
- `components/stocks/StockEmptyTimeline.vue`
- `i18n/locales/{en,zh-TW,zh-CN}.json`

Tests：

- `tests/lib/stocks-symbols.test.ts`
- `tests/api/agent-stocks-watchlist.test.ts`
- `tests/api/agent-stocks-records.test.ts`
- `tests/api/stocks-watchlist.test.ts`
- `tests/api/stocks-timeline.test.ts`
- `tests/integration/agent-stock-timeline.test.ts`

Ana / OpenClaw workflow 文件或技能：

- `trade-basic-diary`：加入 stock timeline write-in step。
- `video-transcribe-summarize`：加入 watched-symbol detection + stock timeline write-in step。

## 13. 最後建議

這版要抓住一句話：個股追蹤不是讓用戶多填一套表，而是讓 Ana 處理資訊時順手留下可追溯的股票時間線。

所以 P0 的成功標準是：

- 用戶能管理追蹤名單。
- Ana 能讀追蹤名單。
- Ana 能把已追蹤股票的摘要和來源寫入 timeline。
- 重跑 workflow 不會重複寫垃圾資料。
- 用戶能按股票看到清楚的線性脈絡。

做到這些，產品就開始有價值。沒做到 agent write-in，卻先做一堆 note category 和 editor，那就是方向跑偏了，還跑得挺自信。
