# Trade Basic UI/UX Enhance Plan v2

> Revision reason: v1 的設計方向有參考價值，但落地上下文錯誤。  
> 本版以 **Nuxt 4 + Vue + TypeScript + 現有 design tokens + i18n + mobile/PWA** 為前提重寫。

---

## 0. 重要修正

v1 的核心問題：

1. Code example 全部是 React / Next.js，不能直接用於 Nuxt / Vue 專案。
2. Token 命名體系與現有 `design-tokens.css` 衝突。
3. 忽略三語系 i18n。
4. 忽略 mobile layout、PWA、`BottomNavigation.vue`、`mobile.css`。
5. 把 IA 重構講得太輕，實際上會牽涉 routing、breadcrumb、middleware、internal links。
6. Today Desk 與現有 `diaries/index.vue` 職責重疊。
7. Checklist、Review Queue、Structured Review 等功能需要資料模型支援，不能當純 UI 改動處理。

所以本版計劃改為：

```txt
先決策，不急改。
先降 AI 味，不推翻設計系統。
先改現有頁，不大搬 route。
先用 Vue SFC，不用 React example。
先保留 token contract，不重命名整套 token。
先做 i18n + mobile，再做視覺 polish。
```

---

# 1. Design Direction：不要立即反轉，先做 Design Decision Gate

## 1.1 原本矛盾

現有 `DESIGN.md` 在 2026-05-19 才確立：

```txt
Institutional Fintech
Deep dark
Glass morphism
Electric blue glow
```

v1 plan 又提出：

```txt
Warm paper
Ledger
Notebook
Light-first
```

兩者不是微調，而是完全不同產品氣質。

如果立即推翻，會出現：

```txt
產品美學缺乏定力
設計系統反覆重寫
開發成本不必要上升
```

---

## 1.2 新判斷

「warm paper + ledger」不應該立即成為唯一方向，而應該作為候選方案之一。

先比較三個方向：

| Direction | Description | Risk |
|---|---|---|
| A. Current Institutional Fintech | 保留深色 fintech + dashboard feel | 容易有 AI SaaS / 模板感 |
| B. Full Warm Ledger | 全面改成紙張、筆記本、light-first | 與現有 DESIGN.md 完全相反，重構成本高 |
| C. Calm Institutional Ledger | 保留 institutional base，但減少 glow、glass、slogan；加入 ledger/table/notebook 元素 | 最低風險，較適合先做 |

建議先採用：

```txt
C. Calm Institutional Ledger
```

不是完全變成紙張 notebook，而是：

```txt
深色 / 專業底色保留
減少 electric glow
減少 marketing slogan
增加 ledger rows
增加 real diary sample
增加 table density
增加「每日工作台」感
```

---

## 1.3 Decision Gate

在正式動工前，先做一頁對比：

```txt
/design-review
├─ Variant A: Current Fintech
├─ Variant B: Warm Ledger
└─ Variant C: Calm Institutional Ledger
```

用以下真實場景評估：

| Scenario | Question |
|---|---|
| 每日寫 quick note | 是否能 5 秒內開始記錄？ |
| 查看 ETF sector strength | 是否比 card grid 更易掃描？ |
| 複盤過去交易 | 是否像 review tool，而不是 blog list？ |
| 手機使用 | 是否能單手完成 quick note？ |
| 長期使用 | 兩年後會不會覺得過時？ |

決策標準：

```txt
不是哪個 mockup 最好看，
而是哪個最適合 daily usage。
```

---

# 2. Revised Scope

## 2.1 Phase 1 不做的事

暫時不要做：

```txt
❌ 不搬動 Nuxt pages 路由
❌ 不重命名所有 CSS tokens
❌ 不重寫整套 DESIGN.md
❌ 不新增 DB model
❌ 不新增 Today page 與 diaries/index.vue 打架
❌ 不把所有工具頁一次改版
❌ 不做 structured review full-stack schema
```

---

## 2.2 Phase 1 要做的事

先做低風險、可逆改造：

```txt
✅ 降低 AI SaaS 感
✅ 優化 homepage copy
✅ 用真實 diary example 取代抽象 slogan
✅ 保留現有 token interface，只調整 value / 增加 alias
✅ 用 Vue SFC 建立可重用 ledger component
✅ 改善 diaries/index.vue，而不是另起 Today page
✅ ETF 頁先加 table view toggle，不直接刪 card grid
✅ 所有新 copy 進 i18n
✅ Mobile layout 同步考慮
```

---

# 3. Existing Project Assumptions

本 plan 以以下專案情況為前提：

```txt
Framework: Nuxt 4
Language: Vue + TypeScript
Styling: Tailwind + CSS design tokens
Current token file: assets/css/design-tokens.css
Existing routes:
- diaries/
- stocks/
- tools/
- timeline/
- discipline/
- partners/
- alerts/
- blog/
- calendar/

Mobile:
- layouts/mobile.vue
- components/BottomNavigation.vue
- mobile.css

i18n:
- en
- zh-TW
- zh-CN
```

---

# 4. Token Strategy：保留現有 contract，不推翻

## 4.1 不要這樣做

不要直接把所有 token 改成：

```css
--bg
--surface
--ink
--primary
```

因為現有系統已經有：

```css
--color-primary
--color-surface
--dt-primary
--dt-surface
```

如果重命名，會影響：

```txt
design-tokens.css
tailwind.config.ts
所有使用 dt-* class 的 component
現有 theme bridge
dark/light mode
mobile.css
```

---

## 4.2 正確策略

保留現有 token contract。

只做兩件事：

1. 調整 value
2. 增加 semantic alias，但不強迫全站立即改用

### Example: assets/css/design-tokens.css

```css
:root {
  /*
   * Existing contract — keep this.
   * Do not rename these tokens in Phase 1.
   */
  --color-primary: #2563eb;
  --color-surface: #ffffff;
  --color-background: #f8fafc;
  --color-border: #e2e8f0;
  --color-text: #0f172a;
  --color-text-muted: #64748b;

  --dt-primary: var(--color-primary);
  --dt-surface: var(--color-surface);
  --dt-background: var(--color-background);
  --dt-border: var(--color-border);
  --dt-text: var(--color-text);
  --dt-text-muted: var(--color-text-muted);
}

/*
 * New optional style layer.
 * This lets us test calmer ledger styling without breaking old components.
 */
:root[data-visual-style="calm-ledger"] {
  --color-primary: #243b53;
  --color-surface: #fffcf5;
  --color-background: #f6f1e8;
  --color-border: #d8cdbe;
  --color-text: #1f2933;
  --color-text-muted: #6b6258;

  --dt-primary: var(--color-primary);
  --dt-surface: var(--color-surface);
  --dt-background: var(--color-background);
  --dt-border: var(--color-border);
  --dt-text: var(--color-text);
  --dt-text-muted: var(--color-text-muted);
}

/*
 * Safer hybrid option.
 * Use this first if full warm-paper feels too different.
 */
:root[data-visual-style="calm-institutional"] {
  --color-primary: #3b82f6;
  --color-surface: #111827;
  --color-background: #0b1120;
  --color-border: #1f2937;
  --color-text: #f8fafc;
  --color-text-muted: #94a3b8;

  --dt-primary: var(--color-primary);
  --dt-surface: var(--color-surface);
  --dt-background: var(--color-background);
  --dt-border: var(--color-border);
  --dt-text: var(--color-text);
  --dt-text-muted: var(--color-text-muted);
}
```

---

## 4.3 Tailwind Strategy

如果目前 Tailwind 已有 `dt-*` mapping，就不要改名。

### Example: tailwind.config.ts

```ts
import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  theme: {
    extend: {
      colors: {
        dt: {
          primary: 'var(--dt-primary)',
          surface: 'var(--dt-surface)',
          background: 'var(--dt-background)',
          border: 'var(--dt-border)',
          text: 'var(--dt-text)',
          muted: 'var(--dt-text-muted)',
        },
      },
    },
  },
}
```

### Rule

```txt
New components should use dt-* tokens.
Old components do not need immediate rewrite.
```

---

# 5. Vue/Nuxt Component Examples

## 5.1 Ledger Card

### File

```txt
components/LedgerCard.vue
```

### Code

```vue
<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
}>()
</script>

<template>
  <section
    class="rounded-xl border border-dt-border bg-dt-surface p-5 shadow-sm"
  >
    <header
      v-if="title || description"
      class="mb-4 border-b border-dt-border pb-3"
    >
      <h2
        v-if="title"
        class="text-xl font-semibold text-dt-text"
      >
        {{ title }}
      </h2>

      <p
        v-if="description"
        class="mt-1 text-sm text-dt-muted"
      >
        {{ description }}
      </p>
    </header>

    <slot />
  </section>
</template>
```

---

## 5.2 Status Badge

### File

```txt
components/StatusBadge.vue
```

### Code

```vue
<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    tone?: 'neutral' | 'success' | 'danger' | 'warning' | 'accent'
  }>(),
  {
    tone: 'neutral',
  }
)

const toneClass = computed(() => {
  return {
    neutral: 'border-dt-border bg-dt-background text-dt-muted',
    success: 'border-green-500/30 bg-green-500/10 text-green-600',
    danger: 'border-red-500/30 bg-red-500/10 text-red-600',
    warning: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-700',
    accent: 'border-amber-500/30 bg-amber-500/10 text-amber-700',
  }[props.tone]
})
</script>

<template>
  <span
    class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
    :class="toneClass"
  >
    <slot />
  </span>
</template>
```

---

## 5.3 Base Button

### File

```txt
components/BaseButton.vue
```

### Code

```vue
<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    type?: 'button' | 'submit' | 'reset'
  }>(),
  {
    variant: 'primary',
    type: 'button',
  }
)

const variantClass = computed(() => {
  return {
    primary:
      'border-dt-primary bg-dt-primary text-white hover:opacity-90',
    secondary:
      'border-dt-border bg-transparent text-dt-text hover:bg-dt-background',
    ghost:
      'border-transparent bg-transparent text-dt-muted hover:text-dt-text',
    danger:
      'border-red-600 bg-red-600 text-white hover:opacity-90',
  }[props.variant]
})
</script>

<template>
  <button
    :type="type"
    class="inline-flex min-h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
    :class="variantClass"
  >
    <slot />
  </button>
</template>
```

---

## 5.4 Diary Note Preview

### File

```txt
components/DiaryNotePreview.vue
```

### Code

```vue
<script setup lang="ts">
defineProps<{
  date: string
  tag: string
  title: string
  thesis?: string
  risk?: string
  reviewIn?: string
}>()
</script>

<template>
  <article
    class="rounded-xl border border-dt-border bg-dt-surface p-5 shadow-sm"
  >
    <div class="mb-4 flex items-center justify-between gap-3">
      <time class="font-mono text-xs text-dt-muted">
        {{ date }}
      </time>

      <StatusBadge>
        {{ tag }}
      </StatusBadge>
    </div>

    <h3 class="text-lg font-semibold text-dt-text">
      {{ title }}
    </h3>

    <div class="mt-4 space-y-4 text-sm">
      <section v-if="thesis">
        <p class="font-semibold text-dt-text">
          {{ $t('diary.fields.thesis') }}
        </p>
        <p class="mt-1 text-dt-muted">
          {{ thesis }}
        </p>
      </section>

      <section v-if="risk">
        <p class="font-semibold text-dt-text">
          {{ $t('diary.fields.risk') }}
        </p>
        <p class="mt-1 text-dt-muted">
          {{ risk }}
        </p>
      </section>
    </div>

    <div
      v-if="reviewIn"
      class="mt-5 border-t border-dt-border pt-3"
    >
      <p class="font-mono text-xs text-dt-muted">
        {{ $t('diary.reviewIn', { duration: reviewIn }) }}
      </p>
    </div>
  </article>
</template>
```

---

# 6. i18n Strategy

## 6.1 Rule

所有新 copy 必須先進 i18n，不要 hardcode 在 Vue template。

包括：

```txt
Hero copy
CTA
Checklist
Review prompt
Empty state
Table labels
Tool filters
```

---

## 6.2 Suggested Keys

### en.json

```json
{
  "home": {
    "hero": {
      "eyebrow": "Trading Journal",
      "title": "Write the trade before the market rewrites your memory.",
      "description": "A calm trading journal for active investors. Record your thesis, risk, execution and review — so every decision leaves a trace.",
      "primaryCta": "Write today's note",
      "secondaryCta": "View sample diary"
    }
  },
  "diary": {
    "fields": {
      "thesis": "Thesis",
      "risk": "Risk",
      "execution": "Execution",
      "review": "Review"
    },
    "reviewIn": "Review in {duration}",
    "empty": {
      "title": "No notes today",
      "description": "Write one market read before the close."
    }
  },
  "today": {
    "title": "Today",
    "quickNotePrompt": "What changed in your view today?",
    "checklist": {
      "marketRegime": "Market regime updated",
      "watchlist": "Watchlist reviewed",
      "riskNotes": "Risk notes written",
      "thesisChanged": "Any thesis changed?",
      "reviewYesterday": "Yesterday's note reviewed"
    }
  }
}
```

### zh-TW.json

```json
{
  "home": {
    "hero": {
      "eyebrow": "交易日記",
      "title": "在市場改寫你的記憶前，先寫下你的交易判斷。",
      "description": "一個給主動投資者使用的冷靜交易日記。記錄 thesis、風險、執行與複盤，讓每次決策都有跡可尋。",
      "primaryCta": "寫下今日筆記",
      "secondaryCta": "查看日記範例"
    }
  },
  "diary": {
    "fields": {
      "thesis": "交易假設",
      "risk": "風險",
      "execution": "執行",
      "review": "複盤"
    },
    "reviewIn": "{duration} 後複盤",
    "empty": {
      "title": "今日尚未有筆記",
      "description": "收市前寫下一條市場觀察。"
    }
  },
  "today": {
    "title": "今日",
    "quickNotePrompt": "今日你的觀點有什麼改變？",
    "checklist": {
      "marketRegime": "已更新市場狀態",
      "watchlist": "已檢查觀察清單",
      "riskNotes": "已寫下風險筆記",
      "thesisChanged": "交易假設是否有改變？",
      "reviewYesterday": "已回顧昨日筆記"
    }
  }
}
```

### zh-CN.json

```json
{
  "home": {
    "hero": {
      "eyebrow": "交易日记",
      "title": "在市场改写你的记忆前，先写下你的交易判断。",
      "description": "一个给主动投资者使用的冷静交易日记。记录 thesis、风险、执行与复盘，让每次决策都有迹可循。",
      "primaryCta": "写下今日笔记",
      "secondaryCta": "查看日记范例"
    }
  },
  "diary": {
    "fields": {
      "thesis": "交易假设",
      "risk": "风险",
      "execution": "执行",
      "review": "复盘"
    },
    "reviewIn": "{duration} 后复盘",
    "empty": {
      "title": "今日尚未有笔记",
      "description": "收盘前写下一条市场观察。"
    }
  },
  "today": {
    "title": "今日",
    "quickNotePrompt": "今天你的观点有什么改变？",
    "checklist": {
      "marketRegime": "已更新市场状态",
      "watchlist": "已检查观察清单",
      "riskNotes": "已写下风险笔记",
      "thesisChanged": "交易假设是否有改变？",
      "reviewYesterday": "已回顾昨日笔记"
    }
  }
}
```

---

# 7. Homepage Plan

## 7.1 Objective

首頁不是重新包裝成另一個漂亮 landing page，而是修正 AI SaaS 味。

### Replace

```txt
抽象哲學 slogan
AI companion 感
過多 promise
```

### With

```txt
真實 diary preview
具體 workflow
低調但清楚的 product explanation
```

---

## 7.2 New Homepage Structure

```txt
Hero
├─ Left: Product statement + CTA
└─ Right: Sample diary note

Workflow
├─ Record
├─ Review
└─ Refine

Modules
├─ Journal
├─ ETF Board
├─ Position Builder
└─ Timeline

Privacy / Ownership

Final CTA
```

---

## 7.3 Nuxt Example

### File

```txt
pages/index.vue
```

### Code

```vue
<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <main class="bg-dt-background text-dt-text">
    <section class="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1fr_420px]">
      <div>
        <p class="mb-4 font-mono text-xs uppercase tracking-wide text-dt-muted">
          {{ t('home.hero.eyebrow') }}
        </p>

        <h1 class="max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">
          {{ t('home.hero.title') }}
        </h1>

        <p class="mt-6 max-w-xl text-lg text-dt-muted">
          {{ t('home.hero.description') }}
        </p>

        <div class="mt-8 flex flex-wrap gap-3">
          <BaseButton>
            {{ t('home.hero.primaryCta') }}
          </BaseButton>

          <BaseButton variant="secondary">
            {{ t('home.hero.secondaryCta') }}
          </BaseButton>
        </div>
      </div>

      <DiaryNotePreview
        date="Jun 6, 2026"
        tag="Market Read"
        title="SOXX testing support"
        thesis="Semi leadership is weakening, but the trend is not broken."
        risk="If it closes below the 50D, reduce beta."
        review-in="7 days"
      />
    </section>
  </main>
</template>
```

---

# 8. Diaries / Today Desk Strategy

## 8.1 不新增 `/today`

目前 `diaries/index.vue` 已經有：

```txt
Ledger Snapshot
Next Move
Quick diary
```

所以不要另開一個 `/today` 跟它打架。

### Revised Decision

```txt
把 diaries/index.vue 漸進式改造成 Today Desk。
```

Navigation 可以顯示為：

```txt
Journal → Today
```

但 route 仍然保持：

```txt
/diaries
```

這樣可以避免：

```txt
route migration
middleware update
breadcrumb rewrite
internal link broken
```

---

## 8.2 Diaries Index Target Layout

```txt
/diaries

Header:
Today / Journal Desk

Top:
Quick Note

Middle:
Ledger Snapshot       Recent Notes
Next Move             Review Candidates

Bottom:
Timeline Preview
```

保留現有功能，不強行刪除。

---

## 8.3 Checklist 問題

v1 提出的 checklist：

```txt
□ Market regime updated
□ Watchlist reviewed
□ Risk notes written
```

不應該在 Phase 1 做成持久化功能。

### Phase 1

做成非核心 UI，不持久化，或者直接不做。

```txt
Option A: 不做 checklist
Option B: local UI only，明確標示為 session helper
Option C: 放入 future feature
```

建議：

```txt
Phase 1 不做 checklist。
把版位留給現有 Next Move / Ledger Snapshot。
```

### Phase 2+

如果要做 checklist，才新增：

```txt
DB model
API
User custom checklist
Daily completion state
```

---

# 9. Review Queue Strategy

## 9.1 現實問題

Review Queue 需要知道：

```txt
哪篇 diary 需要 review？
review date 是何時？
thesis / risk / execution 是否結構化？
```

如果現有 Diary model 沒有這些欄位，就不能假裝 UI 已經可以支援。

---

## 9.2 Phase 1 替代方案

不叫 Review Queue，改叫：

```txt
Review Candidates
```

用現有資料推導：

```txt
最近 7 / 14 / 30 日的 notes
有 tag = thesis / trade / market read
有 linked stock
有 significant market move
```

如果現有資料不足，就只顯示：

```txt
Recent notes for review
```

---

## 9.3 Future Structured Review

Phase 2+ 才考慮新增：

```txt
diary.thesis
diary.risk
diary.position_size
diary.invalidated_at
diary.review_due_at
diary.review_status
```

### Possible Schema

```ts
type DiaryReviewState = {
  diaryId: string
  reviewDueAt: string | null
  status: 'none' | 'pending' | 'reviewed'
  thesisQuality?: 'valid' | 'invalid' | 'unclear'
  executionQuality?: 'good' | 'bad' | 'mixed'
  sizingQuality?: 'good' | 'too_large' | 'too_small'
}
```

---

# 10. ETF Board Strategy

## 10.1 不直接刪 Card Grid

如果 `tools/etf.vue` 現在是 card grid，不要一次改成唯一 table view。

### Phase 1

新增 view toggle：

```txt
Cards | Table
```

預設可以先保留 Cards。

Table view 是 beta。

---

## 10.2 Data Dependency Check

ETF table 需要以下欄位：

```txt
ticker
name / sector
last price
1D change
1W change
YTD change
RSI
above 10D / 20D / 50D
% from high
```

先檢查 API 是否已有。

### Data Readiness Matrix

| Field | Required | If Missing |
|---|---:|---|
| Ticker | Yes | Cannot render |
| Last Price | Yes | Cannot render |
| 1D Change | Yes | Hide column if missing |
| 1W Change | Optional | Hide column |
| YTD | Optional | Hide column |
| RSI | Optional | Hide column |
| MA Status | Optional | Hide column |
| % High | Optional | Hide column |

### Rule

```txt
Table should degrade gracefully.
Do not block redesign because one metric is missing.
```

---

## 10.3 Mobile ETF Strategy

11-column table cannot be primary mobile UI.

### Desktop

```txt
Full table
```

### Tablet

```txt
Horizontal scroll table
```

### Mobile

Use compact rows:

```txt
XLK
Technology
Last 222.45
1D +0.65%
RSI 61.3
MA: 10D ✓ 20D ✓ 50D ×
```

### Vue Example

```vue
<template>
  <section>
    <!-- Desktop table -->
    <div class="hidden overflow-x-auto md:block">
      <table class="min-w-[960px] w-full border-collapse text-sm">
        <!-- table content -->
      </table>
    </div>

    <!-- Mobile cards -->
    <div class="space-y-3 md:hidden">
      <article
        v-for="row in rows"
        :key="row.ticker"
        class="rounded-xl border border-dt-border bg-dt-surface p-4"
      >
        <div class="flex items-start justify-between">
          <div>
            <p class="font-mono font-semibold text-dt-text">
              {{ row.ticker }}
            </p>
            <p class="text-xs text-dt-muted">
              {{ row.sector }}
            </p>
          </div>

          <p class="font-mono text-sm text-dt-text">
            {{ row.last }}
          </p>
        </div>

        <div class="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div>
            <p class="text-dt-muted">1D</p>
            <p class="font-mono">{{ row.oneDay }}</p>
          </div>
          <div>
            <p class="text-dt-muted">RSI</p>
            <p class="font-mono">{{ row.rsi ?? '-' }}</p>
          </div>
          <div>
            <p class="text-dt-muted">MA</p>
            <p class="font-mono">
              {{ row.above20d ? '20D ✓' : '20D ×' }}
            </p>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
```

---

# 11. Mobile / PWA Requirements

## 11.1 Mobile-first Rule

所有新頁或重構頁都要同時檢查：

```txt
layouts/mobile.vue
BottomNavigation.vue
mobile.css
touch target
safe area
offline / PWA state
```

---

## 11.2 Mobile Layout Rules

```txt
Primary action near top
One-column layout
Cards before large tables
Horizontal table only for secondary views
Bottom navigation should not duplicate desktop sidebar
Avoid hover-only interactions
Min touch target: 40px
```

---

## 11.3 Quick Note Mobile UX

Mobile 首要任務：

```txt
快速寫 note
```

不是掃描 11 欄表。

### Recommended Mobile Order for `/diaries`

```txt
1. Quick Note
2. Recent Notes
3. Ledger Snapshot
4. Next Move
5. Timeline Preview
```

---

# 12. IA Strategy

## 12.1 不在 Phase 1 搬 route

v1 的 IA：

```txt
Journal / Tools / Learn / Account
```

方向合理，但工程代價大。

### Phase 1

只改 navigation label 和 grouping，不改 route。

例如：

```txt
Journal
- Today        -> /diaries
- Timeline     -> /timeline
- Calendar     -> /calendar

Tools
- ETF Board    -> /tools/etf
- Position     -> /tools/position-sizing

Learn
- Discipline   -> /discipline
- Blog         -> /blog
```

---

## 12.2 Phase 2 才考慮 route migration

如果之後真的要統一路由：

```txt
/journal/today
/journal/timeline
/tools/etf
/learn/blog
```

需要完整 migration checklist：

```txt
[ ] route redirects
[ ] middleware update
[ ] breadcrumb update
[ ] internal link update
[ ] sitemap update
[ ] tests
[ ] analytics route mapping
```

---

# 13. Revised Phases

## Phase 0 — Design Decision Gate

### Goal

決定是否：

```txt
A. 保留 Institutional Fintech
B. 改成 Full Warm Ledger
C. 採用 Calm Institutional Ledger
```

### Deliverables

```txt
/design-review page or static screenshots
3 variants
same content, different visual treatment
daily usage scoring
final decision note
```

### No heavy refactor.

---

## Phase 1 — Low-risk UI Tone Adjustment

### Goal

降低 AI SaaS 味，但不推翻系統。

### Tasks

```txt
[ ] 減少 homepage abstract slogans
[ ] Hero 加 sample diary preview
[ ] 減少 glow / gradient / glass intensity
[ ] 新增 LedgerCard.vue
[ ] 新增 StatusBadge.vue
[ ] 新增 BaseButton.vue 或 refactor existing button
[ ] 保留 dt token interface
[ ] 所有新 copy 加 i18n
[ ] 檢查 mobile view
```

---

## Phase 2 — Diaries Index as Today Desk

### Goal

把現有 `diaries/index.vue` 變成更清晰的 daily journal desk。

### Tasks

```txt
[ ] Quick Note 放到最優先
[ ] 保留 Ledger Snapshot
[ ] 保留 Next Move
[ ] Recent Notes 改成更像 ledger list
[ ] Review Candidates 使用現有資料
[ ] 不新增 checklist DB
[ ] Mobile order 調整
```

---

## Phase 3 — ETF Board Table Beta

### Goal

在 `tools/etf.vue` 加入 table view，但不刪 card grid。

### Tasks

```txt
[ ] 檢查 ETF API 欄位
[ ] 建立 data readiness matrix
[ ] 新增 Cards / Table toggle
[ ] Desktop table
[ ] Mobile compact row cards
[ ] Missing fields gracefully hidden
```

---

## Phase 4 — Position Sizing Worksheet

### Goal

把 Position Sizing 由 calculator feel 改成 planning worksheet。

### Tasks

```txt
[ ] 保留現有計算邏輯
[ ] 左側 inputs
[ ] 右側 allocation plan
[ ] 底部 summary / risk notes
[ ] Risk notes Phase 1 可以不持久化
[ ] 如果要持久化，另開 backend task
```

---

## Phase 5 — Structured Review v2

### Goal

等 data model 決定後，才做真正 Review Queue。

### Tasks

```txt
[ ] 決定 Diary 是否要 thesis/risk/execution structured fields
[ ] DB migration
[ ] API update
[ ] Review due date
[ ] Review status
[ ] Review prompt UI
```

---

# 14. Updated Acceptance Criteria

## Design

```txt
[ ] 不再像 generic AI SaaS landing page
[ ] 但也沒有突然完全變成另一個產品
[ ] 現有 DESIGN.md 的 institutional trust 感仍然存在
[ ] Ledger/table/note 元素變得更明顯
```

## Engineering

```txt
[ ] 沒有 React / Next.js code
[ ] Vue SFC examples 可直接參考
[ ] 不破壞 dt token contract
[ ] 所有新 copy 進 i18n
[ ] Mobile layout 有對應方案
[ ] Phase 1 不需要 DB migration
```

## Product

```txt
[ ] /diaries 職責清晰：daily journal desk
[ ] ETF table 不依賴所有指標齊全才可上線
[ ] Review Queue 不在沒有資料模型時硬做
[ ] IA 先改 navigation grouping，不搬 route
```

---

# 15. Recommended Immediate Next Steps

## Step 1

建立一個 `design-review` branch。

```bash
git checkout -b design-review-calm-ledger
```

---

## Step 2

只改首頁 hero 區域，不動 app 內頁。

```txt
pages/index.vue
components/DiaryNotePreview.vue
components/BaseButton.vue
components/StatusBadge.vue
```

---

## Step 3

新增 i18n keys。

```txt
i18n/locales/en.json
i18n/locales/zh-TW.json
i18n/locales/zh-CN.json
```

---

## Step 4

用現有 token 加一個可切換 style。

```html
<html data-visual-style="calm-institutional">
```

或在 Nuxt app config / layout 內控制。

---

## Step 5

截圖比較：

```txt
Current
Calm Institutional Ledger
Warm Ledger
```

再決定是否大改。

---

# 16. Final Recommendation

不要立即採用 v1 的「Full Warm Paper Ledger」。

更合理的方向是：

```txt
Calm Institutional Ledger
```

也就是：

```txt
保留金融產品的可信與專業，
去掉 AI SaaS 的浮誇與過度發光，
加入 trading journal 應有的 ledger、note、review、table 感。
```

這樣既能修正現有 UI/UX 問題，又不會推翻剛建立的設計系統。

---

# 17. One-line Product Direction

```txt
Trade Basic is not an AI coach.
It is a calm decision ledger for active investors.
```

中文：

```txt
Trade Basic 不是 AI 教練，
而是給主動投資者使用的冷靜決策帳本。
```
