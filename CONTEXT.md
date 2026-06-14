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

**Market Rotation Monitor（市場輪動監控）**：
ETF 研究工具的新可見名稱，用 Market State、Sector Breadth 與 sector ETF ranking 判斷市場輪動方向。
_避免：ETF Analysis、ETF Sector Trend Board、Market 平台_

**Market Rotation Snapshot（市場輪動快照）**：
某個交易日、某個 ETF/sector symbol 的輪動狀態摘要，由已持久化每日 OHLCV 價格資料計算而來，包含 RSI、均線狀態、MA score、rotation score 和 rank。
_避免：即時 ETF row、原始價格資料、完整歷史重算結果_

**MA Score（均線分數）**：
Market Rotation Snapshot 中衡量 ETF 是否站上 10d EMA、20d EMA 和 50d SMA 的 0-100 分數。
_避免：200d market-state score、三條均線的純文字 badge_

**MA Status（均線狀態）**：
Market Rotation Snapshot 中基於 10d EMA、20d EMA 和 50d SMA 的 canonical trend label。
_避免：任意 UI 文案、三個布林值自行解讀_

**Distance From High（距離高點）**：
Market Rotation Snapshot 中 close 相對 rolling 252 trading day high 的百分比距離與衍生分數。
_避免：YTD high distance、calendar-year high、global percentile_

**Rotation Score（輪動分數）**：
Market Rotation Snapshot 中由同一 Rank Scope 內的 RSI、2 週表現、MA score 和 Distance From High percentile 組成的相對強弱分數。
_避免：global score、mixed ranking score、unknown 補 0_

**Rotation Signal（輪動訊號）**：
Market Rotation Snapshot 中基於均線狀態、rank delta、RSI delta 和 2 週表現產生的 canonical signal label。
_避免：任意 UI 標籤、missing data 當 neutral_

**Sector Breadth（產業廣度）**：
Market Rotation Monitor 中由 Sectors Rank Scope 聚合出的市場參與度指標，例如 Above 20d EMA、Above 50d SMA 和 Average RSI。
_避免：混入 benchmark index ETFs、core ETFs、Market State engine_

**Market State（市場狀態）**：
Market Rotation Monitor 的主市場狀態標籤，由既有內部 market-state logic 產生。
_避免：外部產品命名、sector breadth 替代主狀態_

**Breadth Condition（廣度條件）**：
由 Sector Breadth 衍生、描述 sectors universe 參與度寬窄的輔助狀態。
_避免：主市場狀態、獨立 market-state engine_

**Breadth Confirmation（廣度確認）**：
用 Sector Breadth 判斷是否支持或背離 Market State 的輔助判讀。
_避免：覆蓋 Market State、和 Market State 競爭_

**Market Rotation Universe（市場輪動標的範圍）**：
系統定義、會產生每日市場輪動快照的 ETF symbol 範圍，包含 US sector ETFs、benchmark index ETFs 和 app-defined core ETF list。
_避免：任意 custom symbols、一次性輸入、冷門 ticker、未知 ticker_

**Rank Scope（排名範圍）**：
Market Rotation Monitor 計算 rotation rank、percentile 和 qualified snapshot date 時使用的 canonical symbol 分組。
_避免：全域混排、custom symbols、單一 symbol 自訂比較範圍_

**Sectors Rank Scope（產業排名範圍）**：
由 US sector ETFs 組成的 Rank Scope，用於主要 Sector Rotation Matrix。
_避免：benchmark ETFs、core ETFs、全域混排_

**Indexes Rank Scope（指數排名範圍）**：
由 benchmark index ETFs 組成的 Rank Scope，用於 market snapshot、Market State 和 benchmark comparison。
_避免：sector ETFs、core ETFs、全域混排_

**Core Rank Scope（核心 ETF 排名範圍）**：
由 app-defined core ETF list 組成的 Rank Scope，保留給較廣 ETF monitoring 和未來 All Core ETFs 視圖。
_避免：任意 custom symbols、一次性輸入、全域混排_

**Qualified Snapshot Date（合格快照日）**：
某個 Rank Scope 的 canonical universe 中，至少 90% active symbols 成功產生 Market Rotation Snapshot 的交易日。
_避免：任意有資料日期、單一 symbol 有資料日期、全域固定日期_

**2W Comparison Date（雙週比較日）**：
Market Rotation Monitor 用來和最新市場輪動快照比較的歷史日期，為 latest qualified snapshot date 往前數第 10 個 qualified snapshot date。
_避免：14 個 calendar days 前、單一 symbol 自己往前找第 10 筆_

**2W Trend Sparkline（雙週趨勢迷你圖）**：
以 2W Comparison Date 的價格設為 100 的 normalized performance series，用於顯示同一 Rank Scope 內 symbol 的 2 週相對走勢。
_避免：min-max normalization、z-score normalization、per-symbol first-available-date normalization_

**Rank Delta 2W（雙週排名變化）**：
同一 Rank Scope 中 comparison rank 與 current rank 的差值，用於衡量 sector leadership 的改善或轉弱。
_避免：純 2 週漲跌幅排序、跨 scope 排名變化_

**Current Market Summary（當前市場摘要）**：
Market Rotation Monitor 根據 Market State、Sector Breadth、Breadth Confirmation 和 leadership changes 產生的 deterministic text summary。
_避免：LLM-generated summary、主觀投資建議、和 dashboard 數據不同源_

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
- **Market Rotation Monitor** 是 **Tool** 中的 **ETF** 研究視圖，不代表新的限界上下文
- 一個 **Market Rotation Monitor** 顯示多個 **Market Rotation Snapshot**；每個 **Market Rotation Snapshot** 屬於一個交易日和一個 ETF/sector symbol
- **Market Rotation Snapshot** 只為 **Market Rotation Universe** 中的 canonical symbols 產生；custom symbols 可以即時查看，但不自動持久化
- **Market Rotation Snapshot** 由持久化每日 OHLCV 價格資料計算，不直接依賴 live provider response
- **MA Score** 使用 10d EMA、20d EMA 和 50d SMA 計算；200d SMA 可儲存供未來 **Market State** analysis，但不納入 v1 **MA Score**
- **MA Status** canonical labels 為 `bullish_stack`、`healthy_pullback`、`short_term_weakness`、`recovering`、`breakdown`、`unknown`
- **Distance From High** 使用 rolling 252 trading day high；若不足 252 筆但至少 60 筆，使用可用歷史最高點；少於 60 筆則標為 unknown
- **Rotation Score** 只由同一 **Rank Scope** 內的 percentile components 組成；任何 component unknown 時，**Rotation Score** 也為 unknown
- **Rotation Signal** canonical labels 為 `turning_strong`、`strong_but_extended`、`losing_momentum`、`breaking_down`、`early_recovery`、`neutral`
- **Rotation Signal** 缺必要資料時為 `null` 且 `signal_status = insufficient_data`；不得把 missing data 分類為 `neutral`
- **Market State** canonical values 為 `risk_on`、`neutral`、`defensive`、`risk_off`、`unknown`
- **Market State** 是使用者可見的主 dashboard label；內部較細狀態不得直接暴露為主 label
- **Sector Breadth** 只從 **Sectors Rank Scope** 的 active canonical symbols 聚合；indexes 用於 benchmark trend 和 **Market State** confirmation，不作為主 breadth constituents
- **Breadth Condition** 和 **Breadth Confirmation** 是 **Market State** 的 supporting evidence，不是另一套 competing state engine
- **Breadth Condition** canonical values 為 `broad_participation`、`constructive`、`narrowing`、`weak_breadth`、`unknown`
- **Breadth Confirmation** canonical values 為 `confirming`、`mixed`、`warning`、`unknown`
- 一個 **Rank Scope** 定義一組 canonical symbols；**Qualified Snapshot Date** 按 **Rank Scope** 分別判定
- 第一版 **Rank Scope** 只有 **Sectors Rank Scope**、**Indexes Rank Scope** 和 **Core Rank Scope**；不提供 all、global 或 mixed rank scope
- 所有 percentile calculation 和 rotation rank 都限定在同一 **Rank Scope** 內，不提供 cross-scope percentile 或 global percentile
- **2W Comparison Date** 以同一 **Rank Scope** 的 **Qualified Snapshot Date** 為準，不由各 symbol 分別決定
- **2W Trend Sparkline** 使用同一 **Rank Scope** 的 qualified snapshot date sequence；第一點為 100，最後一點對應 latest qualified snapshot date
- **Rank Delta 2W** 公式為 `comparisonRank - currentRank`；正數代表排名上升，負數代表排名下降
- **Current Market Summary** v1 使用 deterministic template 產生，不使用 LLM

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

- **DisciplineCheck（已清理的歷史設計債）**：曾存在於資料模型中，但領域專家確認每日打勾機制是設計錯誤。紀律系統只需要清單展示和隨機抽取。現行 schema、API 和程式碼已移除；歷史 migration 和規劃文件仍保留脈絡。
- **PortfolioSnapshot（已清理的歷史設計債）**：曾設計為每日持倉快照，但使用者交易頻率極低（一個月不一定有一筆），實際上用不到。現行 schema、API 和程式碼已移除；歷史 migration 和規劃文件仍保留脈絡。
- **"Stock" 一詞的重載**：在程式碼中 "stock" 同時指「實際交易的股票」和「關注清單中的標的」。目前透過 `Stock`（主表）、`StockNote`（觀點）、`StockWatchlist`（關注）區分，但新手使用者可能混淆。
- **Telegram Bot**：目前為半成品，有 bug 無法正常使用。定位為「交易快速記錄入口」，與 Quick Note（日記入口）互補。
- **"Market Rotation Monitor" 的邊界**：這是 ETF 研究工具的新可見名稱，不是新的 Market 限界上下文；Stock 與 ETF 仍依 ADR-0002 保持分離。
- **"Market Rotation Snapshot" 與即時計算的界線**：2 週比較層以持久化每日快照為核心，不在每次開頁時即時計完整 1y history、RSI、rank、percentile 和 2W delta。
- **"Market Rotation Universe" 的邊界**：每日快照只涵蓋系統定義的 canonical ETF symbols；任意 custom symbols、一次性輸入、冷門 ticker、未知或無效 ticker 不自動持久化。
- **"Market Rotation Snapshot" 的價格來源**：batch job 可以從 Yahoo 或其他 provider 補抓缺失 OHLCV，但必須先持久化每日價格，再由持久化價格計算 snapshot。
- **"MA Score" 的公式**：v1 使用 `20 * above_10d + 30 * above_20d + 50 * above_50d`；200d SMA 只儲存，不納入 v1 score。
- **"MA Status" 的標籤**：資料層使用 snake_case canonical labels；UI 可以轉成人類可讀文字，但不得創造新的狀態值。
- **"Distance From High" 的公式**：`percent_from_high = (close / rolling_252d_high - 1) * 100`；raw score 為 `clamp(100 + percent_from_high * 5, 0, 100)`，rotation score 使用同一 Rank Scope 內的 percentile。
- **"Rotation Score" 的公式**：v1 使用 `0.30 * rsi_percentile + 0.30 * two_week_performance_percentile + 0.20 * ma_score_percentile + 0.20 * distance_from_high_score_percentile`；任何 component unknown 時不補 0，rotation score 也為 unknown。
- **"Rotation Signal" 的優先順序**：v1 signal priority 為 `breaking_down > strong_but_extended > turning_strong > early_recovery > losing_momentum > neutral`；`neutral` 只代表完整資料下未觸發其他規則。
- **"Market State" 的命名邊界**：產品、程式碼、API、schema 和文件都使用 **Market State**；不使用外部產品式命名或其他核心概念名。
- **"Market State" 的映射**：內部 `BULLISH_THRUST` 和 `RISK_ON` 對應 `risk_on`；`NEUTRAL` 對應 `neutral`；`RISK_OFF` 對應 `defensive`；`CAPITULATION_WATCH` 對應 `risk_off`；missing 對應 `unknown`。
- **"Sector Breadth" 的邊界**：v1 summary breadth cards 只聚合 sectors universe；benchmark index ETFs 用於趨勢與 **Market State** confirmation，core ETFs 保留給未來 core-specific view。
- **"Breadth Condition" 的門檻**：以 sectors above 50d ratio 判定；`>=70%` 為 `broad_participation`，`50%-70%` 為 `constructive`，`35%-50%` 為 `narrowing`，`<35%` 為 `weak_breadth`。
- **"Breadth Confirmation" 的語意**：描述 Sector Breadth 是否支持 **Market State**；unknown marketState 或 unknown breadth data 時為 `unknown`，不得改寫主 **Market State**。
- **"Rank Scope" 的邊界**：第一版只支援 sectors、indexes 和 core；不實作 all、global 或 mixed 排名，避免把 sector exposure、broad market beta、industry ETFs、bond proxies 和 commodity ETFs 混成語義薄弱的排名。
- **"Percentile" 的邊界**：所有 percentile calculation 和 rotation rank 都 scoped by rank_scope；不提供 cross-scope percentile、global percentile 或 mixed ranking。
- **"Qualified Snapshot Date" 的門檻**：某個 Rank Scope 的 canonical universe 中，至少 90% active symbols 成功產生 Market Rotation Snapshot，該交易日才算 qualified。
- **"2W Comparison Date" 的定義**：雙週比較日是同一 Rank Scope 的 latest qualified Market Rotation Snapshot date 往前數第 10 個 qualified snapshot date，不是 14 個 calendar days 前，也不是每個 symbol 各自往前找第 10 筆。
- **"2W Trend Sparkline" 的公式**：`normalized_value = price_on_date / price_on_comparison_date * 100`；`twoWeekPerformancePct = latestNormalizedValue - 100`；缺 comparison date 時 sparkline 和 2W performance unavailable，中間缺點回 `null` 不插值。
- **"Top/Bottom Rotation Chart" 的排序**：improving 和 weakening chart 以 **Rank Delta 2W** 為主排序；2W performance 不是主排序，避免把純報酬榜誤當 leadership 變化。
- **"Current Market Summary" 的生成方式**：v1 使用 deterministic template，輸入來自同一 dashboard payload；不使用 LLM 或另一路資料來源。

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

### 2026-06 架構深化（5 項重構）

延續 2026-05 的架構審計，針對讀取側對稱性、CRUD 一致性、快取 seam、死代碼和型別精確度進行深化。

#### 1. Diary 讀取路徑 Query Layer — `server/utils/diary-read.ts`

**問題**：Diary 寫入側有深層的 `diary-write.ts`（327 行），但讀取側完全沒有對應的 query layer。每個 handler 各自手寫 `prisma.diary.findFirst({ include: ... })`，include/where 在 4 個 handler 之間微妙不同（有的 include transactions，有的漏了 review 欄位）。明顯的對稱性缺失。

**解法**：新建 `diary-read.ts`，提供 `findDiaryForUser(id, userId)` 和 `findDiaryByDate(date, userId)`。前者統一 include transactions + alerts + review 欄位，並驗證擁有權（不存在或非本人均拋 `notFound`，不洩漏存在性）。後者用 UTC day range 匹配日期。

更新 3 個 handler：`[id].get.ts`、`by-date.get.ts`、`review.patch.ts`。`[id].put.ts` 已使用 `updateDiaryForUser()` 自帶 ownership check，無需改動。+10 新測試。

#### 2. Price Alert Query Layer + Zod — `server/utils/price-alert-queries.ts`

**問題**：Price Alert（價格警示）是唯一缺少 query layer 的 CRUD bounded context。4 個 handler 各自 inline Prisma 查詢和手寫驗證（`isPriceAlertType()`、必填檢查），而同 project 的 Stock Watchlist 和 ETF Watchlist 已正確使用 Zod schema + query layer。

**解法**：新建 `price-alert-queries.ts`，包含 `CreatePriceAlertSchema` / `UpdatePriceAlertSchema`（Zod）和 4 個 CRUD 函數（`listPriceAlerts`、`createPriceAlert`、`updatePriceAlert`、`deletePriceAlert`）。Ownership check 統一用 `notFound`（不洩漏資源存在性）。Symbol 正規化在 schema 層透過 `transform` 處理。

更新 3 個 handler：`index.get.ts`、`index.post.ts`、`[id].delete.ts`。+35 新測試。

#### 3. Market Data Cache 統一 Seam — `lib/market-data/cache.ts`

**問題**：9 個 market/ETF handler 全部從 `lib/etf-profile/cache.ts` import 快取函數，語意不合理（market handler 不該從 etf-profile 命名空間 import 快取）。如果未來從 Map 換成 Redis，需改 N 個檔案。

**解法**：新建 `lib/market-data/cache.ts` 作為市場資料的唯一快取入口。Re-export 底層快取基元（`getOrSetCached`、`shouldBypassCache` 等）、cache key builders（`buildMarketQuoteCacheKey` 等）和 TTL 常數（`TTL_QUOTE_MARKET_HOURS`、`TTL_MARKET_DATA_MAX` 等）。9 個 handler + 2 個測試檔案 import 路徑統一。

底層 `lib/etf-profile/cache.ts` 保持不動（ETF profile 內部仍直接引用底層，因為它使用 `getStaleCached` 做多層次 stale 回退，與 handler 的 `getOrSetCached` 用法本質不同）。+32 新測試。

#### 4. Deprecated `quotes.ts` 清除

**問題**：`lib/market-data/quotes.ts` 的 `fetchMarketPrice()` 已標記 `@deprecated`，指引改用 `fetchQuote` from `~/lib/yahoo-finance`。但檔案仍存在，新開發者會困惑「該用哪個」。

**解法**：確認零 caller 後刪除。清理 1 個過時測試 case。

#### 5. SerializedId 型別別名 — `types/common.ts`

**問題**：因為 Prisma 回傳 `bigint` 而 `serialize()` 轉成 `string`，每個 domain type 的 id 欄位都寫成 `bigint | string`。這個 union 在 `types/diary.ts`、`types/websocket.ts` 等多個檔案中重複，增加認知負擔。實際上經過 `serialize()` 後 caller 永遠拿到 `string`。

**解法**：新建 `types/common.ts`，定義 `type SerializedId = string`。所有 post-serialization 的 API 回應型別統一使用 `SerializedId` 替代 `bigint | string`。Server-side 內部函數（query layers、Prisma 參數）刻意保持 `bigint | string`，因為它們在 serialize 之前運作。

更新 `types/diary.ts`、`types/websocket.ts`、`pages/alerts/index.vue`、`composables/useQuickNoteComposer.ts`。純型別重構，零 runtime 變更。+3 新測試。

### 2026-07 架構深化（6 項重構）

延續兩輪架構審計，針對 client/server 介面對齊、Market Rotation 計算收斂、對稱 query layer、前置流程深化、時區單一真相源與排程任務型別安全進行深化。

#### 1. Client BigInt 防禦清除 — `composables/useAlerts.ts`

**問題**：Server handler 早就走 `serialize()`，client side 卻保留 5 處 `alert.id.toString()` / `alert.diary.id.toString()` 過時防禦。根因是 `AlertApiResponse.id` 型別寬鬆為 `string | number | bigint`，下游每個 caller 都得防禦。

**解法**：把 `AlertApiResponse.id` 與 `AlertApiResponse.diary.id` 收窄為 `string`（與 `types/common.ts` 的 `SerializedId` 對齊），移除 5 處 `.toString()`。新增 API 契約測試斷言 id 為 string 且 `JSON.stringify` 不會丟 BigInt 錯誤。

#### 2. Market Rotation 計算收斂 — `lib/market-rotation/trend-series.ts` + `qualified-date.ts`

**問題**：兩個 CONTEXT.md 一級概念沒有對應的 deep module：

- **2W Trend Sparkline** 公式 `normalized_value = price_on_date / price_on_comparison_date * 100` 在 `market-rotation-monitor-queries.ts` inline 計算，與 batch pipeline 的 `calculatePerformance` 各自維護
- **Qualified Snapshot Date** 的 90% 門檻與 Prisma groupBy 邏輯散在 `getLatestQualifiedDate`、`getComparisonDate`、`getMonitorTrendSeries` 三處，`Math.ceil(N * 0.9)` magic number 重複

**解法**：抽兩個純函數 deep module：

- `buildNormalizedTrendSeries`：給定 qualified dates、price map、comparison date，輸出 normalized series。缺點回 `null`，不插值
- `filterQualifiedDates` + `pickComparisonDate`：把 90% 門檻與 offset=10 收為 exported constants `QUALIFICATION_THRESHOLD_RATIO`、`COMPARISON_OFFSET`

三個 query layer caller 改為呼叫純函數。Batch pipeline 透過 `getComparisonDate` 自動受惠。+35 unit tests。

**保留的歷史行為**：monitor 的 groupBy 故意只用 `rankScope` 不篩 symbol（與 `getLatestQualifiedDate` 的 `where: { rankScope, symbol: { in: [...] } }` 不同）。強行統一會破壞既有測試，保留為 documented behavior。`lib/market-rotation/monitor.ts` 內 `coverageRatio >= 0.9` 是 runtime row coverage 顯示用，語意與 Qualified Snapshot Date 不同，刻意不整合。

#### 3. Discipline Query Layer + Zod — `server/utils/discipline-queries.ts`

**問題**：**Discipline（交易紀律）** 是 CONTEXT.md 一級概念，有 8 個 handler，但與同期完成的 **Price Alert** 對稱性缺失——後者已有 query layer + Zod + 35 個測試，前者零 query layer、零 API 測試。`discipline/export.get.ts` 還有手動 BigInt → Number 轉換違反 CLAUDE.md。

**解法**：新建 `discipline-queries.ts`，提供 4 個 Zod schema（`CreateDisciplineSchema`、`UpdateDisciplineSchema`、`ReorderDisciplineSchema`、`ImportDisciplineSchema`）與 8 個 CRUD 函數（含 `getRandomDiscipline` 對應「隨機抽取一條」核心使用場景）。Ownership check 統一 `notFound` 不洩漏存在性。8 個 handler 從 345 行縮到 178 行 (-48%)。

+64 query-layer unit tests, +8 API smoke tests。

**未收斂的邊界**：`lib/disciplineShare.ts` 的 `DisciplineItem.id?: number` interface 與 query layer 回傳的 `bigint` 不合，目前靠 `export.get.ts` 末端 `Number(d.id)` 適配。根治需要動 `lib/disciplineShare` 的 interface。

#### 4. PartnerLink 讀取深化 — `server/utils/partner-queries.ts`

**問題**：**PartnerLink** 是一級概念，純比較邏輯已抽到 `partner-compare.ts`，但 `compare.get.ts`（141 行）仍內含 link selection、pending 判定、雙 user diary 載入等前置流程。

**解法**：擴充 `partner-queries.ts`，加入 `loadCompareContext(viewerId, opts)` deep module，一次回傳 `{ viewer, links, selectedLink, ownerDiaries, partnerDiaries }`。Handler 從 141 行縮至 69 行 (-51%)，對外 API 形狀不變。+13 unit tests 覆蓋 happy path、permission denial、pending/missing links、limit clamping。

#### 5. 時區轉換單一真相源 — `lib/dates/user-tz.ts`

**問題**：CLAUDE.md 規定「日期存 UTC，使用者 timezone 在 `User.timezone`」。但時區轉換散在 `composables/useTimezone.ts`、`lib/dates/format.ts`、`lib/holiday-heatmap.ts`、`lib/telegram/diary-write.ts` 四處。`reviews.get.ts`（168 行）handler 內 inline `getTimeZoneParts` / `zonedDateTimeToUtc` 計算「給我 user 當天日記」的時間窗口。

**解法**：新建 `lib/dates/user-tz.ts` 為時區運算的單一真相源：

- `getUserDayRange(date, tz)`：half-open `[start, end)` UTC 區間，兩段式 DST offset 修正
- `getUserTodayYmd(tz, now?)`：user timezone 今天 YMD
- `getUserYmdInTimezone`：re-export `formatYmdInTimezone`
- `resolveCountryCodeFromTimezone`：從 `holiday-heatmap.ts` 搬入

`reviews.get.ts` 從 168 行縮到 111 行 (-34%)，區間語意從 inclusive 改為 half-open `[start, end)`（更精確不漏毫秒）。`useTimezone` composable 介面保留（17 個 caller 不受影響），內部呼叫新 module。+20 unit tests 涵蓋 Asia/Taipei、America/Los_Angeles DST、跨年/月邊界。

#### 6. Market Rotation CronJob 抽出 TypeScript script — `scripts/market-rotation/run-batch.ts`

**問題**：`k8s/cron-market-rotation.yaml` 把 100+ 行 JavaScript 內嵌在 `node -e` 內，重新實作 JWT 簽發、HTTP client、auth flow——這些已經在 `lib/jwt.ts` 跑過。違反 ADR-0003「Agent 走標準 User 路徑」精神（雖然這是 cron 不是 agent），且無型別安全、無測試。

**解法**：抽 `scripts/market-rotation/run-batch.ts`，直接呼叫 `runFullBatch(prisma)`（與 `scripts/market-state/update-breadth.ts` 先例一致；batch 函數只需要 PrismaClient，不需要 event context，HTTP 繞路是多餘）。YAML 從 103 行縮到 26 行。env 從 `JWT_SECRET` 改為 `DATABASE_URL`（cron pod 直連 DB，與 app deployment 同模式）。CronJob schedule、resources、backoffLimit 不動。

+9 unit tests 涵蓋 `executeBatch` scope 解析、錯誤傳播、timing metadata。

---

### 2026-07 架構深化（技術債清理 3 項）

延續同一輪審計，處理期間記錄的三項技術債：

#### 1. `roundMetric` 收斂為單一 utility — `lib/market-rotation/round.ts`

**問題**：三處重複的 `Math.round(value * 10000) / 10000`，未來精度策略調整需要同步改三個地方。

**解法**：新建 `lib/market-rotation/round.ts` export `roundMetric`。`calculations.ts`、`monitor.ts`、`trend-series.ts` 改為 import；`trend-series.ts` 的 `roundTrendValue`（其實是同一份邏輯）拿掉，caller 改用 `roundMetric`。+4 unit tests on `round.ts`（原 `trend-series.test.ts` 內 3 個 `roundTrendValue` 測試淘汰，因為精度契約已由 `buildNormalizedTrendSeries` 的「rounds to 4 decimal places」測試覆蓋）。

#### 2. Monitor groupBy 加 canonical symbol filter（ADR-0004 對齊修正）

**問題**：`getMonitorTrendSeries` 的 Prisma `groupBy` 只用 `where: { rankScope }` 不篩 symbol——但 ADR-0004 明文要求 Qualified Snapshot Date 是「至少 90% **canonical** symbols 有 snapshot」。先前 subagent 註解寫「intentionally does NOT filter — matching pre-refactor behavior」，但 pre-refactor behavior 本身就是與 ADR 不符的 bug：DB 內若殘留非 canonical symbol（如歷史資料、过時 ticker），會錯誤膨脹 coverage ratio。

**解法**：`groupBy` 加 `symbol: { in: universeSymbols }`，與 `getLatestQualifiedDate` 對齊。+1 unit test 用 `mockImplementation` 模擬「DB 有非 canonical symbol 時仍應按 canonical universe 計算 90%」，舊行為會誤判 2026-06-14 qualified（9 canonical + 5 stale = 14 ≥ 10），新行為正確判定為不 qualified。`getMonitorTrendSeries` 第一個既有測試也加上 `groupBy` args 斷言驗證 symbol filter 存在。

#### 3. `DisciplineItem.id` 與 `createdAt` 拿掉 — `lib/disciplineShare.ts`

**問題**：`DisciplineItem.id?: number` 與 `createdAt?: string` 是無用約束——`exportDisciplines` 第 51 行 `map(({ content, order }) => ({ content, order }))` 直接 strip 掉這兩個欄位，從不寫入 share data。但 query layer 回傳 Prisma raw row（id 為 `bigint`、createdAt 為 `Date`），導致 `export.get.ts` handler 末端得做 `Number(d.id)` 與 `d.createdAt.toISOString()` 適配，純粹為了通過型別檢查。

**解法**：`DisciplineItem` 簡化為 `{ content: string; order: number }`。`DisciplineShareData.disciplines` 與 `DisciplineImportPreview.disciplines` 從 `Omit<DisciplineItem, 'id' | 'createdAt'>[]` 改為 `DisciplineItem[]`。`export.get.ts` 移除 `normalized = disciplines.map(...)` 與 `Number(d.id)` / `toISOString()` 適配層，直接傳 raw Prisma row 給 `exportDisciplines`（structural typing 允許多餘欄位）。零 runtime 行為變更，純型別重構。
