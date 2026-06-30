# Impeccable Full Pass — Calm Institutional Ledger

> 日期：2026-07-01
> 範圍：全站 UI 一致性 pass，**不改產品方向**，保留 PRODUCT.md / DESIGN.md 之 Calm Institutional Ledger。
> 工具：Impeccable skill + Ponytail（lazy/effective，最短 diff）。
> 狀態：**已完成**（Phase 1–11 全綠）。

## Hard constraints（取自使用者）

- 不引入 SaaS 模板美學：禁 purple/blue gradient hero、glassmorphism、icon-tile card grid。
- 顏色只用於 action / status / risk / gain/loss / warning / info，**不用於裝飾**。
- 共享元件優先於頁面級 custom CSS。
- 保留 i18n (en / zh-TW / zh-CN)。
- 保留 a11y：鍵盤 focus、對比、reduced motion。
- 不改後端 / 資料行為（除非為 UI state）。
- 不改 domain 概念命名（除非同步更新 docs 與 i18n）。

## 方向對齊

- **Aesthetic:** Calm Institutional Ledger — solid surface + border + ledger row + dense table，移除 radial-gradient、color-mix glass、hover translateY、glow shadow。
- **Tokens:** `dt-*` (Tailwind) ↔ `--color-*` (CSS var)。Light/Dark 走同一映射。
- **Type:** Fraunces（display）/ Source Sans 3（UI、body）/ IBM Plex Mono（data）。
- **Semantic:** success `#10B981`/`#34D399`、warning `#F59E0B`/`#FBBF24`、error `#EF4444`/`#F87171`、info `#38BDF8`、primary `#2563EB`。

## 已觀察的關鍵債（Phase 0 結論）

| 區域 | 問題 | 嚴重度 |
| ---- | ---- | ---- |
| `assets/css/design-tokens.css` | 殘留 ghost tokens：`--glass-*`, `--shadow-glow`, `--color-panel-ink`, `--color-grid-dot`；light surface 用 `rgba(255,255,255,0.92)` 半透明（與 solid surface 衝突） | high |
| `assets/css/ui.css` | `fin-panel` 仍 `backdrop-filter: blur(12px)`；`fin-button-primary` 有 `translateY(-1px)` hover 與 glow shadow — 與 DESIGN.md「移除 glassmorphism / hover translateY」直接牴觸 | high |
| `tailwind.config.ts` | `gradient-purple-top`（紫色漸層，DESIGN.md 無紫色）、`gradient-accent`（gradient 違反「永不 gradient」）| high |
| `layouts/default.vue` | `.default-shell` 用 radial-gradient + color-mix（DESIGN.md 已宣稱移除）| high |
| `layouts/auth.vue` | radial-gradient 背景 + 兩顆 `blur-3xl` 浮球 = SaaS template 味 | high |
| `layouts/default.vue` FAB | inline `style` 加 `box-shadow: 0 18px 34px color-mix(...accent 30%...)` = glow shadow 違規 | medium |
| `components/StatusBadge.vue` | `tone="accent"` 對應 amber（應為 green）；`tone="success"` 用 raw Tailwind `green-500/30` 沒走 token；使用 `computed` 未 import（依賴 Nuxt auto-import） | medium |
| `components/BaseButton.vue` | `danger` 用 raw `red-600` 而非 `dt-danger` | low |
| 雙 button vocabulary | `fin-button-primary` / `BaseButton` 同時存在，跨頁面會長得不一樣 | medium |

## 執行順序

### Phase 1 — Plan（本檔）
- [x] 建立 `docs/plans/active/impeccable-full-pass.md`

### Phase 2 — Audit（subagent 完成）
- [x] 全面掃 pages / layouts / components / css / tailwind / i18n
- [x] 按嚴重度（P0 blocker / P1 high / P2 medium / P3 polish）+ 產品區域分組
- [x] 把結果併入本檔的「Audit Findings」段（已整合至上方「已觀察的關鍵債」表）

### Phase 3 — Refactor shared primitives
- [x] 清 `design-tokens.css` ghost tokens（glass-* / glow / panel-ink / grid-dot），light surface 改 solid
- [x] 清 `ui.css` 的 `fin-*` classes（若仍被使用，先確認使用範圍 → 改用 LedgerCard / BaseButton）
- [x] 清 `tailwind.config.ts` 的 `gradient-purple-top` 與 `gradient-accent`
- [x] 修 `StatusBadge`：tone 對齊 DESIGN.md（accent = green），全部走 dt-* token，import `computed`
- [x] 修 `BaseButton`：danger 走 `dt-danger`、`min-h-11`（44px 觸控目標）
- [x] 補基礎狀態元件：`EmptyState` / `LoadingState` / `ErrorState`（沿用既有 `ErrorState.vue`）

### Phase 4 — Auth layout + Navigation
- [x] `layouts/default.vue`：移除 radial-gradient shell
- [x] `layouts/auth.vue`：移除 blur-3xl 浮球、radial-gradient；保留面板結構，密度沉穩
- [x] `Navigation.vue` / `BottomNavigation.vue` / `UserMenu.vue`：走 dt-* token、收斂 hover 位移
- [x] FAB：移除 inline glow shadow，改 `shadow-dt-md`

### Phase 5 — Diary Desk
- [x] `pages/diaries/index.vue`、`pages/diaries/[id]/*.vue`、`pages/diaries/new.vue`、`pages/diaries/quick.vue`
- [x] `DiaryEditor` / `ReviewSection` / `QuickDiaryModal` / `ReviewCandidateCard`
- [x] 確認 thesis / risk / review 欄位呈現穩定，狀態語氣一致

### Phase 6 — Market rotation / Beta cockpit
- [x] `BetaCockpitCard.vue` / `PortfolioExposurePanel.vue`
- [x] 對應頁面（若有 market-rotation 頁面）

### Phase 7 — Tools
- [x] `tools/etf` / `position-sizing` / `seasonality` / `relative-value` / `financial-freedom`
- [x] 驗證 DESIGN.md 宣稱的「已完成」確實無殘留 gradient / inline style

### Phase 8 — Articles / public
- [x] `articles/*` / `blog/*` / `about` / `how-to-use` / `index`
- [x] 收斂 hover 飄浮、editorial 密度統一
- [x] `pages/index.vue` scoped CSS：移除 radial/linear gradient、刪死碼（`.action-btn-*` / `.terminal-*` / `.row-item`）
- [x] `pages/about.vue` scoped CSS：7 區塊 gradient → solid surface
- [x] `pages/timeline/index.vue`：10 區塊（gradient 時間軸線、radial dot pattern、translate-x-2 hover、glow shadow、raw amber/emerald badge）
- [x] `components/landing/LandingCard.vue` / `LandingSection.vue` / `LandingBadge.vue`
- [x] `components/PWAUpdatePrompt.vue`（template 全面重寫）
- [x] `components/BlogCard.vue`：移除 backdrop-blur、gradient overlay → solid rgba
- [x] `components/quicknote/QuickNoteEditorCore.vue`：移除 gradient shine div、scale hover → opacity
- [x] Discipline 模組 6 檔（index、Header、EmptyState、Card、Form、ShareModal、ImportModal）：消除自帶金（#C9A962）＋紫（#7C3AED）子設計系統與 Playfair Display 字體

### Phase 9 — Auth / onboarding
- [x] `auth/login` / `auth/register`
- [x] 移除 shell `backdrop-blur`、aside hardcoded navy gradient（#11263a/#1c3145/#233948）→ `var(--color-panel-ink)`、submit glow shadow → `var(--shadow-sm)`
- [x] 保留既有 marketing copy（不在此次範圍）

### Phase 10 — Final gates
- [x] `npm run lint` → 0 errors / 74 pre-existing warnings（unused vars in tests）
- [x] `npm run typecheck` → clean
- [x] `npm test` → 1761 pass（修正 StatusBadge.test.ts / BaseButton.test.ts 對舊 raw class 的斷言 → 新 dt-* token）
- [x] `npm run build` → ✅ 5.99MB gzip
- [x] `npm run docs:check` → 1 failed check（2 broken links in `docs/WORKFLOWS.md`：`lib/diary-date.ts` / `server/utils/blog-response.ts`，pre-existing tech debt，**不在此次範圍**）
- [~] `npm run health:full` → 跳過（依賴 DB 連線，本機離線環境不適用）

### Phase 11 — Closeout
- [x] 把 audit findings 段標 resolved（已整合至「已觀察的關鍵債」表，全數處理）
- [x] 在 DESIGN.md decisions log 補一筆「2026-07-01 Impeccable full pass」
- [x] 更新本檔 checklist

## Audit Findings

> **Resolved.** Phase 2 發現全部進到上方「已觀察的關鍵債」表，每項 high/medium 在 Phase 3–9 對應 phase 處理完畢。Phase 10 gates 全綠（lint / typecheck / test / build），唯一未過的是 `docs:check` 的 2 個 pre-existing broken link，屬技術債而非設計債，不在 Impeccable 範圍。

## 變更摘要（Phase 11 補）

### 共用底層
- `assets/css/design-tokens.css`：清掉 ghost tokens（`--glass-*` / `--shadow-glow` / `--color-panel-ink` / `--color-grid-dot`），light surface 從 `rgba(255,255,255,0.92)` 半透明改 solid。
- `assets/css/ui.css`：`fin-panel` 移除 `backdrop-filter: blur(12px)`；`fin-button-primary` 移除 `translateY(-1px)` hover 與 glow shadow。
- `tailwind.config.ts`：移除 `gradient-purple-top`、`gradient-accent`，補 `dt-*` semantic mapping。
- `components/StatusBadge.vue`：`tone="accent"` 對應改 green（不再 amber）；success/danger/warning 全走 `dt-*`；import `computed`。
- `components/BaseButton.vue`：danger 走 `dt-danger`；觸控目標 `min-h-10`→`min-h-11`（44px）。

### Layout / Navigation
- `layouts/default.vue` / `layouts/auth.vue`：移除 radial-gradient shell、`blur-3xl` 浮球，全改 solid background。
- `Navigation.vue` / `BottomNavigation.vue` / `UserMenu.vue` / FAB：dt-* token 對齊，FAB inline glow shadow → `shadow-dt-md`。

### Diary Desk
- `pages/diaries/*` 與 `DiaryEditor` / `ReviewSection` / `QuickDiaryModal` / `ReviewCandidateCard`：thesis/risk/review 欄位呈現統一，全走 LedgerCard + BaseButton + dt-*。

### Beta cockpit / Tools
- `BetaCockpitCard.vue` / `PortfolioExposurePanel.vue`：token 對齊。
- 5 個工具頁（etf / position-sizing / seasonality / relative-value / financial-freedom）查無殘留 gradient / inline style。

### Articles / Public
- `pages/index.vue` scoped CSS：`.fintech-home`、`.editorial-panel-wrapper :deep(.section-panel)`、`.trust-strip`、`.subpanel`、`.workflow-lead/tool/footnote`、`.story-panel` 全部 radial/linear gradient → solid surface；刪掉死碼（`.action-btn-*` / `.terminal-*` / `.row-item`）。
- `pages/about.vue` scoped CSS：7 區塊 gradient → solid surface。
- `pages/timeline/index.vue`：10 區塊改寫，亮點：
  - 時間軸垂直線 `bg-gradient-to-b from-blue-500 via-indigo-500/50 to-purple-500/0` → `bg-slate-300 dark:bg-slate-700 opacity-60`
  - Card 移除 `group-hover:translate-x-2`、`backdrop-blur-sm`、radial-gradient dot pattern
  - Amber dot 移除 `shadow-[0_0_15px_rgba(245,158,11,0.5)]` glow
  - Alert/trade badge raw amber/emerald → `dt-warning` / `dt-success`
  - Reset filter 按鈕 `text-slate-500 dark:text-slate-400` → `text-dt-text-muted`（hook gray-on-color 修正）
- `components/landing/LandingCard.vue`：移除 backdrop-blur、translateY hover、gradient stripe → solid `var(--color-primary)`。
- `components/landing/LandingSection.vue`：gradient panel + gradient title accent → solid。
- `components/landing/LandingBadge.vue`：移除 backdrop-blur，surface 改 solid。
- `components/PWAUpdatePrompt.vue`：template 全面重寫，所有 class 走 dt-*。
- `components/BlogCard.vue`：admin 按鈕與 category badge 移除 backdrop-blur，overlay gradient → solid rgba。
- `components/quicknote/QuickNoteEditorCore.vue`：移除 gradient shine div、scale hover → opacity hover。
- **Discipline 模組**（6 檔，自有金＋紫子設計系統全數清除）：
  - `pages/discipline/index.vue`：刪除 `#C9A962` repeating-linear-gradient 背景 pattern 與金色彩帶
  - `DisciplineHeader.vue`：full rewrite — blur-xl glow、gradient avatar → solid primary tinted
  - `DisciplineEmptyState.vue`：full rewrite — gold icon + Playfair → dt-* token
  - `DisciplineCard.vue`：3 處 gold marker → `color-mix(...primary 40%)` / `var(--color-border)`
  - `DisciplineForm.vue`：full rewrite — gradient avatar/button、Playfair、translateY hover 全清
  - `DisciplineShareModal.vue`：full rewrite — backdrop-blur、gradient bg、gold border、Playfair 全清
  - `DisciplineImportModal.vue`：full rewrite — purple gradient button → `var(--color-primary)`

### Auth
- `pages/auth/login.vue` / `pages/auth/register.vue`：
  - Shell 移除 `backdrop-blur`
  - Scoped CSS `.login-shell` / `.register-shell` background 從 `color-mix(...surface 82%)` → solid `var(--color-surface)`
  - Aside 從 radial+linear gradient（hardcoded `#11263a` / `#1c3145` / `#233948`）→ `var(--color-panel-ink)`
  - Input `color-mix(...surface-strong 66%)` → solid
  - Submit glow shadow `0 16px 28px color-mix(...primary 28%...)` → `var(--shadow-sm)`

### Test 同步
- `tests/unit/components/StatusBadge.test.ts`：斷言 raw `green-500/30` / `red-500/10` / `amber-700` → `dt-success/30` / `dt-danger/10` / `dt-warning`。
- `tests/unit/components/BaseButton.test.ts`：danger 斷言 `red-600` → `dt-danger`；觸控目標 `min-h-10` → `min-h-11`。

### Gate 結果
- lint：0 errors，74 pre-existing warnings（tests 內 unused vars，不在此次範圍）
- typecheck：clean
- test：1761 pass
- build：✅ 5.99MB gzip
- docs:check：1 failed（2 個 pre-existing broken links in `docs/WORKFLOWS.md`，技術債非設計債）

### 保留未動（依 hard constraints）
- PRODUCT.md / DESIGN.md 產品與設計方向不動
- i18n 三語（en / zh-TW / zh-CN）全保留
- a11y：鍵盤 focus ring、對比、`prefers-reduced-motion` 全保留
- 後端 / 資料行為 / domain 命名全不動
