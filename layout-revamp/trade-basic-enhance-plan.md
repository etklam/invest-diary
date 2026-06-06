# Trade Basic UI/UX Enhance Plan

> Goal: 將 Trade Basic 由「AI SaaS landing page 感」調整成「冷靜、可信、可長期使用的投資日記工作台」。

---

## 0. Design North Star

Trade Basic 應該似：

- 一本被每日翻閱的投資筆記本
- 一張有紀律的交易 ledger
- 一個用來記錄、複盤、修正判斷的 investor desk

而不是：

- AI companion landing page
- Cyber fintech dashboard
- 過度 slogan 化的 marketing site
- 用 glowing card 堆出來的 SaaS template

### Core Statement

```txt
Write the trade before the market rewrites your memory.
```

中文產品語氣：

```txt
寫低判斷，回看偏誤，慢慢建立自己的交易紀律。
```

---

## 1. Current UX Problems

### 1.1 Homepage 過度抽象

目前首頁太多哲學式文案，例如：

```txt
Markets don't reward effort.
Your past self becomes your best coach.
System 1 / System 2.
```

這些句子本身不是錯，但太密集會令產品有 AI 生成 landing page 味道。

### 1.2 功能展示平均化

Trading Journal、Tools、Partner Compare、Education、Discipline 等功能被平鋪展示，令使用者不易理解：

```txt
我每日登入後第一件事應該做什麼？
```

### 1.3 Dashboard 感重，Notebook 感不足

投資日記的核心是「記錄 → 複盤 → 修正」，而不是「漂亮 dashboard」。

### 1.4 Tools 與 Journal 缺少 workflow 關係

ETF board、position sizing、seasonality 等工具應該服務於 diary decision，而不是孤立工具頁。

---

## 2. Target UX Model

建議整個產品圍繞一條簡單 loop：

```txt
Market Read → Thesis → Position Plan → Execution → Review
```

對應頁面：

```txt
Today Desk
├─ Quick Note
├─ Market Snapshot
├─ Watchlist / ETF Board
├─ Position Builder
├─ Review Queue
└─ Timeline
```

---

## 3. IA / Navigation 重構

### Current Pattern

```txt
Home
How to Use
About Us
Trading Journal
Tools
```

### Proposed Pattern

```txt
Trade Basic
├─ Journal
│  ├─ Today
│  ├─ Quick Note
│  ├─ Diaries
│  ├─ Timeline
│  └─ Calendar
│
├─ Tools
│  ├─ ETF Board
│  ├─ Position Sizing
│  ├─ Seasonality
│  ├─ Relative Value
│  └─ FIRE Calculator
│
├─ Learn
│  ├─ Trading Discipline
│  ├─ Blog
│  └─ Resources
│
└─ Account
   ├─ Settings
   └─ Privacy
```

### Rule

```txt
Homepage = explain the product
Logged-in home = Today Desk
Tools = decision support
Diary = source of truth
Timeline = review and pattern recognition
```

---

## 4. Priority Roadmap

## Phase 1 — Visual Reset

### Goal

移除過度 AI / SaaS / glow 感，建立 notebook + ledger 風格。

### Tasks

- [ ] Replace electric blue / cyan glow palette
- [ ] Add warm paper background
- [ ] Reduce gradient and glass effects
- [ ] Standardize cards into ledger cards
- [ ] Use mono font only for ticker / price / percentage / dates
- [ ] Create consistent tag / status badge styles

### Key Files

```txt
app/globals.css
tailwind.config.ts
components/ui/button.tsx
components/ui/card.tsx
components/ui/badge.tsx
components/ui/table.tsx
```

---

## Phase 2 — Homepage 重構

### Goal

首頁由 abstract promise 改成 concrete product preview。

### Proposed Sections

```txt
1. Hero with sample diary card
2. Simple workflow: Record → Review → Refine
3. Product modules: Journal / Tools / Timeline
4. Sample diary entry
5. Privacy / ownership
6. Final CTA
```

### Hero Copy

```txt
Write the trade before the market rewrites your memory.

A calm trading journal for active investors.
Record your thesis, risk, execution and review —
so every decision leaves a trace.
```

### CTA

```txt
Primary: Write today's note
Secondary: View sample diary
```

---

## Phase 3 — Today Desk

### Goal

登入後第一屏直接回答：

```txt
今日我要做什麼？
```

### Layout

```txt
Today
Saturday, Jun 6

[Quick Note Input]

[Today's Checklist]        [Recent Notes]
[Review Queue]             [Market Snapshot]
```

### Checklist Items

```txt
□ Market regime updated
□ Watchlist reviewed
□ Risk notes written
□ Any thesis changed?
□ Yesterday's note reviewed
```

### UX Rule

Today Desk 不應該像 dashboard，而應該像每日工作簿。

---

## Phase 4 — ETF Board Redesign

### Goal

ETF 頁由 card grid 改成 market sheet。

### Structure

```txt
ETF Sector Board
Last updated: Jun 6, 2026 09:31

Tabs:
US Sectors | Index ETFs | Custom

Filters:
Above all MAs | Below 20D | RSI > 70 | RSI < 40 | Near High

Summary:
Above 10D EMA: 8 / 11
Above 20D EMA: 7 / 11
Above 50D SMA: 6 / 11
Avg RSI: 58.2

Table:
Ticker | Sector | Last | 1D | 1W | YTD | RSI | 10D | 20D | 50D | % High
```

### UX Rule

```txt
ETF Board should scan like a market sheet, not a marketing card layout.
```

---

## Phase 5 — Position Builder Redesign

### Goal

Position sizing 由 calculator 改成 planning worksheet。

### Structure

```txt
Position Builder

Left:
- Ticker
- Price
- Total Capital
- Reserve Cash
- Strategy
- Rounding

Right:
Allocation Plan Table

Bottom:
- Summary
- Risk Notes
```

### UX Rule

```txt
Position Builder should make the user think before entry, not encourage order execution.
```

---

## Phase 6 — Timeline / Review Queue

### Goal

讓使用者從過去的判斷中找到模式。

### Timeline Row

```txt
Jun 5 | Market Read | SOXX support test
Jun 4 | Earnings    | MSFT after-hours reaction
Jun 3 | Thesis      | MU / SNDK demand story
```

### Review Prompts

```txt
Was the thesis wrong?
Was the timing wrong?
Was the sizing wrong?
Was it just variance?
What would you do differently?
```

---

## 5. Component Design Rules

### Buttons

```txt
No gradient.
No glow.
Clear hierarchy.
```

### Cards

```txt
Use border, spacing, paper-like background.
Avoid over-rounded floating glass cards.
```

### Tables

```txt
Tables are first-class UI in this product.
Use tabular numbers.
Use subtle row separators.
Keep status color minimal.
```

### Tags

```txt
Tags should classify notes, not decorate the interface.
```

---

## 6. Content / Copywriting Guidelines

### Avoid

```txt
Unlock your trading potential
AI-powered insights
Your ultimate companion
Markets don't reward effort
Become a better investor today
```

### Prefer

```txt
Write today's note
Review past decisions
Record thesis before entry
What changed your mind?
Keep your process visible
```

### Product Voice

```txt
Calm
Specific
Professional
Not overconfident
Not motivational
Not gamified
```

---

## 7. Code Examples

## 7.1 CSS Tokens

```css
:root {
  --bg: #f6f1e8;
  --surface: #fffcf5;
  --surface-muted: #efe7da;
  --ink: #1f2933;
  --ink-muted: #6b6258;
  --line: #d8cdbe;
  --line-strong: #b7a999;

  --primary: #243b53;
  --primary-soft: #d8e2ec;

  --accent: #a16207;
  --success: #2f6f4e;
  --danger: #9f3434;
  --warning: #b7791f;
}

.dark {
  --bg: #11100e;
  --surface: #1a1815;
  --surface-muted: #24211d;
  --ink: #f4efe7;
  --ink-muted: #b8aea1;
  --line: #3a332c;
  --line-strong: #5a5046;

  --primary: #9fb3c8;
  --accent: #c9a66b;
  --success: #8fb996;
  --danger: #c97b7b;
}
```

---

## 7.2 Tailwind Token Mapping

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-muted": "var(--surface-muted)",
        ink: "var(--ink)",
        "ink-muted": "var(--ink-muted)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        primary: "var(--primary)",
        "primary-soft": "var(--primary-soft)",
        accent: "var(--accent)",
        success: "var(--success)",
        danger: "var(--danger)",
        warning: "var(--warning)",
      },
      fontFamily: {
        serif: ["Fraunces", "Georgia", "serif"],
        sans: ["Source Sans 3", "Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        ledger: "14px",
      },
      boxShadow: {
        paper: "0 1px 2px rgba(31, 41, 51, 0.06)",
      },
    },
  },
};

export default config;
```

---

## 7.3 Ledger Card Component

```tsx
// components/ui/ledger-card.tsx
import { cn } from "@/lib/utils";

type LedgerCardProps = {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function LedgerCard({
  title,
  description,
  children,
  className,
}: LedgerCardProps) {
  return (
    <section
      className={cn(
        "rounded-ledger border border-line bg-surface shadow-paper",
        "p-5",
        className
      )}
    >
      {(title || description) && (
        <header className="mb-4 border-b border-line pb-3">
          {title && (
            <h2 className="font-serif text-xl text-ink">
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-1 text-sm text-ink-muted">
              {description}
            </p>
          )}
        </header>
      )}

      {children}
    </section>
  );
}
```

---

## 7.4 Calm Button Component

```tsx
// components/ui/calm-button.tsx
import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CalmButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function CalmButton({
  variant = "primary",
  className,
  ...props
}: CalmButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md px-4 py-2",
        "text-sm font-semibold transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-primary/30",
        variant === "primary" &&
          "border border-primary bg-primary text-surface hover:opacity-90",
        variant === "secondary" &&
          "border border-line bg-transparent text-ink hover:bg-surface-muted",
        variant === "ghost" &&
          "border border-transparent bg-transparent text-ink-muted hover:text-ink",
        className
      )}
      {...props}
    />
  );
}
```

---

## 7.5 Diary Note Card

```tsx
// components/journal/diary-note-card.tsx
type DiaryNoteCardProps = {
  date: string;
  tag: string;
  title: string;
  thesis: string;
  risk: string;
  reviewIn?: string;
};

export function DiaryNoteCard({
  date,
  tag,
  title,
  thesis,
  risk,
  reviewIn,
}: DiaryNoteCardProps) {
  return (
    <article className="rounded-ledger border border-line bg-surface p-5 shadow-paper">
      <div className="mb-4 flex items-center justify-between">
        <time className="font-mono text-xs text-ink-muted">
          {date}
        </time>
        <span className="rounded-full border border-line bg-surface-muted px-2 py-1 text-xs text-ink-muted">
          {tag}
        </span>
      </div>

      <h3 className="font-serif text-xl text-ink">
        {title}
      </h3>

      <div className="mt-4 space-y-4 text-sm">
        <section>
          <p className="font-semibold text-ink">Thesis</p>
          <p className="mt-1 text-ink-muted">{thesis}</p>
        </section>

        <section>
          <p className="font-semibold text-ink">Risk</p>
          <p className="mt-1 text-ink-muted">{risk}</p>
        </section>
      </div>

      {reviewIn && (
        <div className="mt-5 border-t border-line pt-3">
          <p className="font-mono text-xs text-ink-muted">
            Review in {reviewIn}
          </p>
        </div>
      )}
    </article>
  );
}
```

---

## 7.6 Today Desk Layout

```tsx
// app/(app)/today/page.tsx
import { LedgerCard } from "@/components/ui/ledger-card";
import { CalmButton } from "@/components/ui/calm-button";

const recentNotes = [
  { date: "Jun 5", title: "SOXX support test", tag: "Market Read" },
  { date: "Jun 4", title: "MSFT after-hours reaction", tag: "Earnings" },
  { date: "Jun 3", title: "MU / SNDK demand story", tag: "Thesis" },
];

export default function TodayPage() {
  return (
    <main className="min-h-screen bg-bg px-6 py-6 text-ink">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="font-serif text-3xl">Today</h1>
            <p className="mt-1 font-mono text-sm text-ink-muted">
              Saturday, Jun 6, 2026
            </p>
          </div>

          <CalmButton>Write Quick Note</CalmButton>
        </header>

        <LedgerCard title="What changed in your view today?">
          <textarea
            className="min-h-28 w-full resize-none rounded-md border border-line bg-surface px-3 py-3 text-sm outline-none placeholder:text-ink-muted focus:border-line-strong"
            placeholder="Share a quick thought, market read, or thesis..."
          />
        </LedgerCard>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <LedgerCard title="Today's Checklist">
            <Checklist />
          </LedgerCard>

          <LedgerCard title="Recent Notes">
            <div className="divide-y divide-line">
              {recentNotes.map((note) => (
                <div key={note.title} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xs text-ink-muted">
                      {note.date}
                    </span>
                    <span className="text-sm text-ink">{note.title}</span>
                  </div>

                  <span className="rounded-full border border-line bg-surface-muted px-2 py-1 text-xs text-ink-muted">
                    {note.tag}
                  </span>
                </div>
              ))}
            </div>
          </LedgerCard>
        </div>
      </div>
    </main>
  );
}

function Checklist() {
  const items = [
    "Market regime updated",
    "Watchlist reviewed",
    "Risk notes written",
    "Any thesis changed?",
    "Yesterday's note reviewed",
  ];

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-line text-primary focus:ring-primary"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
```

---

## 7.7 ETF Board Table

```tsx
// components/tools/etf-board-table.tsx
type EtfRow = {
  ticker: string;
  sector: string;
  last: number;
  oneDay: number;
  oneWeek: number;
  ytd: number;
  rsi: number;
  above10d: boolean;
  above20d: boolean;
  above50d: boolean;
  pctHigh: number;
};

export function EtfBoardTable({ rows }: { rows: EtfRow[] }) {
  return (
    <div className="overflow-hidden rounded-ledger border border-line bg-surface">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-surface-muted">
          <tr className="text-left text-xs uppercase tracking-wide text-ink-muted">
            <th className="px-3 py-3">Ticker</th>
            <th className="px-3 py-3">Sector</th>
            <th className="px-3 py-3 text-right">Last</th>
            <th className="px-3 py-3 text-right">1D</th>
            <th className="px-3 py-3 text-right">1W</th>
            <th className="px-3 py-3 text-right">YTD</th>
            <th className="px-3 py-3 text-right">RSI</th>
            <th className="px-3 py-3 text-center">10D</th>
            <th className="px-3 py-3 text-center">20D</th>
            <th className="px-3 py-3 text-center">50D</th>
            <th className="px-3 py-3 text-right">% High</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.ticker} className="hover:bg-surface-muted/60">
              <td className="px-3 py-3 font-mono font-semibold">
                {row.ticker}
              </td>
              <td className="px-3 py-3 text-ink-muted">
                {row.sector}
              </td>
              <td className="px-3 py-3 text-right font-mono">
                {row.last.toFixed(2)}
              </td>
              <ChangeCell value={row.oneDay} />
              <ChangeCell value={row.oneWeek} />
              <ChangeCell value={row.ytd} />
              <td className="px-3 py-3 text-right font-mono">
                {row.rsi.toFixed(1)}
              </td>
              <StatusCell active={row.above10d} />
              <StatusCell active={row.above20d} />
              <StatusCell active={row.above50d} />
              <td className="px-3 py-3 text-right font-mono">
                {row.pctHigh.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChangeCell({ value }: { value: number }) {
  const positive = value >= 0;

  return (
    <td
      className={
        "px-3 py-3 text-right font-mono " +
        (positive ? "text-success" : "text-danger")
      }
    >
      {positive ? "+" : ""}
      {value.toFixed(2)}%
    </td>
  );
}

function StatusCell({ active }: { active: boolean }) {
  return (
    <td className="px-3 py-3 text-center">
      <span className={active ? "text-success" : "text-danger"}>
        {active ? "✓" : "×"}
      </span>
    </td>
  );
}
```

---

## 8. Acceptance Criteria

### Visual

- [ ] Homepage 不再有 cyber glow 感
- [ ] 主要畫面使用 warm paper background
- [ ] 表格 / ledger / note card 成為主要視覺
- [ ] CTA 不使用 gradient
- [ ] 色彩主要用於狀態，不用於裝飾

### UX

- [ ] 新使用者 5 秒內理解產品是 trading journal
- [ ] 登入後第一屏可以直接寫 note
- [ ] ETF Board 可快速掃描 sector strength
- [ ] Position Builder 可以形成 entry plan
- [ ] Timeline 可以回顧判斷變化

### Copy

- [ ] 減少抽象 slogan
- [ ] 增加具體 action wording
- [ ] 使用 review prompt 代替 motivational copy

---

## 9. Implementation Order

```txt
1. Add design tokens
2. Refactor button / card / badge / table components
3. Rebuild homepage hero with sample diary card
4. Build Today Desk
5. Rebuild ETF Board as table
6. Rebuild Position Builder as worksheet
7. Rework Timeline layout
8. Polish copy and empty states
```

---

## 10. Final Product Feeling

Trade Basic should feel like:

```txt
A calm trading journal for people who take their own decisions seriously.
```

中文：

```txt
一個給主動投資者使用的冷靜交易日記。
寫低判斷，回看偏誤，慢慢建立自己的交易紀律。
```
