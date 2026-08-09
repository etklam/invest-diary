# Design System — Diary Vue

## Product Context
- **What this is:** 一個給個人交易者與投資者使用的投資日記平台，結合交易紀錄、持倉追蹤、提醒、工具與教育內容。它不是單純的內容站，也不是純 dashboard，而是「紀錄 + 判斷 + 複盤」的工作台。
- **Who it's for:** 有紀律需求的零售交易者、主動投資者、習慣透過日誌與數據校正自己決策的人。
- **Space/industry:** 個人投資工具、交易 journaling、金融教育內容。
- **Project type:** hybrid web app。公開頁面偏 editorial / marketing，登入後偏 workflow product。

## Aesthetic Direction
- **Direction:** Calm Institutional Ledger
- **Decoration level:** restrained
- **Mood:** 像一本每日翻閱的投資帳本，結合專業數據與冷靜判斷。保留金融產品的可信與專業，去掉浮誇的 glow、gradient 與 glass 效果。Ledger row、dense table、review prompt 是主要視覺語彙。色彩主要用於狀態標示，不用於裝飾。不要把華麗放在信任感前面，不要把裝飾放在數據前面。
- **Core statement:** Trade Basic is not an AI coach. It is a calm decision ledger for active investors.
- **Reference sites:** 本次未做外部競品研究，提案基於現有 codebase、產品類型與第一性原理。

## Post-Refactor Audit (2026-06-06)
- **方向調整：** 從 `Institutional Fintech`（glassmorphism + glow）轉向 `Calm Institutional Ledger`（clean panels + ledger rows + tables）。保留深色專業底色，移除 radial-gradient、color-mix glass effects、hover 動畫。
- **基礎元件系統建立：** 6 個新元件（LedgerCard, BaseButton, StatusBadge, DiaryNotePreview, EtfMobileCard, ReviewCandidateCard）全部使用 `dt-*` design token，支援亮/暗模式。
- **頁面重構完成：** homepage hero、diaries/index（日記資料庫）、tools/etf（ETF board）、tools/position-sizing（建倉計算器）。Scoped CSS 平均減少 85%+。
- **Token contract 保留：** `dt-*` tailwind class 映射不變，`design-tokens.css` 變數名稱不變。改動只觸及 value 和元件層。
- **Structured Review：** Diary 保留 thesis/risk/execution 原始決策，再以 reviewOutcome/reviewSummary/reviewLearning/reviewAdjustment 疊加事後複盤。專頁明確分隔唯讀原始脈絡與可編輯反思；Queue 優先呈現逾期/今日項目，Timeline 只顯示精簡結果，不把複盤內容灑得到處都是。
- **字體角色不變：** `Fraunces`（展示）、`Source Sans 3`（內文/UI）、`IBM Plex Mono`（數據/程式碼）三件套。
- **i18n 完整：** 所有新文案（hero copy、review prompts、field labels）均有 en/zh-TW/zh-CN 三語翻譯。

## Strategic Design Calls
- **Safe choices:** 保留清晰的資料層級、明確的 gain/loss semantic、緊湊但不擁擠的 app 密度，這些是投資工具的識字能力。Ledger row 和 dense table 作為主要 UI pattern，不是 card grid。
- **Decision 1:** 在 fintech 藍色系中保留 Fraunces serif 作為展示字體，讓產品在「專業交易平台」的基礎上疊加「有觀點的投資筆記」性格。
- **Decision 2:** 從 glassmorphism + glow 轉向 clean panel + border 風格。移除 radial-gradient、color-mix 透明效果、hover translateY 動畫。LedgerCard 使用 solid border + surface background，不用 glass 效果。
- **Decision 3:** 色彩嚴格只用於狀態（success/danger/warning）和數據語義（正/負/警告），不用於裝飾。Primary blue 只給主要行動，不當裝飾色。

## Typography
- **Display/Hero:** `Fraunces` — 給首頁、關鍵章節標題、文章大標使用。這個產品需要一點判斷力與觀點感，serif 比常見 grotesk 更像「寫過、想過、複盤過」。
- **Body:** `Source Sans 3` — 長文閱讀、表單說明、一般 UI 文字。比 `Inter` 少一點模板味，讀起來也更平穩。
- **UI/Labels:** `Source Sans 3` 600 / 700，所有 label、button、filter chip 都用同一語氣，不再混三種字味。
- **Data/Tables:** `IBM Plex Mono` — 只給數字、價格、日期、比例、log 摘要使用。要有 tabular-nums，讓交易資料真有「帳本感」。
- **Code:** `IBM Plex Mono`
- **Loading:** Google Fonts
  - `https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=IBM+Plex+Mono:wght@400;500;600&family=Source+Sans+3:wght@400;500;600;700&display=swap`
- **Scale:**
  - hero-xl: 4.5rem / 72px / 1.02
  - hero-lg: 3.5rem / 56px / 1.05
  - h1: 2.75rem / 44px / 1.08
  - h2: 2rem / 32px / 1.15
  - h3: 1.5rem / 24px / 1.2
  - body-lg: 1.125rem / 18px / 1.7
  - body: 1rem / 16px / 1.65
  - body-sm: 0.9375rem / 15px / 1.55
  - label: 0.75rem / 12px / 1.3 / uppercase 0.12em
  - data: 0.9375rem / 15px / tabular-nums

## Color
- **Approach:** restrained
- **Primary:** `#1D4ED8` — Ledger Blue。用於主要導覽、主 CTA、焦點框。比泛用 `#2563EB` 更深一階，降低「模板藍」感。
- **Secondary:** `#2563EB` — 次要互動、輔助提示。比 Primary 亮一階。
- **Accent:** `#059669` — Ledger Green。正向結果、完成、gain 數據。
- **Info:** `#0284C7` — 資訊面板、次要亮點（克制使用，不當裝飾）。
- **Neutrals:** 冷灰系，透過 `dt-*` design token 統一亮/暗模式
  - `#F4F6F9` background (light) / `#080D16` (dark)
  - `#FFFFFF` surface (light) / `#0F1623` (dark)
  - `#EEF2F7` surface-strong (light) / `#172033` (dark)
  - `#D5DCE6` border (light) / `rgba(148,163,184,0.14)` (dark)
  - `#94A3B8` border-strong
  - `#3F4B5B` text-muted (light) / `#CBD5E1` (dark)
  - `#0B1220` text-strong (light) / `#F1F5F9` (dark)
- **Semantic:**
  - success `#059669` (light) / `#34D399` (dark)
  - warning `#D97706` (light) / `#FBBF24` (dark)
  - error `#DC2626` (light) / `#F87171` (dark)
  - info `#0284C7`
- **Dark mode:** 不做單純反相。暗色模式像深夜交易工作台，以 solid surface + border 建構層級深度，不用玻璃擬態。
  - bg `#080D16`
  - surface `#0F1623`（solid，非半透明）
  - surface-raised `#172033`（solid，比 surface 亮一階）
  - border `rgba(148,163,184,0.14)`
  - text `#F1F5F9`
  - muted `#CBD5E1`
  - 所有 `dt-*` token 已映射，元件不直接使用 rgba 值

## Spacing
- **Base unit:** 8px
- **Density:** comfortable for public/editorial, compact-comfortable for authenticated product
- **Scale:** 2xs(4) xs(8) sm(12) md(16) lg(24) xl(32) 2xl(48) 3xl(64) 4xl(96)
- **Rules:**
  - 公開頁 section 間距不低於 64px，避免所有內容擠成一整片 feature soup
  - App 表單控制項內距 12px-16px，資料卡 20px-24px
  - 卡片內部最多使用 3 層間距級別，避免「每格都不一樣但都差不多」

## Layout
- **Approach:** hybrid
- **Grid:**
  - mobile: 4 columns
  - tablet: 8 columns
  - desktop: 12 columns
- **Max content width:** 1200px for app, 1280px for public/editorial
- **Border radius:**
  - input-sm: 12px
  - card-md: 16px
  - hero-lg: 24px
  - pill: 999px
- **Screen rules:**
  - 公開頁允許 editorial breakouts，但不能用 feature grid 填滿一切
  - 產品頁優先任務流，頂部永遠先回答「我現在能做什麼」
  - 工具頁改成「輸入區固定，結果區突出」的左右節奏，不要整頁平均鋪開

## Motion
- **Approach:** intentional
- **Easing:** enter `cubic-bezier(0.2, 0.8, 0.2, 1)` / exit `ease-in` / move `ease-in-out`
- **Duration:** micro(80ms) short(160ms) medium(280ms) long(420ms)
- **Rules:**
  - reveal animation 只保留在公開頁章節切換，不要把所有卡片都做同一種浮起來
  - 產品頁動效以任務回饋為主，像 filter 更新、copy 成功、save 完成、error 顯示
  - hover 位移最大 2px，避免整站像漂浮 UI kit

## Interaction Principles
- **Make the next move obvious:** 每個畫面第一視線內必須有主要任務，不要讓使用者先看一圈裝飾再找入口。
- **Show system confidence:** 成功、失敗、空狀態、載入中，要有穩定語氣與視覺模式。不能一頁很精緻，另一頁回到預設 alert。
- **Differentiate reading vs doing:** 文章、about、landing 是閱讀型；日記、工具、設定是操作型。兩者共享同一語系，但密度和節奏不同。
- **Use color with intent:** 電光藍只給主要行動與導航，青色給資訊亮點，綠色只給正向結果與紀律，不要互相搶戲。
- **Honor data:** 金額、比率、日期、持倉數據要使用等寬數字與穩定 baseline，這是金融產品的基本尊嚴。

## Component Rules
- **LedgerCard** — 主面板容器。border + surface + shadow-sm。不用 gradient，不用 glass，不用 glow。有 title/description 時顯示 header，無則不渲染。
- **BaseButton** — 4 個 variant：primary（solid dt-primary）、secondary（outline）、ghost（text only）、danger（solid red）。永遠不用 gradient。min-h-10 確保觸控友善。
- **StatusBadge** — 5 個 tone：neutral/success/danger/warning/accent。用於狀態標示，不用於裝飾。
- **EtfMobileCard** — 手機版 ETF compact row。3 欄 grid（1D change / RSI / MA status）。
- **ReviewCandidateCard** — 複盤候選卡片。顯示 thesis/risk + review status badge。
- **DiaryNotePreview** — 首頁 sample diary 卡片。靜態展示，讓使用者一眼理解產品。
- 禁止把「icon + 色塊圓底 + 三欄 feature card」當成萬用答案。
- 禁止全站一律玻璃擬態。浮層與暫態面板允許半透明，但主面板一律使用 LedgerCard（solid border + surface）。
- CTA 優先使用 BaseButton，不用 gradient button 當萬靈丹。
- 表單錯誤態統一用 semantic border + inline help text，不要只靠 toast。
- Navigation 應該像工具架，不是第二個 marketing hero。

## Screen-Level Recommendations
- **Landing (已完成)：** 從「功能介紹頁」改成「交易者的工作方法頁」。Hero 使用 DiaryNotePreview 展示真實日記樣本，搭配 BaseButton CTA。移除 bg-grid、terminal-panel、三欄 metric card。
- **Auth:** 左側宣傳面板保留，但要縮短 marketing copy，讓登入重心更乾淨。加上 trust cues，例如資料不會公開、登入後回到上次工作區。
- **Diary Library (已完成)：** 保留搜尋、篩選、排序、分頁、Quick Diary 與完整日記編輯入口；移除與 Timeline 首頁角色重疊的 KPI、Next Move、Desk Rules 與複盤候選面板。
- **Tools — ETF (已完成)：** 統一使用 dt-* token + StatusBadge + BaseButton + EtfMobileCard（手機版）。移除 slate-* 硬編碼與自訂 statusClass()。
- **Tools — Position Sizing (已完成)：** 移除 .hero-spotlight gradient 與 .result-banner gradient，改用 clean border + surface + dt-primary solid。Scoped CSS 減少 81%。
- **Tools — Seasonality (已完成)：** 移除 hero-spotlight linear-gradient、month-highlight radial-gradient + color-mix，全部改用 LedgerCard + dt-* tokens。Scoped CSS 從 218 行降至 0。
- **Tools — Relative Value (已完成)：** 移除 40+ inline styles、glassmorphism（backdrop-blur/gradient headers）、preset 按鈕 gradient。全部改用 LedgerCard + BaseButton + dt-* tokens。
- **Tools — Financial Freedom (已完成)：** 移除 hero-spotlight gradient、result-banner radial-gradient、表單欄位全 Tailwind 化。Scoped CSS 從 233 行降至 38 行。
- **Articles:** 保留 editorial 方向，但收斂 hover 飄浮，讓長文閱讀更沉穩。

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-05 | 定義 `Editorial Ledger` 為主設計方向 | 這個產品同時需要內容可信感與紀律工具感，不能再分裂成 marketing / SaaS / dashboard 三種人格 |
| 2026-04-05 | 採用 `Fraunces + Source Sans 3 + IBM Plex Mono` | 分清楚敘事、UI、數據三種語氣，結束當前字體角色混亂 |
| 2026-04-05 | 改用 warm paper + deep ledger blue + burnt copper | 避免泛用 fintech cyan glass 模板味，建立更穩定且有記憶點的配色 |
| 2026-04-05 | 公開頁與產品頁統一語系但不同密度 | 讓品牌人格一致，同時保留閱讀與操作的最佳節奏 |
| 2026-05-19 | 設計方向從 `Editorial Ledger` 轉向 `Institutional Fintech`，全站 16 檔案重構 | 深色背景（`#0B1220`）、電光藍主色（`#2563EB`）、青色資訊（`#38BDF8`）、玻璃擬態表面（`rgba(255,255,255,0.04-0.08)`）。新增 12 個 glass token，清除所有硬編碼 copper/orange/indigo 顏色。取代 2026-04-05 暖色紙張決策 |
| 2026-06-06 | 設計方向從 `Institutional Fintech` 轉向 `Calm Institutional Ledger`，5 phase 重構 | 移除 glassmorphism、radial-gradient、hover translateY。建立 6 個 dt-* 元件（LedgerCard/BaseButton/StatusBadge/EtfMobileCard/ReviewCandidateCard/DiaryNotePreview）。4 頁重構（homepage/diary-desk/etf/position-sizing），scoped CSS 平均減少 85%+。Diary 新增 thesis/risk/review 欄位支援複盤流程。保留深色底色與電光藍主色，但改用 solid surface 替代半透明。取代 2026-05-19 玻璃擬態決策 |
| 2026-06-06 | Phase 6：全站工具頁統一完成 | seasonality（scoped CSS 218→0）、relative-value（移除 40+ inline styles + glassmorphism）、financial-freedom（scoped CSS 233→38）。全站 5 個工具頁全部完成 Calm Institutional Ledger 重構，淨刪 445 行 |
| 2026-07-01 | Impeccable full pass：11 phase 全站一致性稽核 | 跨 7 個產品區域（auth layout、navigation、diary desk、beta cockpit、tools、articles/public、auth/onboarding）與 6 個 discipline 元件清殘留 glassmorphism、radial/linear-gradient、hover translateY、scale-105/95 micro-bounce、glow shadow。消除 discipline 模組自帶的金（#C9A962）＋紫（#7C3AED）子設計系統與 Playfair Display 字體，全部映射至 `var(--color-primary)`。StatusBadge/BaseButton token 對齊（`green-500/30`→`dt-success/30`、`red-600`→`dt-danger`、`min-h-10`→`min-h-11` 44px 觸控目標）。LandingCard/LandingSection/LandingBadge/PWAUpdatePrompt/BlogCard/QuickNoteEditorCore 全部回到 solid surface + border + dt-* tokens。Timeline 頁：移除 gradient 時間軸線、radial-gradient dot pattern、translate-x-2 card hover、amber dot glow shadow；raw amber/emerald badge → dt-warning/dt-success。Auth login/register：backdrop-blur shell 移除，hardcoded navy gradient（#11263a/#1c3145/#233948）→ `var(--color-panel-ink)`。Phase 10 gates：lint 0 errors / typecheck clean / 1761 tests pass / build ✅。保留 PRODUCT.md / DESIGN.md 方向與所有 i18n、a11y 設定 |
| 2026-07-17 | Consistency + craft pass | 收斂 calendar/timeline 至 dt-* + LedgerCard/BaseButton；token 微調更深墨色與克制主藍；DesktopNav/BottomNav/BaseButton/LedgerCard 去掉 cyan/slate 硬編碼。 |
| 2026-08-09 | Timeline-first information architecture | 已登入首頁統一為 `/timeline`；桌面導覽改為 Timeline 直達與 Journal/Portfolio/Research/More 分組，行動底欄改為 Timeline/Portfolio/Quick Diary/Review/More。Quick Diary 由 authenticated shell 持有唯一 modal，Calendar 等 contextual surface 只傳 context。Pair View 成為 Timeline 閱讀模式，Diaries 收斂為搜尋管理 library。 |
