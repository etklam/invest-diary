# UI 色彩系統重構計畫

> **專案**: diary-vue (Nuxt 4 + TailwindCSS + @nuxtjs/color-mode)
> **日期**: 2026-04-15
> **範圍**: Dark/Light Mode 對比度修正、陰影層次恢復、Light Mode 漏色修復

---

## 目錄

1. [問題總覽](#問題總覽)
2. [Phase 1: Light Mode 漏色修正](#phase-1-light-mode-漏色修正)
3. [Phase 2: 暗色陰影 + Token 對比度修正](#phase-2-暗色陰影--token-對比度修正)
4. [Phase 3: Dark Mode 低對比類別批次替換](#phase-3-dark-mode-低對比類別批次替換)
5. [Phase 4: 硬編碼色彩修正](#phase-4-硬編碼色彩修正)
6. [Phase 5: fin-* 組件確認](#phase-5-fin--組件確認)
7. [Phase 6: 驗證](#phase-6-驗證)
8. [關鍵檔案清單](#關鍵檔案清單)
9. [提交策略](#提交策略)

---

## 問題總覽

### 問題 1: Light Mode 下部分組件顯示深色
部分組件使用 `@media (prefers-color-scheme: dark)` 繞過手動主題切換，或硬編碼深色值無 light 版本。使用者在 light mode 下看到深色組件。

### 問題 2: Dark Mode 對比度不足
多處 Tailwind `dark:` 類別的文字色在深色背景上對比度低於 WCAG AA (4.5:1)，影響閱讀。

### 問題 3: Dark Mode 陰影全部移除
`design-tokens.css` 將 dark mode 的 `--shadow-sm/md/lg` 全部設為 `none`，整個暗色模式扁平無層次。

### 技術決策
- **統一使用 Tailwind `dark:` 類別**作為 dark mode 標準方案
- `@nuxtjs/color-mode` 使用 `class` 策略（`darkMode: 'class'` in tailwind.config.ts）
- DESIGN.md 已過時，以現有實際風格為準

---

## Phase 1: Light Mode 漏色修正（最高優先）

### 1.1 移除 `@media (prefers-color-scheme: dark)` 繞過

這些媒體查詢直接讀系統偏好，無視使用者的手動主題切換。全站共 2 處。

#### 檔案 1: `components/FloatingActionButton.vue`（第 383-397 行）

**現有程式碼：**
```css
@media (prefers-color-scheme: dark) {
  .fab--item {
    background-color: #374151;
    color: #f9fafb;
  }

  .fab__label {
    background-color: #f9fafb;
    color: #1f2937;
  }

  .fab__label::after {
    border-left-color: #f9fafb;
  }
}
```

**修正：** 刪除整個 `@media` 區塊，改為 `.dark` 選擇器：
```css
.dark .fab--item {
  background-color: #374151;
  color: #f9fafb;
}

.dark .fab__label {
  background-color: #f9fafb;
  color: #1f2937;
}

.dark .fab__label::after {
  border-left-color: #f9fafb;
}
```

#### 檔案 2: `pages/stocks/index.vue`（第 1121-1128 行）

**現有程式碼：**
```css
@media (prefers-color-scheme: dark) {
  .stocks-page {
    background:
      radial-gradient(at 0% 0%, rgba(30, 58, 138, 0.2) 0px, transparent 50%),
      radial-gradient(at 100% 0%, rgba(76, 29, 149, 0.2) 0px, transparent 50%),
      #020617;
  }
}
```

**修正：** 改為 `.dark` 選擇器：
```css
.dark .stocks-page {
  background:
    radial-gradient(at 0% 0%, rgba(30, 58, 138, 0.2) 0px, transparent 50%),
    radial-gradient(at 100% 0%, rgba(76, 29, 149, 0.2) 0px, transparent 50%),
    #020617;
}
```

### 1.2 修正 FAB 硬編碼深色值

#### `components/FloatingActionButton.vue`（第 279-293 行）

**現有程式碼：**
```css
.fab__label {
  position: absolute;
  right: 56px;
  background-color: #1f2937;   /* 永遠深色！ */
  color: white;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  opacity: 0;
  transform: translateX(10px);
  transition: all 0.2s ease;
  pointer-events: none;
}
```

**修正：** 使用 CSS 變數自動適配 light/dark：
```css
.fab__label {
  position: absolute;
  right: 56px;
  background-color: var(--color-surface-strong);
  color: var(--color-text);
  /* ... 其餘屬性不變 ... */
}
```

`.fab__label::after` 中的 `border-left: 4px solid #1f2937` 也需要同步修正：
```css
border-left: 4px solid var(--color-surface-strong);
```

### 1.3 修正 CSS 變數深色 fallback

#### `layouts/mobile.vue`（第 124 行）

**現有程式碼：**
```css
background-color: var(--color-background, #020617);
```

**修正：**
```css
background-color: var(--color-background, #f6f1e8);
```

`#020617` 是近乎黑色，作為 fallback 在 CSS 變數未載入時會導致整頁深色閃爍。改為 light mode 的正確值 `#f6f1e8`（暖米色）。

### 1.4 全站掃描確認

搜尋確認沒有其他 `prefers-color-scheme` 遺漏，以及沒有其他 `var(--color-*, #0` 深色 fallback。

---

## Phase 2: 暗色陰影 + Token 對比度修正

### 2.1 恢復 Dark Mode 陰影

#### `assets/css/design-tokens.css`（第 85-87 行）

**現有程式碼：**
```css
--shadow-sm: none;
--shadow-md: none;
--shadow-lg: none;
```

**修正為：**
```css
--shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.20);
--shadow-md: 0 4px 16px rgba(0, 0, 0, 0.25);
--shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.32);
```

這會立即恢復所有使用 `var(--shadow-*)` 的元件（`fin-panel`、`LandingCard` 等）的暗色層次感。

### 2.2 修正 Dark Mode Token 對比度

#### `assets/css/design-tokens.css` — Dark mode 區塊（第 62 行起）

CSS variables 被 `ui.css` 和部分元件的 scoped style 使用，需要確保暗色值在暗色背景上有足夠對比。

| Token | 行號 | 原值 | 原對比度 | 修正值 | 修正後對比度 |
|---|---|---|---|---|---|
| `--color-text-soft` | 84 | `#8f877e` | ~3.8:1 FAIL | `#a89e94` | ~5.3:1 PASS |
| `--color-primary` | 71 | `#30506f` | ~3.1:1 FAIL | `#4a7099` | ~5.0:1 PASS |
| `--color-secondary` | 73 | `#b06b4d` | ~4.0:1 FAIL | `#c47d5e` | ~5.2:1 PASS |

背景色為 `--color-background: #0f1316`（第 67 行）。

### 2.3 修正 Light Mode Token

#### `assets/css/design-tokens.css`（第 25 行）

| Token | 原值 | 原對比度 | 修正值 | 修正後對比度 |
|---|---|---|---|---|
| `--color-text-soft` | `#8d8376` | ~3.5:1 FAIL | `#6e645a` | ~5.2:1 PASS |

背景色為 `--color-background: #f6f1e8`（第 4 行）。

### 2.4 統一 Dark Selector

#### `assets/css/design-tokens.css`（第 62-65 行）

**現有程式碼：**
```css
:root.dark,
:root.dark-mode,
.dark,
.dark-mode {
```

`@nuxtjs/color-mode` 使用 `html.dark` / `html.light`（`classSuffix: ''` in nuxt.config.ts 第 122-126 行），不需要 `:root.dark-mode` 和 `.dark-mode`。

**修正為：**
```css
:root.dark,
.dark {
```

同步清理 `ui.css` 中的 `.dark-mode` 選擇器（第 13、28 行的 `.dark-mode .fin-panel` 等）。

---

## Phase 3: Dark Mode 低對比類別批次替換

### 3.1 對比度基準

以 Tailwind dark 常見背景色為基準：

**Dark 背景 `slate-900` (#0f172a)：**
| 類別 | 色值 | 對比度 | WCAG AA |
|---|---|---|---|
| `dark:text-slate-400` | #94a3b8 | ~5.0:1 | PASS |
| `dark:text-slate-500` | #64748b | ~3.2:1 | FAIL |
| `dark:text-slate-600` | #475569 | ~2.2:1 | FAIL |

**Dark 背景 `gray-800` (#1f2937)：**
| 類別 | 色值 | 對比度 | WCAG AA |
|---|---|---|---|
| `dark:text-gray-400` | #9ca3af | ~5.2:1 | PASS |
| `dark:text-gray-500` | #6b7280 | ~3.3:1 | FAIL |
| `dark:text-gray-600` | #4b5563 | ~2.2:1 | FAIL |

### 3.2 需修正的 Pattern 與替換規則

| 原本 | 對比度 | 修正為 | 涉及檔案數 |
|---|---|---|---|
| `dark:text-slate-600` | 2.2:1 | `dark:text-slate-300` | 8 個檔案, 20 處 |
| `dark:text-slate-500` | 3.2:1 | `dark:text-slate-400` | 14 個檔案, 47 處 |
| `dark:text-gray-500` | 3.0:1 | `dark:text-gray-400` | 6 個檔案, 10 處 |
| `dark:text-gray-600` | 2.2:1 | `dark:text-gray-400` | 1 個檔案, 1 處 |
| `dark:border-slate-700` | 可見度低 | `dark:border-slate-600` | 2 個檔案, 2 處 |

### 3.3 替換原則

1. `dark:text-*-600` → `dark:text-*-300`（主文字級別，確保可讀性）
2. `dark:text-*-500` → `dark:text-*-400`（次要文字級別，達到 WCAG AA）
3. `dark:border-slate-700` → `dark:border-slate-600`（邊框可見度）
4. `dark:ring-slate-700` → `dark:ring-slate-500`（focus ring 顯眼度）
5. `dark:placeholder-gray-500` → `dark:placeholder-gray-400`（佔位文字可見度）

### 3.4 注意事項

- 替換時需檢查上下文，某些場景可能需要更亮的色值（如 CTA 文字、重要資料）
- 大文字（>18px bold 或 >24px）WCAG AA 只需 3:1，可視情況保留 `dark:text-*-500`
- 不盲目全域替換，逐檔確認替換後的視覺效果合理

---

## Phase 4: 硬編碼色彩修正

### 4.1 FloatingActionButton — 改用品牌色

#### `components/FloatingActionButton.vue`（第 221-227 行）

**現有程式碼：**
```css
.fab--main {
  width: var(--fab-size, 56px);
  height: var(--fab-size, 56px);
  background-color: #6366f1;   /* indigo — 跟品牌無關 */
  color: white;
  z-index: 10;
}
```

**修正：** 改用品牌色 secondary (Burnt Copper #b85c38)：
```css
.fab--main {
  width: var(--fab-size, 56px);
  height: var(--fab-size, 56px);
  background-color: #b85c38;   /* 品牌色 secondary */
  color: white;
  z-index: 10;
}

.dark .fab--main {
  background-color: #c47d5e;   /* dark mode secondary（對比度 PASS） */
}
```

`.fab--main:hover`（原本 `#4f46e5`）和 `.fab--main.fab--active`（原本 `#ef4444`）也需要同步修正：
```css
.fab--main:hover {
  background-color: #9d4828;   /* secondary-active */
}
.dark .fab--main:hover {
  background-color: #c98565;
}
```

關閉狀態保持 danger 紅不變。

### 4.2 About 頁面

#### `pages/about.vue`

scoped CSS 中大量 `rgb()` 硬編碼。保持目前風格但修正 dark mode 對比度：
- 確保暗色漸層上的文字有足夠對比
- 將硬編碼的 `rgb()` 值盡量替換為 Tailwind class 或 CSS 變數

### 4.3 lib 工具函式

#### `lib/financialFreedom.ts`

`getRiskColorClass()` 和 `getRiskBgClass()` 使用 `dark:text-green-400` 等類別 — 確認 dark: 側文字色通過 WCAG AA。`dark:text-green-400` (#4ade80) 在 dark 背景上對比度約 7.5:1，PASS。

#### `lib/stocks-analytics.ts`

`getHoldingConcentrationClass()` 和 `DEFAULT_COLORS` 圖表色 — dark mode 需要確保可見度。

---

## Phase 5: fin-* 組件確認

### `assets/css/ui.css`

`ui.css` 中的 `fin-*` 類別透過 CSS variables 自動適應 dark mode。Phase 2 修正 token 值後，大部分類別會自動改善。

**現有 dark 覆蓋規則：**
- 第 13-17 行: `.dark .fin-panel, .dark-mode .fin-panel` — 需清理 `.dark-mode` 選擇器
- 第 28-30 行: `.dark .fin-kicker, .dark-mode .fin-kicker` — 同上

**需確認的類別（無顯式 dark 覆蓋，依賴 CSS 變數）：**

| 類別 | 依賴的 token | 確認項目 |
|---|---|---|
| `.fin-panel` | `var(--color-surface)`, `var(--shadow-md)` | dark 背景區分度 + 陰影恢復後效果 |
| `.fin-button-primary` | `var(--color-primary)`, `var(--color-text)` | 按鈕文字在 primary 背景上對比度 |
| `.fin-button-secondary` | `var(--color-secondary)` | 同上 |
| `.fin-input` | `var(--color-surface-strong)` | placeholder 可見度 |
| `.fin-label` | `var(--color-text-soft)` | token 修正後自動改善 |

---

## Phase 6: 驗證

### 6.1 自動化檢查
- `npm run typecheck` — TypeScript 無破壞
- `npm run lint` — ESLint 無新警告
- `npm test` — 測試通過

### 6.2 視覺驗證
- 用瀏覽器在 **light mode** 下逐頁確認無深色組件洩漏
- 用瀏覽器在 **dark mode** 下逐頁確認文字可讀性和陰影層次
- 特別檢查：FAB、stocks 頁面、mobile layout

### 6.3 無障礙驗證
- Lighthouse Accessibility audit — light 和 dark mode 分別跑
- 確認對比度通過 WCAG AA

---

## 關鍵檔案清單

| 檔案 | Phase | 改動內容 |
|---|---|---|
| `components/FloatingActionButton.vue` | 1+4 | `@media dark` → `.dark`、硬編碼深色值 → CSS 變數、indigo → 品牌色 |
| `pages/stocks/index.vue` | 1 | `@media dark` → `.dark` |
| `layouts/mobile.vue` | 1 | fallback `#020617` → `#f6f1e8` |
| `assets/css/design-tokens.css` | 2 | 陰影恢復、token 對比度修正、selector 統一 |
| `assets/css/ui.css` | 2+5 | `.dark-mode` 清理、fin-* 確認 |
| `pages/about.vue` | 4 | rgb() 硬編碼修正 |
| `lib/financialFreedom.ts` | 4 | dark: class 確認 |
| `lib/stocks-analytics.ts` | 4 | dark: class 確認 |
| 14 個含 `dark:text-slate-500` 的 .vue 檔案 | 3 | 批次替換低對比類別 |
| 8 個含 `dark:text-slate-600` 的 .vue 檔案 | 3 | 批次替換低對比類別 |
| 6 個含 `dark:text-gray-500` 的 .vue 檔案 | 3 | 批次替換低對比類別 |

---

## 提交策略

| PR | Phase | 內容 | 改動量 |
|---|---|---|---|
| PR1 | Phase 1 | Light mode 漏色修正 | ~4 個檔案 |
| PR2 | Phase 2 | design-tokens.css 陰影 + token + selector | ~2 個檔案 |
| PR3 | Phase 3 | 全站 dark:text 低對比度批次替換 | ~20 個檔案 |
| PR4 | Phase 4+5 | 硬編碼色彩 + fin-* 確認 | ~5 個檔案 |
| PR5 | Phase 6 | 驗證（不改程式碼） | 0 個檔案 |
