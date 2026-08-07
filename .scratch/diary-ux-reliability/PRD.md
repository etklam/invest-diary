# Diary UX Reliability

Status: completed
Completed: 2026-08-07
Implementation commit: `c0a2ba7`

## Problem Statement

Diary Vue 的核心承諾是讓主動投資者持續記錄 Diary、回看判斷並完成 Review。現有介面在資料量增長、日期切換、篩選、行動導覽及表單錯誤情境下，會出現五類破壞信任的問題：Diary Desk 與 Calendar 可能只呈現 API 第一頁資料；全域摘要可能從不完整頁面推算；新增 Diary 時切換日期可能靜默覆寫未儲存內容；篩選無結果會被誤判為從未建立 Diary；行動底部導覽有兩個入口指向同一個 Diary Desk；建立或編輯 Diary 的驗證錯誤主要依賴短暫 Toast，未能指出具體欄位。

對使用者而言，這些問題不只是視覺瑕疵。它們會令人懷疑歷史是否完整、Summary 是否可信、剛輸入的判斷是否安全保存，以及錯誤後應該如何恢復。對一個以「紀錄 + 判斷 + 複盤」為核心的產品，資料完整性與輸入安全比新增功能更優先。

## Solution

Diary Vue 將提供一條可靠、可恢復、行動優先的 Diary 工作流程：Diary Desk 可逐頁存取完整歷史；Summary 由伺服器聚合並明確定義口徑；Calendar 依日期範圍取得輕量 Activity，不再靠超大 page limit；新增 Diary 會在初始日期與日期切換時預查既有 Diary，並保護未儲存變更；搜尋與篩選具備 debounce、正確空狀態與穩定 loading feedback；行動導覽不再重複 `/diaries`，抽屜符合鍵盤及輔助科技操作；所有 Diary 表單錯誤在相關欄位附近呈現，並可被程式化識別與聚焦。

使用者應該可以相信：第 21 篇與更舊的 Diary 仍然可達；Calendar 與 Summary 不會因分頁而漏資料；切換日期不會無聲清空草稿；搜尋沒有結果時能一鍵恢復；手機導覽每一格都有獨立用途；提交失敗時能立即知道要修正哪個欄位。

## User Stories

1. As a long-term Diary user, I want to access every Diary beyond the first 20 entries, so that my historical reasoning never disappears from the Diary Desk.
2. As a Diary user, I want to load additional entries without losing my current filters, so that I can continue reviewing a narrowed result set.
3. As a Diary user, I want the interface to indicate when more entries are available, so that a partial list is never presented as complete.
4. As a Diary user, I want pagination state to reset when a filter changes, so that I do not land on an invalid or empty later page.
5. As a Diary user, I want retryable pagination failures to preserve already loaded entries, so that a temporary network error does not blank my history.
6. As an investor, I want Diary Desk counts to represent a documented data scope, so that I can interpret totals without guessing whether they cover one page or all Diaries.
7. As an investor, I want Alert and Transaction counts to be calculated on the server, so that pagination cannot silently distort them.
8. As a user with pending Reviews, I want the Diary Desk to surface genuine Review candidates independent of the currently visible page, so that older due Reviews are not hidden.
9. As a Calendar user, I want activity for the visible month to be fetched by date range, so that every recorded day in that month appears.
10. As a Calendar user, I want the yearly heatmap to use a complete lightweight activity range, so that recorded days are not displayed as empty.
11. As a mobile user on a slow connection, I want Calendar activity payloads to contain only the fields needed for activity indicators, so that correctness does not require downloading full Diary content.
12. As a Diary author, I want the initial date to be checked for an existing Diary before I begin writing, so that I do not discover a duplicate only after submission.
13. As a Diary author, I want to choose whether to edit, append to, or cancel when a Diary already exists for a date, so that the system never guesses my intent.
14. As a Diary author, I want a warning before a date change replaces modified fields, so that my draft cannot be silently lost.
15. As a Diary author, I want a warning before navigating away from a dirty form, so that accidental navigation does not discard my reasoning.
16. As a Diary author, I want the Cancel action and browser navigation to follow the same unsaved-change policy, so that exit behavior is predictable.
17. As a Diary author who switches dates quickly, I want only the latest date lookup to update the form, so that a slower older response cannot overwrite the selected date.
18. As a Diary author, I want a failed date lookup to leave my current draft intact, so that a network failure cannot be mistaken for an empty date.
19. As a Diary user, I want search input to wait briefly before requesting results, so that typing does not trigger a request and loading transition for every character.
20. As a Diary user, I want existing results to remain visible while filters refresh, so that the page does not flash between content and a full skeleton.
21. As a Diary user with no Diaries, I want a first-entry empty state with a clear create action, so that I know how to begin.
22. As a Diary user whose filters match nothing, I want a no-results state that explains the filters are responsible, so that I do not think my Diary history has disappeared.
23. As a Diary user with no matching results, I want a one-click Clear Filters action, so that I can return to the full list immediately.
24. As a Diary user, I want filter loading and result counts announced accessibly, so that assistive technology communicates state changes.
25. As a mobile user, I want each bottom-navigation item to lead to a distinct destination, so that scarce navigation space is not wasted.
26. As a mobile user, I want the Diary Desk to be labelled consistently as my working home, so that Home and Diary do not appear to be different routes when they are the same.
27. As a mobile user, I want Calendar available in the bottom navigation, so that I can move between writing and temporal review without opening the drawer.
28. As a mobile user, I want Quick Capture to remain available through the existing floating action, so that replacing the duplicate navigation item does not slow down writing.
29. As a mobile user, I want the drawer grouped by Journal, Portfolio, Tools, and Learn, so that I do not have to scan one long mixed list.
30. As a keyboard user, I want the menu trigger to announce whether the drawer is open, so that its state is understandable without sight.
31. As a keyboard user, I want focus to move into the drawer when it opens and return to the trigger when it closes, so that navigation remains predictable.
32. As a keyboard user, I want Tab focus contained within the open drawer and Escape to close it, so that I cannot become lost in background content.
33. As a mobile user, I want a visible close control in the drawer, so that closing the menu does not depend on discovering the backdrop behavior.
34. As a Diary author, I want validation errors displayed beside the related fields, so that I can correct them without searching a long form.
35. As a Diary author, I want submission to focus the first invalid field, so that recovery is immediate on desktop and mobile.
36. As a screen-reader user, I want invalid fields associated with their error text, so that I understand what failed and why.
37. As a Diary author adding Transactions, I want each dynamic row to have stable error associations, so that inserting or removing another row does not attach an error to the wrong Transaction.
38. As a Diary author, I want a concise error summary for multi-field failures, so that I know the total work required while still having inline details.
39. As a Diary author, I want Toast feedback reserved for global or server failures, so that field validation remains persistent until corrected.
40. As a multilingual user, I want every new state, error, action, and navigation label available in English, Traditional Chinese, and Simplified Chinese, so that the workflow does not fall back to hard-coded text.
41. As a user who prefers reduced motion, I want loading and drawer transitions to respect my motion setting, so that reliability improvements do not create discomfort.
42. As a product maintainer, I want explicit behavioral metrics for completeness and recovery scenarios, so that regressions are caught before release.

## Implementation Decisions

- Deliver the work as five vertical slices in this order: data completeness, draft safety, filter feedback, mobile navigation, and field validation. Each slice must be independently releasable and regression-tested.
- Introduce a deep Diary read-model module that exposes three stable operations: paginated Diary listing, server-calculated Diary Desk Summary, and date-range Diary Activity. UI code must not derive global Summary values from a paginated list.
- Preserve the existing paginated Diary-list contract. The client will retain pagination metadata and expose a Load More interaction. A failed later-page request preserves previously loaded entries and offers retry.
- Add a Diary Desk Summary API whose response explicitly separates global totals from time-window values. At minimum it returns total Diary count, current-week Diary count in the user's timezone, open Alert count, Diaries with Alerts, Transaction count, Diaries with Transactions, and Review candidate count.
- Summary calculations must use the authenticated user's timezone and ownership boundary. They must not load full Markdown content merely to aggregate counts.
- Add a lightweight Diary Activity API accepting `dateFrom` and `dateTo`. Each activity row contains a local date key and booleans or counts needed by Calendar: Diary present, Alert present/count, and Transaction present/count. It does not return Diary content.
- Calendar requests the visible month range for the month grid and a rolling 371-day range for the heatmap. It must not pass a page limit larger than the Diary-list contract allows.
- Create a Diary authoring guard module with a small public interface for dirty state, date preflight, latest-request ownership, and leave confirmation. The module encapsulates request-generation or cancellation details so page components do not implement race prevention ad hoc.
- Initial date preflight runs immediately. When a Diary exists, the user chooses Edit Existing, Append, or Cancel before existing data replaces the form.
- Date changes never replace a dirty form without explicit confirmation. Lookup failure leaves the current form untouched and presents a recoverable error.
- Route leave, browser unload, Cancel, and date change share the same definition of dirty state. Successful save resets the dirty baseline.
- Introduce a Diary filter controller that separates immediate input text from the committed server query. Search commits after 300 ms of inactivity; date and sort controls commit immediately.
- Filter changes reset pagination and preserve the previous list while the first replacement request is pending. Use local busy feedback and `aria-busy`; reserve the full skeleton for the initial load when no content exists.
- Empty-state classification is centralized as one of `initial-loading`, `load-error`, `first-diary`, `no-results`, or `results`. `first-diary` requires the global total to be zero; `no-results` requires an active filter and zero filtered results.
- The authenticated mobile bottom navigation becomes Desk (`/diaries`), Stocks, Calendar, Alerts, and Settings. Quick Capture remains the existing floating action and keyboard shortcut.
- The mobile drawer uses the same Journal, Portfolio, Tools, and Learn grouping model as desktop instead of maintaining a second flat taxonomy.
- Introduce a reusable modal/drawer focus controller shared conceptually with the existing Quick Diary dialog behavior: trigger state attributes, initial focus, focus containment, Escape close, background inertness, scroll locking, and focus restoration.
- Introduce a Diary authoring validation module that returns structured field errors rather than a single message. Error keys cover top-level Diary fields, structured Review fields, and stable Transaction row identifiers.
- Inputs with errors receive `aria-invalid`; help and error text use stable IDs referenced by `aria-describedby`. Every visible label is programmatically associated with its input.
- On invalid submit, render an accessible error summary and focus the first invalid control. Toast remains for global request failures and successful completion, not as the only field-error channel.
- The Diary UX slices do not add new domain fields. The related data-hardening slice adds a normalized user/date uniqueness constraint and an auditable reconciliation model for legacy duplicates.
- All API responses continue to use existing authentication, ownership, serialization, structured error, and no-cache conventions.
- All new user-facing copy must be added to all three locale files in the same change.
- Keep the current Calm Institutional Ledger visual direction. This PRD changes information accuracy, recovery, hierarchy, and accessibility; it does not authorize a visual rebrand.

## Testing Decisions

- Good tests assert externally observable behavior and stable contracts, not Vue implementation details, internal watcher counts, or private helper calls.
- The Diary read-model receives unit coverage for pagination math, Summary aggregation boundaries, timezone-aware current-week calculation, and compact Activity projection.
- The Diary-list API receives contract tests for page metadata, filters, ownership, the 20/21-entry boundary, and later-page failure behavior.
- The Summary API receives API tests proving values are independent of list pagination and isolated by authenticated user.
- The Activity API receives API tests for month and 371-day ranges, empty ranges, timezone date keys, Alert/Transaction indicators, validation, and ownership.
- Prior art for pagination and incremental loading is the existing Timeline workflow; reuse its externally visible load-more expectations without coupling to its internal implementation.
- The Diary authoring guard receives deterministic unit tests for pristine/dirty transitions, initial preflight, existing-Diary choices, stale-response rejection, lookup failure, successful-save reset, and leave decisions.
- Page-level component tests verify that date changes cannot silently replace dirty content and that initial-date conflicts are resolved before editing begins.
- E2E coverage extends the existing Diary CRUD workflow with: create more than 20 Diaries, access the 21st entry, preserve loaded items after a failed Load More, and verify complete Calendar activity.
- Filter-controller tests use fake timers to verify the 300 ms search debounce, page reset, preservation of old results, and correct classification of first-diary versus no-results states.
- Mobile navigation tests assert five unique routes, exactly one `/diaries` destination, Calendar presence, active-state correctness, drawer grouping, `aria-expanded`, Escape close, focus containment, and focus restoration.
- Prior art for focus management is the existing Quick Diary dialog; tests should assert behavior rather than duplicate its DOM structure.
- Validation tests assert structured error output, stable Transaction identifiers, inline rendering, accessible field associations, error-summary links, and first-invalid-field focus.
- Run accessibility checks at minimum with keyboard-only interaction and VoiceOver on the Diary form and mobile drawer. Automated assertions supplement but do not replace this manual pass.
- Responsive acceptance viewports are 375 px, 768 px, 1024 px, and 1440 px. No new horizontal scrolling or bottom-navigation overlap is permitted.
- Required gates for each slice: targeted unit/API/component tests, lint, typecheck, documentation health check, and the affected E2E specs. The final integration pass runs the complete test suite and production build.

## Out of Scope

- Visual redesign, new color system, typography change, gamification, streaks, or animation-heavy polish.
- Authentication registration or login-flow changes.
- New Diary, Transaction, Alert, Review, or User database fields.
- Broker synchronization, market-data changes, or portfolio calculation changes.
- Replacing the existing Quick Diary autosave system.
- Creating a new client state-management dependency or form-validation dependency unless the existing approach cannot satisfy the defined contracts.
- Rewriting all project confirmations, Toasts, or error surfaces outside Diary authoring and mobile navigation.
- Product analytics instrumentation or experimentation infrastructure. ROI estimates remain qualitative until a separate analytics decision is made.
- Moving routes or changing public URLs beyond the bottom-navigation destinations described above.
- Redesigning Calendar heatmap semantics beyond making its source data complete.

## Further Notes

- The highest-risk defect is mixed data scope: the interface can show a correct global Diary total beside counts derived from only the first page. Acceptance must verify every displayed Summary field has one documented scope.
- The existing Diary-list maximum page size should remain a resource-protection boundary. Calendar correctness must come from a range-specific projection, not a larger arbitrary limit.
- The old date-change behavior can lose work even without an async race; stale-response protection is still required because date lookup is asynchronous.
- The product already contains useful prior art: Timeline incremental loading, Stocks search debounce, Review retry states, Quick Diary focus containment, and Toast live regions. Reuse their proven behavior while consolidating the new rules into deeper modules.
- Suggested delivery priority by risk and ROI: (1) complete data and accurate Summary, (2) draft guard, (3) filter state, (4) unique and accessible mobile navigation, (5) field-level validation.
- Definition of done: the 21st Diary is reachable; Calendar month and heatmap data are complete for the requested ranges; Summary does not depend on current list page; dirty content survives date and navigation mistakes; filtered zero results can be cleared; bottom navigation contains one `/diaries`; drawer focus is contained and restored; invalid fields are announced, linked to persistent errors, and focused on submit.

## Completion Record

The nine outstanding reliability and data-hardening tickets were implemented in `c0a2ba7`.

| Ticket | Difficulty | ROI | Delivery status |
| --- | --- | --- | --- |
| #01 Invalid transaction values | S | High | Completed |
| #02 One Diary per user-local date | XL | High | Implementation complete; production reconciliation gate remains |
| #03 Impossible calendar dates | S | High | Completed |
| #04 Complete Diary history and Activity | L | High | Completed |
| #05 Canonical Market Rotation comparison date | M | High | Completed |
| #06 Independent refresh sessions | M | High | Completed |
| #07 Holiday API observability | S | Medium | Completed |
| #08 Draft protection during date changes | L | High | Completed |
| #09 Diary sorting, filtering, and Summary semantics | L | High | Completed |

Repository verification passed:

- `npm test`: 206 files passed; 1,928 tests passed; 2 skipped.
- `npm run typecheck`: passed.
- `npm run lint`: 0 errors; existing warnings remain.
- `npm run build`: passed.

Release follow-up for #02: run `npm run diary:duplicates:audit`, obtain human approval for the reconciliation policy, run `npm run diary:duplicates:reconcile -- --apply --migration-id=<id>`, then apply the uniqueness migration during a maintenance window. This was not run against production from the local workspace.
