# Homepage Reposition Plan

## Context
- Current homepage is visually strong but messaging is misaligned with the intended positioning:
  - Trade basics learning
  - Community co-learning
  - Goals: financial freedom, passive income, turning losses into stable process
- Current copy includes overconfident wording and metric-like claims that can reduce trust.

## Goals
1. Reposition homepage from "fintech OS/performance" to "learning-first trading foundation".
2. Remove overpromising language and absolute guarantees.
3. Build a credible narrative: process -> discipline -> gradual improvement.
4. Add transparent risk disclosure for financial content.
5. Keep conversion flow clear (`register`, `learn more`, `login`).

## Messaging Principles (No Overpromise)
- Use process language:
  - "help you build", "support your review", "improve consistency"
- Avoid certainty language:
  - Avoid "ensure", "guarantee", "never miss", "success rate"
- Emphasize uncertainty and personalization:
  - "results vary by execution and risk control"
- Keep goals aspirational but not promised:
  - Financial freedom/passive income as long-term direction, not guaranteed outcome

## Information Architecture (Homepage)
1. Hero
2. Learning Path (Trade Basics)
3. Community Co-learning
4. Practice & Review Loop (Turnaround framework)
5. Product Features
6. Risk & Transparency Notice
7. CTA

## Planned Content Changes

### 1) Hero Reframe
- Replace "Fintech Journal OS" label with learning-focused label.
- Rewrite title/subtitle around:
  - Learning fundamentals
  - Building discipline
  - Improving decision quality over time
- Keep dual CTA:
  - Primary: Start learning / Register
  - Secondary: How it works

### 2) Remove/Replace High-Risk Claims
- Remove static pseudo-performance stats:
  - `Success Rate 94.8%`
  - `Latency 52 ms`
  - `Audit Events 1.2M+`
- Replace with non-deceptive progress indicators:
  - "Weekly review streak"
  - "Completed lessons"
  - "Recorded decisions"

### 3) Add Trade Basics Section
- Introduce 3-step beginner path:
  - Market basics
  - Risk management
  - Journal + review habit
- Each card links to practical action, not abstract promise.

### 4) Add Community Co-learning Section
- Explain peer learning model:
  - Share discipline rules
  - Discuss mistakes and setups
  - Track consistency together
- Use social proof language carefully (no fake numeric claims).

### 5) Turnaround Narrative (扭虧為盈)
- Present as framework, not outcome guarantee:
  - Record mistakes
  - Detect recurring errors
  - Define corrective rules
  - Re-test and iterate
- Copy should state "focus on reducing repeated mistakes".

### 6) Risk & Transparency Block
- Add short financial disclaimer:
  - Educational content only
  - Not investment advice
  - No guaranteed returns
- Place near CTA/footer for visibility.

## i18n and Language Consistency
- Move all hardcoded English homepage strings into i18n keys.
- Ensure `zh-TW`, `zh-CN`, `en` have equivalent meaning (not literal-only translation).
- Tone guide:
  - `zh-TW`: practical, calm, non-salesy
  - `en`: clear, non-hype, process-first

## Visual/UX Direction
- Keep existing style base (clean fintech) but shift emphasis:
  - less "operations terminal", more "learning journey"
- Preserve current accessibility strengths:
  - focus-visible states
  - reduced-motion handling
  - readable contrast
- Avoid gamified effects that imply guaranteed wins.

## Implementation Steps
1. Update `pages/index.vue` structure and section order.
2. Replace hardcoded hero/trust/terminal/chapter copy with i18n keys.
3. Add new i18n keys for learning/community/disclaimer sections in:
   - `i18n/locales/zh-TW.json`
   - `i18n/locales/zh-CN.json`
   - `i18n/locales/en.json`
4. Remove risky claims and absolute wording from all homepage locale entries.
5. Run quick UI check at mobile + desktop breakpoints.

## Acceptance Criteria
- No absolute guarantee words on homepage ("ensure", "guarantee", "success rate", etc.).
- No fabricated performance metrics presented as factual.
- Homepage clearly communicates:
  - trade basics learning
  - community learning
  - long-term wealth direction without promised outcomes
- Financial disclaimer is visible and readable.
- All homepage copy is i18n-driven (no leftover hardcoded English blocks).

## Files in Scope
- `pages/index.vue`
- `i18n/locales/zh-TW.json`
- `i18n/locales/zh-CN.json`
- `i18n/locales/en.json`

## Out of Scope (This Iteration)
- Backend logic changes
- New feature APIs
- Deep redesign of internal pages
