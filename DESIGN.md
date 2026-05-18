# Design System — Diary Vue

## Product Context
- **What this is:** 一個給個人交易者與投資者使用的投資日記平台，結合交易紀錄、持倉追蹤、提醒、工具與教育內容。它不是單純的內容站，也不是純 dashboard，而是「紀錄 + 判斷 + 複盤」的工作台。
- **Who it's for:** 有紀律需求的零售交易者、主動投資者、習慣透過日誌與數據校正自己決策的人。
- **Space/industry:** 個人投資工具、交易 journaling、金融教育內容。
- **Project type:** hybrid web app。公開頁面偏 editorial / marketing，登入後偏 workflow product。

## Aesthetic Direction
- **Direction:** Institutional Fintech
- **Decoration level:** intentional
- **Mood:** 像一個專業交易者的深色工作台，結合數據驅動儀表板與玻璃擬態面板。深色背景營造專注感，電光藍色提供精準導引，玻璃材質在層級間建立通透的空間深度。不要把華麗放在信任感前面，不要把裝飾放在數據前面。
- **Reference sites:** 本次未做外部競品研究，提案基於現有 codebase、產品類型與第一性原理。

## Post-Refactor Audit (2026-05-19)
- **色彩系統已統一：** 全站 CSS 變數從暖色紙張（`#F6F1E8`）遷移至 Institutional Fintech 冷色系（`#0B1220` 深色底、`#2563EB` 電光藍、`#38BDF8` 青色）。16 個檔案中所有硬編碼 copper/orange/indigo 顏色已清除，統一使用設計 token。
- **設計 Token 層重構完成：** `design-tokens.css` 新增 12 個 glass token（`--glass-surface`、`--glass-border`、`--color-grid-dot`、`--shadow-glow`），暗色模式表面從不透明色轉為半透明白色（玻璃擬態）。
- **字體角色已嚴格定義：** `Fraunces`（展示）、`Source Sans 3`（內文/UI）、`IBM Plex Mono`（數據/程式碼）三件套，全域一致，無冗餘載入。
- **Bridge 層保持一致：** `main.css` 的 Tailwind 顏色映射自動跟隨 token 更新，`text-slate-*`、`bg-white` 等標準類別正確對應新色調。
- **待觀察：** 亮色模式下冷灰系（slate-based）取代暖紙色後的閱讀舒適度，以及行動端暗色模式下的玻璃擬態可讀性。

## Strategic Design Calls
- **Safe choices:** 保留清晰的資料層級、明確的 gain/loss semantic、緊湊但不擁擠的 app 密度，這些是投資工具的識字能力。
- **Risk 1:** 在 fintech 藍色系中導入 Fraunces serif 作為展示字體，讓產品在「專業交易平台」的基礎上疊加「有觀點的投資筆記」性格。代價是不像標準無襯線 SaaS，但換來辨識度與內容可信感。
- **Risk 2:** 深色背景搭配玻璃擬態面板，走 institutional fintech 資料工作台路線。代價是比暖紙風格更冷，但更適合資料密集工作與螢幕長時間觀看。
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
- **Primary:** `#2563EB` — Electric Blue。用於主要導覽、主 CTA、焦點框、重要資訊區塊。冷調藍色傳達專業與信任，適合金融決策情境。
- **Secondary:** `#3B82F6` — Sky Blue。用於次要互動、輔助按鈕、連結提示。比 Primary 輕一階，建立清晰的視覺層級。
- **Accent:** `#10B981` — Terminal Green。用於正向行為、完成、持續、紀律提示、gain 數據。
- **Info:** `#38BDF8` — Cyan Light。用於資訊面板、kicker、資料亮點。
- **Neutrals:** 冷灰系，搭配玻璃擬態的透明層級
  - `#F8FAFC` surface-0 (light) / `#0B1220` (dark)
  - `#F1F5F9` surface-1 (light) / translucent glass (dark)
  - `#CBD5E1` border-soft (light) / `rgba(255,255,255,0.08)` (dark)
  - `#94A3B8` border-strong
  - `#475569` text-muted (light) / `#CBD5E1` (dark)
  - `#0F172A` text-strong (light) / `#F8FAFC` (dark)
- **Semantic:**
  - success `#10B981` (light) / `#34D399` (dark)
  - warning `#F59E0B` (light) / `#FBBF24` (dark)
  - error `#EF4444` (light) / `#F87171` (dark)
  - info `#38BDF8`
- **Dark mode:** 不做單純反相。暗色模式像深夜交易工作台，以半透明表面建構層級深度。
  - bg `#0B1220`
  - surface `rgba(255,255,255,0.04)`
  - surface-raised `rgba(255,255,255,0.06)`
  - border `rgba(255,255,255,0.08)`
  - text `#F8FAFC`
  - muted `#CBD5E1`
  - 玻璃擬態 token: `--glass-surface`, `--glass-border` 提供可控的透明層級

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
| 2026-05-19 | 設計方向從 `Editorial Ledger` 轉向 `Institutional Fintech`，全站 16 檔案重構 | 深色背景（`#0B1220`）、電光藍主色（`#2563EB`）、青色資訊（`#38BDF8`）、玻璃擬態表面（`rgba(255,255,255,0.04-0.08)`）。新增 12 個 glass token，清除所有硬編碼 copper/orange/indigo 顏色。取代 2026-04-05 暖色紙張決策 |
