# DESIGN.md

> Trade Basic Design System  
> Style: Calm investor notebook + trading ledger  
> Version: 1.0

---

## 1. Design Principle

Trade Basic 是投資日記，不是交易刺激工具。

設計應該鼓勵：

```txt
Think before entry.
Record before memory changes.
Review before repeating mistakes.
```

設計不應該鼓勵：

```txt
Trade more.
Chase signals.
Gamify performance.
Overtrust AI.
```

---

## 2. Brand Personality

### Keywords

```txt
Calm
Disciplined
Readable
Private
Serious
Practical
Notebook-like
Ledger-like
```

### Not This

```txt
Cyber
Hype
Glow
AI SaaS
Crypto dashboard
Motivational finance guru
```

---

## 3. Visual Direction

### Metaphor

```txt
Investor Field Notebook
```

A notebook for:

- market read
- trade thesis
- position plan
- risk note
- post-trade review
- decision timeline

### UI Texture

Use:

- subtle paper background
- fine borders
- ledger rows
- restrained shadow
- serif headings
- mono numbers
- muted accent colors

Avoid:

- glassmorphism
- glowing borders
- heavy gradients
- oversized icons
- random illustrations
- generic AI companion avatars

---

## 4. Color System

## 4.1 Light Mode

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
```

### Usage

| Token | Usage |
|---|---|
| `--bg` | App background |
| `--surface` | Cards, panels, inputs |
| `--surface-muted` | Table header, inactive tab |
| `--ink` | Main text |
| `--ink-muted` | Secondary text |
| `--line` | Border |
| `--primary` | Main CTA |
| `--accent` | Small highlight |
| `--success` | Positive status |
| `--danger` | Negative status |
| `--warning` | Caution status |

---

## 4.2 Dark Mode

```css
.dark {
  --bg: #11100e;
  --surface: #1a1815;
  --surface-muted: #24211d;
  --ink: #f4efe7;
  --ink-muted: #b8aea1;
  --line: #3a332c;
  --line-strong: #5a5046;

  --primary: #9fb3c8;
  --primary-soft: #26384a;

  --accent: #c9a66b;
  --success: #8fb996;
  --danger: #c97b7b;
  --warning: #d6a84f;
}
```

Dark mode should feel like a desk lamp over a notebook, not a cyber terminal.

---

## 5. Typography

### Font Stack

```css
:root {
  --font-heading: "Fraunces", Georgia, serif;
  --font-body: "Source Sans 3", Inter, sans-serif;
  --font-data: "IBM Plex Mono", ui-monospace, monospace;
}
```

### Roles

| Font | Role |
|---|---|
| Fraunces | Page title, article title, hero title |
| Source Sans 3 | Body, UI, label, button |
| IBM Plex Mono | Dates, ticker, price, percentage, numeric data |

### Type Scale

```css
:root {
  --text-xs: 12px;
  --text-sm: 14px;
  --text-md: 16px;
  --text-lg: 18px;
  --text-xl: 24px;
  --text-2xl: 32px;
  --text-hero: 48px;
}
```

### Typography Rules

```txt
Hero title max 48px.
Do not overuse serif.
Do not use mono for long paragraph.
All financial numbers should use tabular / mono style.
```

---

## 6. Spacing

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
}
```

### Layout Width

```txt
Marketing page max width: 1180px
App page max width: 1280px
Reading content max width: 760px
```

---

## 7. Border Radius / Shadow

```css
:root {
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;

  --shadow-paper: 0 1px 2px rgba(31, 41, 51, 0.06);
  --shadow-panel: 0 8px 24px rgba(31, 41, 51, 0.08);
}
```

### Rule

```txt
Use border first, shadow second.
Avoid floating glass card feeling.
```

---

## 8. Component System

## 8.1 Button

### Variants

```txt
Primary   - main action
Secondary - alternative action
Ghost     - low emphasis
Danger    - destructive action
```

### Code

```tsx
import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
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
        variant === "danger" &&
          "border border-danger bg-danger text-surface hover:opacity-90",
        className
      )}
      {...props}
    />
  );
}
```

---

## 8.2 Ledger Card

### Usage

Use for:

- diary note
- review queue
- summary block
- tool input panel
- market snapshot

### Code

```tsx
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
        "rounded-[14px] border border-line bg-surface p-5 shadow-paper",
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

## 8.3 Badge

### Badge Types

```txt
Market Read
Thesis
Earnings
Review
Risk
System
```

### Code

```tsx
import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "success" | "danger" | "warning" | "accent";

const toneClass: Record<BadgeTone, string> = {
  neutral: "border-line bg-surface-muted text-ink-muted",
  success: "border-success/30 bg-success/10 text-success",
  danger: "border-danger/30 bg-danger/10 text-danger",
  warning: "border-warning/30 bg-warning/10 text-warning",
  accent: "border-accent/30 bg-accent/10 text-accent",
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        toneClass[tone]
      )}
    >
      {children}
    </span>
  );
}
```

---

## 8.4 Table

### Table Rules

```txt
Use table for ETF, portfolio, position sizing, performance.
Use font-mono for numerical cells.
Use muted header background.
Avoid excessive row color.
```

### Code

```tsx
type Column<T> = {
  key: keyof T;
  label: string;
  align?: "left" | "right" | "center";
  mono?: boolean;
  render?: (row: T) => React.ReactNode;
};

export function LedgerTable<T extends { id: string }>({
  columns,
  rows,
}: {
  columns: Column<T>[];
  rows: T[];
}) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-surface-muted">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={cn(
                  "px-3 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted",
                  column.align === "right" && "text-right",
                  column.align === "center" && "text-center",
                  (!column.align || column.align === "left") && "text-left"
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-surface-muted/60">
              {columns.map((column) => (
                <td
                  key={String(column.key)}
                  className={cn(
                    "px-3 py-3 text-ink",
                    column.mono && "font-mono tabular-nums",
                    column.align === "right" && "text-right",
                    column.align === "center" && "text-center"
                  )}
                >
                  {column.render ? column.render(row) : String(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 8.5 Input / Textarea

```tsx
type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full resize-none rounded-md border border-line",
        "bg-surface px-3 py-3 text-sm text-ink",
        "placeholder:text-ink-muted",
        "focus:border-line-strong focus:outline-none",
        className
      )}
      {...props}
    />
  );
}
```

---

## 9. Layout Patterns

## 9.1 Marketing Homepage

```txt
Header
Hero + Sample Diary
Feature Strip
Workflow
Product Modules
Privacy Note
Final CTA
Footer
```

### Hero Example

```tsx
export function HomeHero() {
  return (
    <section className="bg-bg px-6 py-20 text-ink">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_420px]">
        <div>
          <p className="mb-4 font-mono text-xs uppercase tracking-wide text-ink-muted">
            Trading Journal
          </p>

          <h1 className="font-serif text-5xl leading-tight">
            Write the trade before the market rewrites your memory.
          </h1>

          <p className="mt-6 max-w-xl text-lg text-ink-muted">
            A calm trading journal for active investors. Record your thesis,
            risk, execution and review — so every decision leaves a trace.
          </p>

          <div className="mt-8 flex gap-3">
            <Button>Write today's note</Button>
            <Button variant="secondary">View sample diary</Button>
          </div>
        </div>

        <SampleDiaryCard />
      </div>
    </section>
  );
}
```

---

## 9.2 App Shell

```txt
Sidebar | Main Content
```

### Sidebar Sections

```txt
Journal
- Today
- Quick Note
- Diaries
- Timeline
- Calendar

Tools
- ETF Board
- Position Sizing
- Seasonality
- Relative Value
- FIRE Calculator

Learn
- Trading Discipline
- Blog
- Resources
```

### Code

```tsx
const navGroups = [
  {
    label: "Journal",
    items: [
      { label: "Today", href: "/today" },
      { label: "Quick Note", href: "/quick-note" },
      { label: "Diaries", href: "/diaries" },
      { label: "Timeline", href: "/timeline" },
      { label: "Calendar", href: "/calendar" },
    ],
  },
  {
    label: "Tools",
    items: [
      { label: "ETF Board", href: "/tools/etf" },
      { label: "Position Sizing", href: "/tools/position-sizing" },
      { label: "Seasonality", href: "/tools/seasonality" },
      { label: "Relative Value", href: "/tools/relative-value" },
      { label: "FIRE Calculator", href: "/tools/fire" },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-ink lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-r border-line bg-surface">
        <div className="border-b border-line px-5 py-4">
          <div className="font-serif text-xl">Trade Basic</div>
        </div>

        <nav className="space-y-6 px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-2 font-mono text-xs uppercase tracking-wide text-ink-muted">
                {group.label}
              </p>

              <div className="space-y-1">
                {group.items.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="block rounded-md px-2 py-2 text-sm text-ink-muted hover:bg-surface-muted hover:text-ink"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <main>{children}</main>
    </div>
  );
}
```

---

## 10. Page Templates

## 10.1 Today Page

```txt
Header
Quick Note
Checklist + Recent Notes
Review Queue + Market Snapshot
```

### Code

```tsx
export default function TodayPage() {
  return (
    <main className="px-6 py-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="font-serif text-3xl">Today</h1>
            <p className="mt-1 font-mono text-sm text-ink-muted">
              Saturday, Jun 6, 2026
            </p>
          </div>

          <Button>Write Quick Note</Button>
        </header>

        <LedgerCard title="What changed in your view today?">
          <Textarea placeholder="Share a quick thought, market read, or thesis..." />
        </LedgerCard>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <LedgerCard title="Today's Checklist">
            {/* checklist */}
          </LedgerCard>

          <LedgerCard title="Recent Notes">
            {/* recent note rows */}
          </LedgerCard>

          <LedgerCard title="Review Queue">
            {/* review reminders */}
          </LedgerCard>

          <LedgerCard title="Market Snapshot">
            {/* QQQ / SPY / VIX small table */}
          </LedgerCard>
        </div>
      </div>
    </main>
  );
}
```

---

## 10.2 ETF Board Page

```txt
Header
Tabs
Filters
Summary Strip
ETF Table
```

### Code

```tsx
export default function EtfBoardPage() {
  return (
    <main className="px-6 py-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 flex items-end justify-between">
          <div>
            <p className="mb-1 text-sm text-ink-muted">Tools / ETF Board</p>
            <h1 className="font-serif text-3xl">ETF Sector Board</h1>
          </div>

          <p className="font-mono text-xs text-ink-muted">
            Last updated: Jun 6, 2026 09:31
          </p>
        </header>

        <div className="mb-4 flex flex-wrap gap-2">
          {["US Sectors", "Index ETFs", "Custom"].map((tab) => (
            <button
              key={tab}
              className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-muted hover:text-ink"
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {["Above all MAs", "Below 20D", "RSI > 70", "RSI < 40", "Near High"].map(
            (filter) => (
              <button
                key={filter}
                className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-muted"
              >
                {filter}
              </button>
            )
          )}
        </div>

        <div className="mb-5 grid gap-3 md:grid-cols-4">
          <MetricCard label="Above 10D EMA" value="8 / 11" />
          <MetricCard label="Above 20D EMA" value="7 / 11" />
          <MetricCard label="Above 50D SMA" value="6 / 11" />
          <MetricCard label="Avg RSI" value="58.2" />
        </div>

        {/* <EtfBoardTable rows={rows} /> */}
      </div>
    </main>
  );
}
```

---

## 10.3 Position Builder Page

```txt
Header
Input Panel + Allocation Plan
Summary + Risk Notes
```

### Code

```tsx
export default function PositionBuilderPage() {
  return (
    <main className="px-6 py-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <p className="mb-1 text-sm text-ink-muted">Tools / Position Sizing</p>
          <h1 className="font-serif text-3xl">Position Builder</h1>
        </header>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <LedgerCard title="Inputs">
            <div className="space-y-4">
              <Field label="Ticker" placeholder="NVDA" />
              <Field label="Price" placeholder="$1,224.40" />
              <Field label="Total Capital" placeholder="$10,000" />
              <Field label="Reserve Cash" placeholder="20%" />
            </div>
          </LedgerCard>

          <LedgerCard title="Allocation Plan">
            {/* allocation table */}
          </LedgerCard>

          <LedgerCard title="Summary">
            <ul className="space-y-2 text-sm text-ink-muted">
              <li>Max capital exposed: $10,000</li>
              <li>Cash remaining: $2,000</li>
              <li>Average cost if all filled: $1,224.40</li>
            </ul>
          </LedgerCard>

          <LedgerCard title="Risk Notes">
            <Textarea placeholder="Write your risk plan here..." />
          </LedgerCard>
        </div>
      </div>
    </main>
  );
}
```

---

## 11. Motion

Motion should be quiet.

### Allowed

```txt
Small hover background change
Subtle opacity transition
Accordion open / close
Table row hover
```

### Avoid

```txt
Bouncy animation
Parallax
Animated gradient
Sparkle
AI typing effect everywhere
```

### CSS

```css
.motion-quiet {
  transition:
    background-color 140ms ease,
    color 140ms ease,
    border-color 140ms ease,
    opacity 140ms ease;
}
```

---

## 12. Iconography

Use icons only when they improve scanning.

### Style

```txt
Stroke icons
16px / 18px
No filled 3D icons
No oversized hero icon
```

### Good Icon Usage

```txt
Calendar
Notebook
Table
Chart
Search
Settings
Lock
```

---

## 13. Empty States

Empty states should invite one concrete action.

### Bad

```txt
No data yet. Unlock insights with AI.
```

### Good

```txt
No notes today.
Write one market read before the close.
```

### Examples

```tsx
export function EmptyState() {
  return (
    <div className="rounded-[14px] border border-dashed border-line bg-surface p-8 text-center">
      <h3 className="font-serif text-xl text-ink">No notes today</h3>
      <p className="mt-2 text-sm text-ink-muted">
        Write one market read before the close.
      </p>
      <div className="mt-5">
        <Button>Write Quick Note</Button>
      </div>
    </div>
  );
}
```

---

## 14. Copywriting System

### Main Actions

| Situation | Copy |
|---|---|
| New note | Write today's note |
| Review | Review past decision |
| Timeline | View decision timeline |
| Tool | Build position plan |
| ETF | Scan sector strength |
| Save | Save note |
| Compare | Compare with partner |
| Delete | Delete note |

### Review Questions

```txt
What was the original thesis?
What changed after entry?
Was the thesis wrong?
Was the timing wrong?
Was the sizing wrong?
Was the risk defined clearly?
Would you take the same trade again?
```

---

## 15. Accessibility

### Rules

```txt
Text contrast must pass WCAG AA.
Do not rely on red / green only.
Tables need readable headers.
Interactive elements need focus states.
Buttons should be at least 40px height.
```

### Status Example

```tsx
function TrendStatus({ above }: { above: boolean }) {
  return (
    <span className={above ? "text-success" : "text-danger"}>
      <span aria-hidden>{above ? "✓" : "×"}</span>
      <span className="sr-only">
        {above ? "Above moving average" : "Below moving average"}
      </span>
    </span>
  );
}
```

---

## 16. Responsive Design

### Breakpoints

```txt
Mobile: single column
Tablet: two-column cards
Desktop: sidebar + main content
Wide desktop: data table full width
```

### Mobile Rules

```txt
Tables can scroll horizontally.
Primary action stays visible near top.
Sidebar becomes drawer.
Avoid compressing market data into tiny cards.
```

---

## 17. Implementation Checklist

```txt
[ ] Add CSS tokens
[ ] Add Tailwind token mapping
[ ] Refactor Button
[ ] Add LedgerCard
[ ] Add Badge
[ ] Add LedgerTable
[ ] Add Textarea
[ ] Rebuild homepage hero
[ ] Build SampleDiaryCard
[ ] Build Today Desk
[ ] Rebuild ETF Board
[ ] Rebuild Position Builder
[ ] Rebuild Timeline
[ ] Rewrite copy
[ ] Add empty states
[ ] Test mobile layout
[ ] Test dark mode
```

---

## 18. Final Design Test

Before shipping any page, ask:

```txt
Does this help the investor write, think, or review?
Does this feel calm enough to use every day?
Does the UI reduce impulse instead of increasing it?
Can a user understand the page in 5 seconds?
Would this still look professional after 2 years?
```

If the answer is no, simplify.
