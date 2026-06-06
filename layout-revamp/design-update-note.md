# DESIGN.md Update Note

> This file is not a full replacement for the existing DESIGN.md.  
> It is an addendum for the next design iteration.

---

## 1. Do Not Fully Replace the Current Direction Yet

The current design direction is:

```txt
Institutional Fintech
Dark
Professional
Dashboard-like
```

The proposed warm ledger direction is useful, but should not fully replace the current design system until tested against real daily usage.

Recommended next direction:

```txt
Calm Institutional Ledger
```

Meaning:

```txt
Keep the institutional trust.
Reduce AI SaaS flavor.
Reduce glow and glass.
Add ledger, journal, table and review patterns.
```

---

## 2. Visual Adjustment

### Keep

```txt
Professional financial product feel
Dark mode support
Existing token contract
Existing route structure
Current mobile/PWA assumptions
```

### Reduce

```txt
Electric glow
Heavy glassmorphism
Oversized marketing slogans
Generic AI companion language
Gradient-heavy CTA
```

### Add

```txt
Diary preview cards
Ledger-style rows
Dense but readable tables
Review prompts
Calm note-taking surfaces
```

---

## 3. Token Policy

Do not rename token contracts in the current iteration.

Keep:

```css
--color-primary
--color-surface
--dt-primary
--dt-surface
```

Optional visual styles can be introduced through scoped overrides:

```css
:root[data-visual-style="calm-institutional"] {
  --color-primary: #3b82f6;
  --color-surface: #111827;
  --color-background: #0b1120;
  --color-border: #1f2937;
  --color-text: #f8fafc;
  --color-text-muted: #94a3b8;
}

:root[data-visual-style="calm-ledger"] {
  --color-primary: #243b53;
  --color-surface: #fffcf5;
  --color-background: #f6f1e8;
  --color-border: #d8cdbe;
  --color-text: #1f2933;
  --color-text-muted: #6b6258;
}
```

---

## 4. Vue Component Direction

New examples should use Vue SFC, not React.

### Component Candidates

```txt
components/BaseButton.vue
components/LedgerCard.vue
components/StatusBadge.vue
components/DiaryNotePreview.vue
components/EtfTableView.vue
components/EtfMobileRows.vue
```

---

## 5. Copy Direction

Avoid:

```txt
AI-powered companion
Unlock trading potential
Your ultimate coach
Markets don't reward effort
```

Prefer:

```txt
Write today's note
Review past decisions
Record thesis before entry
What changed your view?
Keep your process visible
```

All copy must go through i18n:

```txt
en
zh-TW
zh-CN
```

---

## 6. Mobile Rule

Every redesigned page needs a mobile layout.

Especially:

```txt
/diaries
/tools/etf
/tools/position-sizing
```

Mobile priority:

```txt
Quick note first.
Compact cards before dense tables.
No hover-only actions.
Min touch target 40px.
```

---

## 7. Product Rule

Do not introduce UI that implies backend support unless the model exists.

Examples:

```txt
Review Queue requires review_due_at / review_status.
Checklist requires persistence or must be clearly session-only.
Structured thesis/risk review requires structured diary fields.
```

---

## 8. Final Direction

```txt
Trade Basic should feel like a professional decision ledger,
not an AI-generated fintech landing page.
```
