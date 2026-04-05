# Design System — Diary Vue

## Product Context
- **What this is:** 一個給個人交易者與投資者使用的投資日記平台，結合交易紀錄、持倉追蹤、提醒、工具與教育內容。它不是單純的內容站，也不是純 dashboard，而是「紀錄 + 判斷 + 複盤」的工作台。
- **Who it's for:** 有紀律需求的零售交易者、主動投資者、習慣透過日誌與數據校正自己決策的人。
- **Space/industry:** 個人投資工具、交易 journaling、金融教育內容。
- **Project type:** hybrid web app。公開頁面偏 editorial / marketing，登入後偏 workflow product。

## Aesthetic Direction
- **Direction:** Editorial Ledger
- **Decoration level:** intentional
- **Mood:** 像一本被高頻翻閱的投資筆記本，前台有觀點感，後台有紀律感。視覺上要有內容重量，不要像任何一個套版 SaaS。
- **Reference sites:** 本次未做外部競品研究，提案基於現有 codebase、產品類型與第一性原理。

## AI Slop Audit
- 公開頁目前有明顯的玻璃卡、浮動 orb、功能卡連發問題。單個元素不算罪，疊在一起就變成「很會做 landing page 的模板」，不是這個產品自己的臉。
- `pages/index.vue`、`pages/auth/login.vue`、`pages/diaries/index.vue` 是三套人格。首頁像 content-heavy fintech marketing，登入像標準 SaaS，日記頁又像泛用後台卡片庫。這種斷裂比醜更傷，因為使用者會覺得產品沒有中心。
- 字體角色沒有被嚴格定義。全域同時載入 `Playfair Display`、`Inter`、`Plus Jakarta Sans`，但沒有清楚規定誰負責敘事、誰負責 UI、誰負責資料。結果就是頁面看起來「有設計過」，但沒有章法。
- 互動狀態偏表面。多數地方只有 hover 換色或卡片微上浮，缺少輸入、過濾、成功、風險、複盤這些高頻任務真正需要的節奏感與層級。

## Strategic Design Calls
- **Safe choices:** 保留清晰的資料層級、明確的 gain/loss semantic、緊湊但不擁擠的 app 密度，這些是投資工具的識字能力。
- **Risk 1:** 公開頁標題導入 serif，讓產品從泛用金融藍綠科技風退一步，變成「有觀點的投資筆記」。代價是沒有那麼像標準 SaaS，但換來辨識度與內容可信感。
- **Risk 2:** 背景與卡片改走 paper-and-ink，而不是 cyan glass。代價是少一點「新創炫光」，但更適合 journaling 與長時間閱讀。
- **Risk 3:** 公開頁與產品頁統一在同一個設計語系下，但採不同密度。代價是不能每頁各玩各的，換來產品人格完整。

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
- **Primary:** `#17324D` — Deep Ledger Blue。用於主要導覽、主 CTA、焦點框、重要資訊區塊。它比亮青更穩，適合金融決策情境。
- **Secondary:** `#B85C38` — Burnt Copper。用於 editorial 強調、章節引子、特定 CTA。這是產品的辨識點，不是到處灑的糖果色。
- **Accent:** `#1C6B5C` — Discipline Green。用於正向行為、完成、持續、紀律提示。
- **Neutrals:** 暖灰紙面，不要純藍灰科技底
  - `#F6F1E8` surface-0
  - `#ECE3D6` surface-1
  - `#D7CCBC` border-soft
  - `#A19687` text-muted
  - `#4E463E` text-secondary
  - `#191714` text-strong
- **Semantic:**
  - success `#1C6B5C`
  - warning `#A56A18`
  - error `#B33A2F`
  - info `#2F5E88`
- **Dark mode:** 不做單純反相。暗色模式要像深色工作桌，不是黑底 neon app。
  - bg `#0F1316`
  - surface `#161C20`
  - surface-raised `#1C2328`
  - border `#2A343B`
  - text `#F3EEE6`
  - muted `#B7AEA2`
  - primary 在 dark mode 降飽和 12%，secondary 降飽和 18%

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
  - input-sm: 10px
  - card-md: 16px
  - hero-lg: 28px
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
- **Use color with intent:** 銅色只給觀點與行動召喚，綠色只給正向結果與紀律，不要互相搶戲。
- **Honor data:** 金額、比率、日期、持倉數據要使用等寬數字與穩定 baseline，這是金融產品的基本尊嚴。

## Component Rules
- 禁止把「icon + 色塊圓底 + 三欄 feature card」當成萬用答案。
- 禁止全站一律玻璃擬態。只有需要浮層、導航或暫態面板時才允許半透明。
- CTA 優先使用 solid primary 或 ink button，不再用預設 gradient button 當萬靈丹。
- 表單錯誤態統一用 semantic border + inline help text，不要只靠 toast。
- Navigation 應該像工具架，不是第二個 marketing hero。

## Screen-Level Recommendations
- **Landing:** 從「功能介紹頁」改成「交易者的工作方法頁」。少一點 feature grid，多一點 journaling flow、真實內容、樣本紀錄片段。
- **Auth:** 左側宣傳面板保留，但要縮短 marketing copy，讓登入重心更乾淨。加上 trust cues，例如資料不會公開、登入後回到上次工作區。
- **Diary List:** 把目前卡片瀑布改成帶有主次層級的工作台。上方顯示今日狀態、未完成複盤、最近交易；列表區再顯示條目。
- **Tools:** calculator 頁面已經有雛形，但要統一成 ledger widgets，不要每個工具自己長一套 hero。
- **Articles:** 保留 editorial 方向，但收斂玻璃、orb、hover 飄浮，讓長文閱讀更沉穩。

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-05 | 定義 `Editorial Ledger` 為主設計方向 | 這個產品同時需要內容可信感與紀律工具感，不能再分裂成 marketing / SaaS / dashboard 三種人格 |
| 2026-04-05 | 採用 `Fraunces + Source Sans 3 + IBM Plex Mono` | 分清楚敘事、UI、數據三種語氣，結束當前字體角色混亂 |
| 2026-04-05 | 改用 warm paper + deep ledger blue + burnt copper | 避免泛用 fintech cyan glass 模板味，建立更穩定且有記憶點的配色 |
| 2026-04-05 | 公開頁與產品頁統一語系但不同密度 | 讓品牌人格一致，同時保留閱讀與操作的最佳節奏 |
