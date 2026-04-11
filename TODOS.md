# TODOs

This file tracks deferred work and future improvements for the Diary Vue project.

## Font & Typography

- [x] **Add Plus Jakarta Sans font import to app.vue** ✅ Completed 2026-04-05
  - **Why**: CategoryFilter.vue and PostMeta.vue reference `font-family: 'Plus Jakarta Sans'`, but the font is not imported
  - **Details**: Add Google Fonts import for Plus Jakarta Sans with all weights (300-800) to app.vue
  - **Priority**: Medium — Currently falls back to default sans-serif, which may cause inconsistent visual appearance
  - **Dependencies**: None
  - **Blocked by**: None

## Testing

- [ ] **Add component tests for CategoryFilter and PostMeta**
  - **Why**: These components currently have no test coverage
  - **Details**: Create tests/components/CategoryFilter.test.ts and tests/components/PostMeta.test.ts
  - **Priority**: Low — Components are working, but tests would prevent regressions
  - **Dependencies**: None
  - **Blocked by**: Font import (for accurate visual regression testing)

- [ ] **Update BlogCard.test.ts for i18n changes**
  - **Why**: Recent changes added i18n for "minute" label, but tests don't verify this
  - **Details**: Add test case verifying `blog.minute` i18n key is used correctly
  - **Priority**: Low
  - **Dependencies**: None
  - **Blocked by**: None

## Data Quality (P0 Blockers — fix before building analytics)

- [ ] **修復 symbol 大小寫不一致 bug**
  - **Why**: `aapl` 和 `AAPL` 會被 calculateHoldings() 算成兩檔不同股票，影響所有持股和績效計算
  - **Details**: diary-write.ts:89 create 時存 raw symbol，[id].put.ts:81 update 時才 `.toUpperCase()`。修復方式: (1) diary-write.ts create 加 `.trim().toUpperCase()` (2) migration script 統一現有資料 `UPDATE transactions SET symbol = UPPER(TRIM(symbol))`
  - **Priority**: Critical — 績效分析的前置條件
  - **Dependencies**: None
  - **Blocked by**: None
  - **Found by**: Codex review 2026-04-11

- [ ] **穩定化 Transaction ID（diary update 改 upsert）**
  - **Why**: server/api/diaries/[id].put.ts:55-62 編輯日記時 deleteMany + recreate 所有交易，導致 transaction ID 每次都變。DisciplineCheck / TradeReview 綁定 transactionId 會斷線。
  - **Details**: 把 deleteMany + recreate 改成 diff-based upsert: 比對現有 transactions vs 新提交，只刪除/新增/更新差異部分，保持已有 transaction ID 不變。
  - **Priority**: Critical — 所有綁定 transaction ID 的功能的前置條件（紀律守門員、交易回顧）
  - **Dependencies**: None
  - **Blocked by**: None
  - **Found by**: Codex review 2026-04-11

- [ ] **統一成本法註解（FIFO → 平均成本）**
  - **Why**: lib/utils.ts:48 註解寫「FIFO」但實際實作是 average cost，會誤導未來開發者
  - **Details**: 搜尋所有 FIFO 相關註解（lib/utils.ts, HoldingsDisplay.vue, tests），改為「平均成本法」。同時更新 CLAUDE.md 中的相關描述。
  - **Priority**: Medium — 純文字改動無風險，但消除認知混亂
  - **Dependencies**: None
  - **Blocked by**: None
  - **Found by**: Codex review 2026-04-11

## Documentation

- [ ] **Add application screenshots to README**
  - **Why**: README.md has a TODO for adding application screenshots
  - **Details**: Capture screenshots of key pages (blog list, article detail, diary list) and add to README
  - **Priority**: Low
  - **Dependencies**: Font import (for better visual presentation)
  - **Blocked by**: None
