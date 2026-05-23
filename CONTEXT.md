# 交易日記 (Trade Diary)

一個個人投資日記應用，用於每日市場觀察記錄、交易追蹤、紀律提醒，以及與夥伴（真人或 AI）的雙向交流。目標使用者為 0-3 年投資經驗的新手。

## 語言 (Language)

### 核心領域

**Diary（日記）**：
每日市場觀察記錄。記錄當天市場走勢、交易心態、大盤變化——日常流水，不一定包含交易。是整個系統的核心，其他所有內容圍繞日記組織。
_避免：筆記、文章、紀錄_

**Transaction（交易）**：
實際發生的股票或 ETF 買賣。一筆交易必須關聯一篇日記。一個月可能只有零到數筆交易，大多數日記沒有交易。
_避免：訂單、成交、委託_

**Stock Note（股票筆記）**：
對特定股票的「當前有效觀點」。是可變的——當觀點改變時更新同一條筆記，而非保留歷史。作為該檔股票時間線的「標頭」（header），統整目前看法。
_避免：分析報告、評論、觀察_

**Stock Timeline Record（股票時間線記錄）**：
某檔股票的不可變事件記錄。來源多樣（日記、AI 生成、手動新增），按時間線排列。錯了也保留——是原始證據，不是可修改的觀點。
_避免：歷史記錄、事件日誌_

**Watchlist（關注清單）**：
使用者追蹤的股票清單。是進入 StockNote 的入口——從這裡展開對特定股票的分析。
_避免：自選股、收藏、我的股票_

**ETF（指數型基金）**：
純研究工具，不涉及個人交易。用於觀察 ETF 走勢和技術分析，與股票系統完全分離。
_避免：基金、指數_

### 紀律與提醒

**Discipline（交易紀律）**：
從教訓中學到的交易原則，以清單形式保存。用途是偶爾翻閱和自我提醒，不是每日打卡。隨機抽取一條來警示自己是核心使用場景。
_避免：規則、策略、checklist_

**Alert（回頭提醒）**：
定時提醒使用者回去看特定日記。支援兩種重複模式：一週內每日提醒（WEEK，至週五止）和一個月內每日提醒（MONTH，至月底止）。週末自動跳過。
_避免：通知、鬧鐘、排程_

**Price Alert（價格警示）**：
股票價格條件觸發的提醒（價格突破、跌破、漲跌幅、均線），與日記無關。
_避免：停損單、限價單_

### 協作

**Partner（夥伴）**：
雙向對等交流關係中的另一方。可以是真人，也可以是 AI agent。雙方各自獨立控制日記和股票筆記的分享權限。
_避免：好友、追蹤者、訂閱者_

**AI Agent Partner（AI 夥伴）**：
外部 AI 系統，角色為「資深市況分析師」。擁有獨立 User 帳號，透過標準夥伴機制與使用者分享研究成果（股票筆記、時間線記錄）。與真人在系統中的路徑完全相同。
_避免：機器人、bot、助手_

### 內容

**Post（部落格文章）**：
由管理員撰寫的公開交易理論文章。無時效性，目的為分享知識和外部引流。僅限 admin 操作。
_避免：日記、筆記、新聞_

### 工具

**Tool（工具箱）**：
獨立計算工具，與日常日記流程無關。包含 ETF 分析、部位計算、FIRE 計算、相對價值分析、季節性分析。
_避免：功能、模組_

### 頻道

**Quick Note（快速記錄）**：
日記的快速輸入入口。目標是降低寫日記的心理門檻，幫助養成每日記錄習慣。提供多種模板（自由書寫、交易日記、盤後反思、市場觀察）。
_避免：速記、草稿_

**Telegram Bot（Telegram 機器人）**：
交易的快速輸入入口。目標是一行文字記錄買賣，與 Quick Note（日記入口）互補。目前為半成品。

---

## 關係 (Relationships)

- 一個 **User** 擁有零到多篇 **Diary**
- 一篇 **Diary** 可以包含零到多筆 **Transaction**；每筆 **Transaction** 必須屬於一篇 **Diary**
- 一個 **User** 擁有一個 **Watchlist**，其中包含多檔股票
- 每檔股票的 **Watchlist** 項目可以有多條 **StockNote**（當前觀點）和多條 **StockTimelineRecord**（歷史事件）
- **StockNote** 是該檔股票時間線的詮釋層（header），可修改；**StockTimelineRecord** 是不可變的原始證據
- 兩個 **User** 透過 **PartnerLink** 建立雙向分享關係，各自控制分享哪些內容（日記、股票筆記）
- **AI Agent Partner** 與真人 **User** 使用相同的帳號系統和夥伴機制，路徑完全一致
- 一篇 **Diary** 可以有多個 **Alert**，提醒使用者在特定時間回頭查看
- **Post** 獨立於日記系統，是公開內容，僅 admin 可撰寫
- **ETF** 系統與 **Stock** 系統完全分離，無資料關聯
- **Tool** 獨立運作，不與日記或交易資料整合

---

## 典型對話 (Example dialogue)

> **開發者**：「使用者今天買了 0050，他應該在 Diary 裡記錄這筆 Transaction，還是去 ETF 工具看分析？」
>
> **領域專家**：「他在 Diary 寫日記，順便記一筆 BUY 0050。ETF 工具是另外一回事——那是他研究 ETF 走勢用的，跟他的個人交易無關。」
>
> **開發者**：「那 StockNote 和 Diary 內容的界線是什麼？」
>
> **領域專家**：「Diary 是每天的流水帳，想到什麼寫什麼，可能提到任何股票。StockNote 是他特別盯上的股票，需要單獨抽出來持續分析——從 Watchlist 進去寫。」
>
> **開發者**：「AI agent 分析師寫了一篇關於 TSLA 的觀察，要放進 StockNote 還是 StockTimelineRecord？」
>
> **領域專家**：「兩個都可能有。如果是觀點判斷——放 StockNote（可修改）。如果是資訊事件——放 StockTimelineRecord（不可變）。」
>
> **開發者**：「使用者這個月一筆交易都沒做，DisciplineCheck 要怎麼處理？」
>
> **領域專家**：「不需要處理。Discipline 是偶爾翻閱的教訓清單，不是每日打卡。那個 DisciplineCheck 功能是設計錯誤，不應該存在。」

---

## 已知模糊 / 設計債 (Flagged ambiguities)

- **DisciplineCheck**：現存於資料模型和 API 中，但領域專家確認為設計錯誤。紀律系統只需要清單展示和隨機抽取，不需要每日打勾機制。待清理。
- **PortfolioSnapshot**：設計為每日持倉快照，但使用者交易頻率極低（一個月不一定有一筆），實際上用不到。確認為設計債。
- **"Stock" 一詞的重載**：在程式碼中 "stock" 同時指「實際交易的股票」和「關注清單中的標的」。目前透過 `Stock`（主表）、`StockNote`（觀點）、`StockWatchlist`（關注）區分，但新手使用者可能混淆。
- **Telegram Bot**：目前為半成品，有 bug 無法正常使用。定位為「交易快速記錄入口」，與 Quick Note（日記入口）互補。

---

## 架構決策記錄 (Architecture decisions)

> 以下記錄影響多模組的架構變更，供未來探索和重構時參考。單一模組內部的重構不在此列。

### 2026-05 架構深化（7 項重構）

一次系統性的架構審計，識別並修復了 7 個淺模組問題。核心原則：**加深模組**（高槓桿接口、小暴露面），**消除重複**（同一概念不該有 N 個實作），**強化測試表面**。

#### 1. Blog 查詢統一 — `server/utils/post-queries.ts`

**問題**：public `/api/blog` 和 admin `/api/blog/admin` 各自手寫 Prisma 查詢，95% 重複但參數不同（status 預設、排序欄位、搜尋語意、category alias）。

**解法**：抽取 `queryPosts(config)` + `parsePostQueryConfig(query, options)`，透過 config 區分路由差異：

- Public：`status: 'PUBLISHED'`, `searchMode: 'search'`, `searchFields: ['title', 'excerpt']`, `enableCategoryAliases: true`, `requirePublishedAt: true`
- Admin：`searchMode: 'contains'`, `searchFields: ['title']`, `includeEmail: true`, `requirePublishedAt: false`

**安全措施**：public 路由 strip `author` 防止 email 枚舉；admin 無效 `status` 回 400。

#### 2. 績效統計純計算 — `server/utils/performance-stats.ts`

**問題**：`/api/stats/performance` handler 內含 177 行計算邏輯（勝率、夏普比率、按月分群），與 HTTP/Prisma 緊耦合。

**解法**：抽取 `computePerformanceStats(rawTxs, config)` 為純函數，handler 只做 auth → query → Prisma fetch → call → return。零測試改動。

#### 3. 股票查詢拆分 — `stock-watchlist-queries.ts` + `stock-timeline-queries.ts`

**問題**：`stock-timeline-records.ts`（361 行、10 個 export）混雜了 Watchlist CRUD、Timeline CRUD、和 Agent 資料寫入三個概念。

**解法**：按領域概念拆分：

- `stock-watchlist-queries.ts`：Watchlist CRUD（ensureStock, upsertWatchlist, listWatchlist）
- `stock-timeline-queries.ts`：Timeline CRUD（createRecordsFromAgent, listTimeline, listTimelineBySymbol）

刪除原檔案，更新 8 個 caller。+23 新測試。

#### 4. QuickNote 合併 — `composables/useQuickNoteComposer.ts`

**問題**：QuickNote 功能散落在 7 個 composable（Draft、Submit、Tags、Reminders、TemplateDraft、Templates、Composer），但只有 Composer 一個外部消費者。5 個淺模組全是 pass-through。

**解法**：5 個 composable 合併為 1 個 `useQuickNoteComposer.ts`（559 行），Tags 邏輯 inline 到 `QuickTags.vue`。保留 `useQuickNoteTemplates.ts`（2 個消費者）。-5 個檔案，介面不變。

#### 5. Admin middleware 清理

**問題**：`authz-admin.ts`（25 行）零引用的死代碼；`auth.ts` 仍支援 legacy `auth-token` cookie。

**解法**：

- 刪除 `server/middleware/authz-admin.ts`
- 移除 `auth.ts`、`websocket.ts`、`plugins/auth.ts` 中所有 `auth-token` fallback
- Admin middleware 測試從 8 擴充到 18 個

#### 6. 格式化函數統一 — `lib/format.ts`

**問題**：`formatCurrency` 有 3 個不同實作（locale/小數位不同），散落在 `lib/utils.ts`、`lib/positionSizing.ts`、`lib/financialFreedom.ts`。

**解法**：新建 `lib/format.ts` 作為 `formatCurrency`、`formatNumber`、`formatPercent` 的唯一真相源。舊模組改為 re-export 或指引註解。+21 新測試。

`formatCurrency(amount, options?)` 預設 2 位小數、`zh-TW` locale；呼叫端可透過 `{ decimals: 0 }` 覆蓋。

#### 7. Diary Write 深化 — `server/utils/diary-write.ts`

**問題**：`createDiaryForUser` 和 `updateDiaryForUser` 共用驗證和交易映射邏輯但各自重複。

**解法**：

- 抽取 `validateDiaryInput(title, transactions)` 共用驗證
- 抽取 `mapTransactionWriteData(tx)` 共用交易映射（create 和 diffTransactions 共用）
- 抽取 `persistTransactionDiff(tx, diaryId, userId, diff)` 從 update 的 $transaction block 中
- Create 路徑不使用 `diffTransactions`（避免帶 id 的交易被丟到 toUpdate 而靜默消失）
- 驗證順序保持 title → content → transactions（與原始行為一致）

+14 新測試，公開介面不變。
