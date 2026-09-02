# 交易日記 (Trade Diary)

一個個人投資日記應用，用於每日市場觀察記錄、交易追蹤、紀律提醒，以及與夥伴（真人或 AI）的雙向交流。目標使用者為 0-3 年投資經驗的新手。

## 產品資訊架構

- **Quick Diary** 是全域捕捉動作，不是獨立工作區。
- **Investment Overview** 沿用 `/timeline` 作為已登入使用者的主要工作區，先回答 Portfolio、待關注事項、近期變化與待 Review 項目，再銜接按時間閱讀與重訪 Diary 的完整 Timeline。
- 產品閱讀流程是 Portfolio → Company → Investment Thesis → Memory → Review → Portfolio Decision；這是讀取與注意力入口，不改變 Diary 作為每日記憶與單次投資決策聚合根的寫入模型。
- **Pair View** 是 Timeline 的雙人閱讀模式，沿用相同日期脈絡比較雙方 Diary。
- **Diaries** 是搜尋、篩選與管理完整 Diary 紀錄的資料庫，不承擔首頁 dashboard 角色。
- **Review** 保持獨立可達；結構化 Review 工作流不屬於 Timeline 導覽架構。

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
- **Telegram Bot（已移除）**：舊版聊天輸入入口已完整退役；歷史 `Diary.createdVia = TELEGRAM_BOT` 僅作為資料 provenance 保留，新寫入只允許 `WEB` / `API_KEY`。
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

**問題**：CLAUDE.md 規定「日期存 UTC，使用者 timezone 在 `User.timezone`」。但時區轉換散在 `composables/useTimezone.ts`、`lib/dates/format.ts`、`lib/holiday-heatmap.ts` 三處。`reviews.get.ts`（168 行）handler 內 inline `getTimeZoneParts` / `zonedDateTimeToUtc` 計算「給我 user 當天日記」的時間窗口。

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

---

### 2026-07 架構深化（系統性審計：8 項深化 + 3 項 bug）

由 `/improve-codebase-architecture` skill 走查驅動：5 個 Explore agent 識別候選後以平行程工實作。共 8 項深化 + 3 條審計期間發現的 bug；「#9 統一資料層」依 YAGNI 排除。驗收：typecheck 乾淨、1836 測試全綠（2 skip 為刻意標注的 Map/Set 潛在 bug）。淨 −1915 行（多為 ETF 死碼）。

#### 1. ETF 分析管線死碼清除 — `lib/etf-analyzer.ts` + `lib/etf-profile/*`（刪除）

**問題**：兩條獨立的 ETF 研究 Implementation（etf-analyzer 算週期報酬 + MA、etf-profile 算 52w / volatility / drawdown / RS）概念重疊、介面不交集，且 `lib/etf-profile/providers/` 是假 seam（provider 回空，真正計算在 `research.ts` 繞過 provider）。`/api/etf/[symbol]/*` 與 `/api/etf/all` 共 7 個分析端點在前端零 caller——Market Rotation Monitor 頁面走的是 `/api/market/rotation-monitor`，完全不碰這條管線。

**解法**：先確認 `server/api/admin/etf/*` 與 `server/api/etf/watchlist/*` 對 etf-analyzer / etf-profile **零依賴**（admin/etf 只用 prisma / yahoo-finance / auth，watchlist 有自家 query layer）。再把 `lib/etf-profile/cache.ts` 內 market handler 依賴的 market-data 通用快取邏輯（in-memory Map、TTL、紐約盤中時段、`buildMarketQuoteCacheKey` 等）**實體遷移**進 `lib/market-data/cache.ts`（從 re-export 升格為真 owner），`server/plugins/etf-cache-cleaner.ts` 改從 market-data/cache import。然後刪除：`lib/etf-analyzer.ts`、整包 `lib/etf-profile/*`、`server/api/etf/[symbol]/*`、`server/api/etf/all.get.ts`，連同對應測試。共 −1906 行。

**保留**：watchlist（`server/api/etf/watchlist/*` + `etf-watchlist-queries.ts`）、admin etf 管理頁（`pages/admin/etf.vue` + `server/api/admin/etf/*`）完整保留，不依賴已刪模組。

#### 2. i18n 三語契約統一 — `tests/unit/i18n-parity.test.ts`（新建）

**問題**：i18n catalog 有三個 implementation（en / zh-TW / zh-CN）卻沒契約測試保證 key set 一致——`zh-CN.json` 靜默缺 89 個 key（含整個 `tools.etf.*`、`tags.*`、`about.badge`、`diary.quickDiary`）。同時 `errorCodeToI18nKey` 測試只斷言 `length === 35` 與 `toLowerCase()` 拼寫，不檢查 locale 檔真的有那個 key；`error-consistency.test.ts` 等回歸測試 `readFileSync` 原始碼再 grep 字串，測的是 implementation 拼寫而非行為。

**解法**：新建 `tests/unit/i18n-parity.test.ts`，兩個守護：(a) 三語 key tree 深度相等；(b) 每個 `ErrorCodes` 對應的 `error.code.*` key 在三語 locale 都存在。補齊 zh-CN 89 個缺 key，三語對齊在 1659 leaf keys。`error-i18n-mapping.test.ts` 收掉 11 個重複 `converts X to Y` case。刪除純 source-scrape 的 `error-consistency.test.ts`（其守護的行為已由 `tests/api/*.test.ts` 實際驅動 handler 覆蓋）。其餘回歸測試（csp / auth-client / api-docs / pwa）加 `ponytail:` 註解標明刻意保留——它們守護的反模式（client 偷讀 httpOnly cookie、CSP 擋 WASM、markdown fallback）沒有便宜的行為測試 proxy。

#### 3. 死模組與假 seam 清理 — `composables/useArticleMarkdown.ts`、`composables/useWebSocket.ts`、`stores/navigation.ts`

**問題**：三個「一個 adapter ＝ 假 seam」。`useArticleMarkdown`（64 行）零 production caller——`pages/articles/[slug].vue` 直接 `import { parseMarkdown } from '@nuxtjs/mdc/runtime'` 繞過它，只剩自己的 unit test 在測一個無人使用的 module。`useWebSocket`（39 行）純 re-export plugin 已提供的 `$websocket`，唯一 caller 是 useAlerts。`stores/navigation.ts` 14+ method 只用 4 個，且 `provide: { navigationStore }` 全專案無人 inject。

**解法**：刪 `useArticleMarkdown.ts` + 其測試。刪 `useWebSocket.ts`，把它的兩個職責（取用 `$websocket` + SSR / plugin-not-ready fallback）內聯進唯一 caller `useAlerts.ts`，對外介面不變。`stores/navigation.ts` 砍到 4 個 used method（init / setNavigating / setCurrentPath / setNavigationDirection）+ 其 internal deps，移除 dead `provide: { navigationStore }`。

#### 4. User / API Key / Admin query layer — `server/utils/user-queries.ts` + `api-key-queries.ts`（新建）

**問題**：全系統 13 個 query layer，這三個 context 完全沒有。User 寫入（login refresh token、register create user、密碼改 `$transaction`）inline 在 handler；`server/utils/api-key.ts` 看似 query layer 其實只有 auth helper，CRUD 與 scope 定義（`'DIARY_CREATE' | 'AGENT_WRITE'`）在 handler 與 schema 兩處重複；Admin 10 個 handler 零 query-layer import，跨 entity 直打 Prisma。同時 `api-key.ts:hashApiKey` 與 `auth-session.ts:hashToken` 是同一份 sha256-hex 重複實作。

**解法**：照 `discipline-queries.ts` 範本新建 `user-queries.ts`（login / register / password change 含 tokenVersion++ / settings）與 `api-key-queries.ts`（CRUD + scope 單一真相源）。新建 `server/utils/hash.ts` 收斂 sha256-hex，api-key / auth-session 與 `tests/api/auth.test.ts` 的 inline `createHash` 改 import 它。14 個 handler（auth / user / api-keys / admin 非 etf）改走 query layer，handler 收斂成 auth → Zod → call → serialize → return 樣板。密碼改的 tokenVersion 失效規則集中。

#### 5. Diary 讀取側 query layer 對稱 — `server/utils/diary-read.ts`

**問題**：Diary 寫入側是深 module（`diary-write.ts`，web + agent 兩路徑共用），讀取側 `diary-read.ts` 只有 `findDiaryForUser(id)` 與 `findDiaryByDate(date)`。list、review dashboard 的多 bucket 日期運算（overdue / today / upcoming / unscheduled / completed）、latest diary 都 inline 在 handler。

**解法**：擴充 `diary-read.ts`（89 → 411 行），加 `listDiariesForUser(userId, filters)`（分頁 / 搜尋 / 排序 / tag 過濾）、`findLatestDiaryForUser(userId)`、`buildReviewBuckets(userId, tz)`（5 個 findMany 並發，搭配 `lib/dates/user-tz.ts` 的 half-open `[start, end)` DST-safe 區間）。3 個 handler 合計 −179 行（diaries.get −93、reviews.get −81、latest −5），收斂成 auth → parse → call → serialize 樣板。+50 unit tests 涵蓋 list 過濾、review buckets DST spring-forward / fall-back、跨日跨月。

#### 6. Market Rotation caller-assembly 局部性 + B3 — `lib/market-rotation/summary.ts` + `market-rotation-queries.ts`

**問題**：純函數化已做兩輪，但 bug 藏在呼叫端組裝：(a) **B3**——`getComparisonDate` 呼叫 `loadQualifiedDatesForScope` 沒傳 symbols，groupBy 不套 canonical universe filter，與 `getMonitorTrendSeries`（已修）不一致，ADR-0004 修一半；(b) `decideBetaAllocation` 在同路徑被算兩次（handler 一次、`summary.ts` 又算一次）；(c) `getMonitorComparisonDate` 是淺 module——handler 已有 rows，它卻再 findMany 一次只為 `.some(r => r.rankDelta2W != null)`。

**解法**：B3——`getComparisonDate` 內部 derive canonical universe symbols 並傳入（簽名不變，batch 不受影響），+2 ADR-0004 測試。`summary.ts` 的 `SummaryInput` 加必填 `beta: BetaAllocationResult`，移除內部 `decideBetaAllocation` 呼叫；handler 把已算好的 beta 傳入，整個 request 只算一次。刪 `getMonitorComparisonDate`，handler 改 `rows.some(r => r.rankDelta2W != null)` 衍生 hasComparisonData，連 groupBy 都省。cross-scope summaryRows / trend merge 收進 builder 評估後**跳過**（會改 `MarketRotationMonitorInput` contract 且讓 pure builder 承擔 I/O 組裝，無淨抽象收益）。

#### 7. 概念收斂：format.ts SSOT + bucket 聚合 — `lib/format.ts` + `lib/portfolio-exposure/exposure.ts`

**問題**：`lib/format.ts` 名義是 SSOT 但 tool context 內多處自己 hand-roll formatter（`.toFixed` / `Math.round` / `new Intl.NumberFormat`）；`PortfolioExposurePanel.vue` 的 bucket 聚合 `highBeta = highBetaPct + megaCapPct + singleStockPct` 與 `exposure.ts` 的 `compareExposureToTarget` 同公式兩處。審計另指 toNumber / maxDrawdown / volatility 多處重複。

**解法**：`lib/format.ts` 加 `formatSignedPercent`、`formatCompactCurrency`，`financial-freedom.vue` 與 `PortfolioExposurePanel.vue` 改用 SSOT。bucket 聚合收進 `exposure.ts` 共用。**toNumber / maxDrawdown / volatility 重複經候選 1 刪除 etf-analyzer / etf-profile 後已自然消除**——僅剩 `lib/trade-analytics.ts` 一份，無 dup 可收。

**未收斂（低價值尾）**：`position-sizing.vue`、`relative-value.vue`、`seasonality.vue`、`BetaCockpitCard.vue`、`lib/relativeValue.ts`、`utils/stockSeasonality.ts` 內 ad-hoc `.toFixed` 替換為純美化，format.ts SSOT 已就位、無 locality / leverage 額外收益，暫緩。

#### 8. 信任邊界 deep module 補測 + B1 CSRF prefix — `server/middleware/csrf.ts` + `server/utils/{error-handler,serialize}.ts`

**問題**：這些是全系統最深的 cross-cutting module，卻只被 handler 測試間接覆蓋（而 handler 測試把上游全 mock 掉）。**(B1)** `csrf.ts:isApiKeyAuth` 比對 `Bearer sk_` 但實際 API key 前綴是 `dva_`（`api-key.ts:API_KEY_TOKEN_PREFIX`）——Bearer 分支永不命中，只有 `x-api-key` 路徑過 CSRF；前綴寫死兩處會漂移。`handleApiError` 的 4 路分派（ZodError / AppError / H3Error / unknown）零直測。`serialize()` 無 cycle 防護。`auth.ts` 的 access-token / refresh-token fallback 是安全關鍵，無測試 pin 住。

**解法**：B1——csrf.ts 改 `import { API_KEY_TOKEN_PREFIX }` 比對，未來不漂移。新建 `csrf.middleware.test.ts`（16 case，含 B1 regression：`Bearer dva_` 過、`Bearer sk_` 拒）、`error-handler.test.ts`（12 case，4 路分派 + pass-through 同 reference）、擴充 `serialize.test.ts`（+9 case：self / mutual cycle、深度 1000、`BigInt 0n`）。serialize 加 `WeakMap` cycle 防護（cycle 時回傳已轉好的 result 而非原物）。`auth.middleware.test.ts` 補足一般 cookie 驗證與 refresh fallback 的 route contract。

**通報未修的潛在點**：(1) serialize 對 Map / Set 靜默丟 entry（`Object.entries(Map)` 回空）——Prisma 不出 Map 故無炸點，測試標 `.skip`，一句話可修；(2) `requireUser`（401 強制）值得直測；(3) 既有測試 `clearAllMocks` 不清 implementation 的陷阱。

#### 9. financialFreedom currentAge 焊死修復（B2） — `lib/financialFreedom.ts`

**問題**：`calculateFinancialFreedom` 內 `const currentAge = 30` 焊死——純函數 `generateYearlyProjection` 介面接受 currentAge，但 orchestrator 把它固定成 30，非 30 歲使用者的退休年齡預測全錯。bug 被埋在 orchestrator，純函數測試全綠也看不到。

**解法**：`FinancialFreedomInput.currentAge?: number | null`（可選，不傳為 null）。關鍵設計：不傳時 `yearlyProjection.age` 全為 null——**不再偽造 30 歲，bug 被 type + null 語意逼出而非掩蓋**。composable 預設 30 維持歷史 UI 行為，page 加年齡 input（0–120）並在投影片段顯示年齡。+9 測試，含關鍵回歸（25 歲 vs 40 歲的 `yearlyProjection[0].age` 必須不同——正是純函數測試看不到的盲點）。

**長期建議（未做）**：加 `User.birthDate`（Date）讓多工具共用，需 schema migration + 設定頁。

#### 整合驗證期間的 inline 修正

平行程工產出後整合驗收時，由主執行緒 inline 修了三處 agent 未捕捉的問題：

- **serialize `.map(serialize)` 地雷**：候選 8 加 `seen` 參數後，`post-queries.ts` 的 `posts.map(serialize)` 會把 array index 塞進 `seen`（map callback 傳 `(value, index, array)`）炸掉 3 個 blog 測試。在 serialize source 加 `seen instanceof WeakMap` 守衛（root cause 修法，idiomatic `.map(serialize)` 恢復可用），而非在每個呼叫端閃。
- **diaries.get.ts 型別落差**：候選 5 把 `DiaryListItem` 從 `Awaited<ReturnType<typeof prisma.diary.findMany>>[number]`（因 Prisma 泛型未實例化塌成 `any`）改成真實 interface（`id: bigint`），暴露 bigint ↔ SerializedId 落差。拿掉 `Promise<DiariesApiResponse>` 標注（跟 `[id].get.ts` 一致；serialize 是 type-opaque 邊界）。
- **diary-read.ts `(d)` 隱式 any**：`DIARY_LIST_SELECT` 雖 `satisfies Prisma.DiarySelect`，但 `Promise.all` 解構 + 寬鬆 where 讓 `rawItems` 推導失效；map callback 補 `Prisma.DiaryGetPayload<{ select: typeof DIARY_LIST_SELECT }>` 型別。

#### 排除項

- **#9 統一資料層**：每個 composable / page 各自 `$fetch` + try/catch + toast 的樣板重複，沒有對應的散落 bug。抽象資料層會引進不必要的間接與介面，依 YAGNI 排除——除非未來出現明確痛點。

### 2026-08 架構深化（審計 18 項 + Research Capture 8 項）

`.scratch/architecture-audit-2026-08/` 驅動，另含前置的全量 audit findings 修復包（perf 數學改月報酬率、oversell 容忍、資料污染修復、XFF 信任邊界、i18n fallbackLocale）。

#### 1. 讀取側收斂 — overdue review、diary list、quote read

- `isThesisReviewOverdue` 統一 overdue-review 規則——修復 Timeline 在 review 完成後仍持續 nagging 的 bug
- Diary list 讀取收斂：server-side timeline filtering（不再有 false empty state）、單一 dedupe + excerpt helper
- Quote read seam：`getCachedQuote` + `fetchQuotesBounded`（attention 路徑恢復並發上限）

#### 2. Blog 寫入側 query layer — `server/utils/post-write.ts`

`post-queries.ts` 補上寫入對稱：`queryPostsAdmin` / `queryPostsPublic` persona 入口；re-publish 保留首次 `publishedAt`（先前會被覆蓋）。

#### 3. Admin 守衛單一化

全域 admin middleware 成為唯一守衛機制，移除 20 個 in-handler guard；修復 `/api/administrator` prefix 比對錯誤。

#### 4. Admin ETF 現代化 — `server/utils/etf-admin-queries.ts`

5 個 admin ETF handler 補上 Zod + `handleApiError` + query layer，與其他 context 對齊。

#### 5. Portfolio 計算收斂

`concentration(holdings, { basis })` 單一公式；attention coverage 改用 `valuationStatus`（不再 all-or-nothing）；thesis activation 改 full-replace（刪 `valueOrExisting` merge）。

#### 6. Client 端清理與介面收窄

刪除死模組 `useInvestmentActivity`、navigation store、router plugin（~130 行 ledger client seam 一併移除）；composable 介面收窄（FinancialFreedom 17→13、MobileDetection 19→2、Alerts 11→3）；`useDiaryDateConflict` controller 抽出（~130 行 ×2 去重、race guard 統一、+13 測試）。

#### 7. 型別單一真相

reviews / attention / activity 的 API payload 型別在源頭定義，刪除 `as-any` 與手動 intersection；時區解析雙側 SSOT（client `resolveUserTimezone`、server `getUserTimezone`，單一 fallback chain）。

#### 8. Research Capture Loop（8 項）

- RC-01 Quick Diary prefill pipeline（content / stockSymbols context，draft-protection append/keep）
- RC-02 Company Evidence web 寫入路徑（4 個 research sourceTypes、`createdVia WEB`、auto-watchlist、idempotent double-submit）
- RC-03 共用 **Capture Insight** UI（`useResearchCapture` + modal，a11y、三語、未登入隱藏）
- RC-04/05/06 工具整合（Market Rotation 4 個入口、SEC filings 帶 EDGAR provenance、Relative Value pair context、Seasonality 僅 quick diary）
- RC-07 Timeline overview 壓縮（summary strip + collapsible cards，Investment Timeline 命名保留）
- RC-08 BetaCockpitCard 移除（payload 一併移除；`decideBetaAllocation` 保留供 Current Market Summary 使用，見 `docs/BETA_COCKPIT.md` 封存註記）

### 2026-08 架構深化（audit r5：15 項）

第五輪審計（`.scratch/` 同期 issues），聚焦 deep module 擁有組裝與不變量。

#### 1. `lib/market-data/daily-prices.ts` seam

每日 OHLCV fetch + persist 收斂：單一 Yahoo client、`fetchDailyOhlcv`、`persistDailyPrices`（upsert-only 策略）、`isYahooRateLimitError`、統一 `resolveYahooRangeStart`。batch / breadth / seed-universe 三路共用，−202 行。

#### 2. `getRotationDashboardContext` 擁有 rotation 組裝 + staleness policy

五步組裝從 exposure / rotation-monitor handler 收斂進 module；Sector-Breadth-from-sectors-scope 不變量移入 module 內；stale 或 coverage <90% 的 breadth 強制 Market State 為 unknown；scope 驗證 SSOT 在 `lib/market-rotation/types.ts`。

#### 3. `listSharingPartners` 單一 sharing gate

雙向 per-resource sharing 規則（diaries | stockNotes）在 `partner.ts` 命名一次；company-hub inline filter 與 `loadCompareContext` diary gate 委派於它。

#### 4. `loadValuedHoldings` — `server/utils/portfolio-read.ts`

read → `calculateHoldings` → bounded quotes → enrich → aggregate 的組裝從 5 個 call site 收斂；enrichment 欄位集單一真相；`valuationStatus`（complete / partial / unavailable）與 priced-subset 語意從註解升級為受測行為。

#### 5. UI controller 收斂

- `useDialogA11y` 擁有 focus trap + scroll lock + focus restore + esc——三個手抄 a11y 狀態機合一，修復 QuickDiaryModal scroll-lock leak
- `QuickNoteEditorCore` 改收 composer controller（23×19 fan-out 收斂）；severity 參數化而非複製
- `DiaryAuthoringForm` 抽出——new / edit 頁面降至 routing-only（463→147、426→142 行）
- `useBlogDraft` composable——draft autosave / restore / clear 生命週期單一真相；admin blog 頁面硬編碼 zh 字串全數 i18n 化（parity test 把關）

#### 6. 測試基礎設施

`tests/fixtures/builders.ts` domain fixture builders（`aUser` / `aDiary` / `aTransaction` / `anAlert` / `aStockNote` / `aPost`，預設即完整 Prisma row shape 的 schema-tracking seam）；15 個測試檔遷移，淨 −180 行 fixture scaffolding。`requireApiKey` 信任邊界 10 個直測；1229 行 partners 頁面（唯一控制權限的 UI）補 contract tests。

#### 7. Cleanup pack

`trade-queries.ts` 刪除（自我描述的 legacy wrapper，零 production caller），transaction 讀取收斂為 `transaction-read.ts` 的 `readPortfolioTransactions`；死 partner serializer 與死 test helpers 移除；market endpoints 改用 `getRateLimitIdentifier`（安全 XFF policy）；k8s `DATABASE_URL` 移至 secretKeyRef；daily breadth writer 排進既有 rotation CronJob（`sh -ec` fail-fast，tsx 移至 dependencies——prod image prune devDeps 會讓 cron pod 失去 runner）。

### 2026-08 認證與契約深化（app-ready auth + lib/contracts）

#### 1. Fail-closed credential resolution + Bearer access tokens（ADR-0006）

`server/middleware/auth.ts` 重寫為單一 credential resolution 演算法，產生 `event.context.auth`（verified transport + identity）：顯式 credential（`Authorization: Bearer dva_*` / `Bearer <JWT>` / `x-api-key`）驗證失敗一律 401，不 fallback cookie；多個顯式 credential 拒絕 ambiguity。Native client（Expo）可用 `Authorization: Bearer <access JWT>`。CSRF 改為 transport-aware：`cookie` → requireCsrf，`bearer` / `api-key` → 豁免（終結 pre-verification header-sniff）。Integration test 鎖定 auth middleware 先於 csrf middleware。

#### 2. Error contract 正式化（ADR-0007）

保留 H3 wire shape 為官方契約：machine-readable `data.code`（命名 `MODULE_ACTION_REASON`）+ `requestId` 注入 `data`（注入點是 nitro `error` hook 單處——`server/plugins/error-contract.ts`）。Ownership mismatch 一律 404、刪除 `DIARY_ACCESS_DENIED` code；register P2002 → 409。Mobile 401 採 dumb flow（任何 401 → single-flight refresh → retry 一次 → logout）。

#### 3. `lib/contracts/` 邊界

Client-neutral 契約集中：`common/`（error codes SSOT——自 `lib/errors/codes.ts` 遷入、`SerializedId`）、`diary/`、`review/`、`stocks/`（timeline-source）。Diary wire contract 與 request 型別分離（`types/diary.ts` honest wire shapes）；diary list contract 以 zod schema formalize（frozen contract test）。error codes 的三語 i18n mapping 與 parity test 對齊新位置。

#### 4. SSOT 收尾三件

`lib/stocks/timeline-source.ts`（sourceType SSOT，agent / evidence / hub / timeline 全路徑共用）、user timezone formatting 收斂至 `lib/dates/format.ts`（15+ 檔案改用）、`lib/stocks/symbols.ts`（symbol param 處理 SSOT，11 個 handler 改用）。

#### 5. Diary 重複調解加固

`scripts/diary-reconcile-duplicates.ts` 加固 + MySQL integration tests（`tests/integration/diary-reconciliation.mysql.test.ts`）＋ `.scratch` issue 02（enforce one diary per user per date）文檔化。`docs/operations/DEPLOYMENT.md` 補 cron / 維運段落。

#### 6. 視覺與無障礙（非架構，一併記錄）

介面樣式遷移至 design tokens（`dt-*` color utilities）、a11y 與 localization 改善、date formatter 快取、market rotation 鍵盤可及 row controls、responsive app layout 統一（`PageContainer` + 導覽元件重整）。
