# Diary Vue 文檔盤點與完成度審查

日期：2026-03-26  
範圍：repo 內現存 `.md` 文件

## 審查方式

- 先盤點所有 markdown 文件。
- 將文件分成兩類：
  - 參考/操作文件：收錄與標記是否過時，不強行判定「完成」。
  - 規劃/改善/issue 文件：逐項對照目前 codebase，判定為「已完成 / 部分完成 / 未完成 / 已過時」。
- 補充驗證：
  - `npm run lint` 目前可執行，但只對極少數檔案有效；本次只報出 `coverage/block-navigation.js` warning。
  - `npm run typecheck` 退出碼為 0，但執行過程仍輸出 `Resolve plugin path failed: vue-router/volar/sfc-route-blocks`，表示 gate 不夠可信。

## Markdown Inventory

### A. 參考 / 操作文件

- `README.md`
- `TECHNICAL_DOC.md`
- `DEPLOYMENT.md`
- `docs/DOCKER_DEPLOYMENT.md`
- `docs/HEALTH_CHECK.md`
- `docs/TESTING.md`
- `database/README.md`
- `tests/README.md`
- `CLAUDE.md`
- `etf.md`

### B. 規劃 / 改善 / 審查 / issue 文件

- `IMPROVEMENTS.md`
- `TECH_DEBT.md`
- `QUALITY_REVIEW.md`
- `IMPLEMENTATION_SUMMARY.md`
- `TIMELINE_REFACTOR_PLAN.md`
- `TOOLS_REVIEW.md`
- `QUICK_NOTE_IMPROVEMENT_BRAINSTORM.md`
- `BLOG_IMPROVEMENT_BRAINSTORM.md`
- `plans/unfinished-priority-plan.md`
- `docs/plans/2026-02-28-stocks-page-uiux-upgrade-design.md`
- `docs/plans/2026-02-28-stocks-page-uiux-upgrade-implementation.md`
- `docs/plans/2026-03-03-public-etf-profile-v2-design.md`
- `docs/plans/2026-03-03-public-etf-profile-v2-implementation.md`
- `docs/plans/2026-03-10-quick-note-center-design.md`
- `docs/plans/2026-03-10-quick-note-center-implementation.md`
- `docs/plans/2026-03-22-quicknote-tech-debt-consolidation-plan.md`
- `docs/plans/2026-03-22-quicknote-merge-implementation-checklist.md`
- `issues/2026-03-05-auth-session-expiry/issue.md`
- `issues/2026-03-05-auth-session-expiry/log.md`

## 狀態總表

| 文件 | 判定 | 結論 |
|---|---|---|
| `QUALITY_REVIEW.md` | 部分完成 | 部分修正已落地，但 lint/typecheck gate 仍不可靠 |
| `TECH_DEBT.md` | 部分完成 | 主要問題仍多數存在，尤其 lint、E2E、大檔案、`any` 與 console logging |
| `IMPROVEMENTS.md` | 部分完成 | Blog XSS 防護有落地，但 CSP、auth rate limit、全面型別收斂未完成 |
| `IMPLEMENTATION_SUMMARY.md` | 已過時 | 混有已完成與不存在檔案，且基礎資訊已有錯誤 |
| `TIMELINE_REFACTOR_PLAN.md` | 大致完成 | hydration gate、composable 抽離、型別整合已落地 |
| `TOOLS_REVIEW.md` | 部分完成 | ETF 強化已落地不少，但工具首頁仍未實作 |
| `QUICK_NOTE_IMPROVEMENT_BRAINSTORM.md` | 部分完成 | autosave / 模板 / 提醒已做，歷史面板未做且後續規劃已放棄 |
| `BLOG_IMPROVEMENT_BRAINSTORM.md` | 部分完成 | `NuxtImg`、list API slimming、`view=meta` 已做； blog cache 未做 |
| `plans/unfinished-priority-plan.md` | 已過時且未完成 | 來源文件缺失，失敗測試數字已過時，但 coverage/logger 目標仍未完成 |
| `docs/plans/2026-02-28-stocks-page-uiux-upgrade-*` | 已完成 | search / filters / quick sort / mobile emphasis / helper 已落地 |
| `docs/plans/2026-03-03-public-etf-profile-v2-*` | 已完成 | profile APIs、UI tabs、tests 均已存在 |
| `docs/plans/2026-03-10-quick-note-center-*` | 已完成 | modal 桌機置中樣式已落地 |
| `docs/plans/2026-03-22-quicknote-tech-debt-consolidation-plan.md` | 部分完成 | Phase 0 多數完成，Phase 1 合併只做到一半 |
| `docs/plans/2026-03-22-quicknote-merge-implementation-checklist.md` | 部分完成 | shared composer / editor / tests 已有，但 page shell 與 submit contract 仍未完全達標 |
| `issues/2026-03-05-auth-session-expiry/*` | 主要路徑已修 | refresh recovery 已落地，但 sliding session 等延伸風險仍未做 |

## 逐份審查

### 1. `QUALITY_REVIEW.md`

判定：部分完成

已落地：
- logout 清 legacy cookie 已完成，見 `server/utils/auth.ts:51` 與 `tests/unit/server/auth.cookies.test.ts:47`。
- diary tags round-trip 已完成，見 `server/api/diaries.post.ts:47`, `server/api/diaries.post.ts:77`, `server/api/diaries.get.ts:78`, `tests/api/diaries.test.ts:77`, `tests/api/diaries.test.ts:121`, `tests/api/diaries.test.ts:168`。

未完成：
- lint gate 仍幾乎失效，`eslint.config.mjs:8`, `eslint.config.mjs:9`, `eslint.config.mjs:12` 直接忽略了 `.vue`、`.ts`、`tests/**`。
- typecheck gate 仍不可信，`tsconfig.typecheck.json:4` 到 `tsconfig.typecheck.json:9` 排除了 `tests/**/*`、`server/**/*`、`nuxt.config.ts`、`scripts/**/*`、`docs/**/*`。

### 2. `TECH_DEBT.md`

判定：部分完成

仍然成立的問題：
- ESLint 配置問題仍存在，見 `eslint.config.mjs:3` 到 `eslint.config.mjs:16`。
- E2E 仍明顯不足，repo 只有 `tests/e2e/tools-responsive.spec.ts:1` 這一支檔案。
- 大檔案與多責任問題仍存在：
  - `components/Navigation.vue` 仍是大型導航 shell，見 `components/Navigation.vue:31` 到 `components/Navigation.vue:75`、`components/Navigation.vue:88` 之後整段模板。
  - `composables/useQuickNoteComposer.ts` 仍是單一大 composable，見 `composables/useQuickNoteComposer.ts:37` 到 `composables/useQuickNoteComposer.ts:250`。
- `any` 與散落 `console.*` 仍大量存在，例如 `pages/tools/etf.vue:48`、`server/api/diaries.post.ts:85`、`server/api/diaries.post.ts:101`、`server/api/blog/index.get.ts:139`。

### 3. `IMPROVEMENTS.md`

判定：部分完成

已落地：
- Blog 編輯器與文章頁已加入 DOMPurify，見 `components/BlogEditor.vue:132`, `components/BlogEditor.vue:165`, `components/BlogEditor.vue:240`。

未完成：
- 專案內未見 Content Security Policy 設定。
- auth endpoint rate limiting 未落地；目前 rate limiting 主要出現在 stocks / etf 路徑，而非 auth。
- 「移除 `any` types」未完成，repo 仍有大量 `any`。

### 4. `IMPLEMENTATION_SUMMARY.md`

判定：已過時

明顯不準確：
- 文件仍寫 Nuxt 3，實際 `package.json` 為 Nuxt 4。
- 文件列出的檔案有多個不存在：
  - `composables/useBreakpoints.ts`（文件見 `IMPLEMENTATION_SUMMARY.md:20`）
  - `composables/useNavigationAnimation.ts`（文件見 `IMPLEMENTATION_SUMMARY.md:39`）
  - `components/HoldingCard.vue`（文件見 `IMPLEMENTATION_SUMMARY.md:54`）
  - `docker-compose.yml`（文件見 `IMPLEMENTATION_SUMMARY.md:166`）

仍然有參考價值：
- timeline / testing / performance 類待辦方向大致符合現況。

### 5. `TIMELINE_REFACTOR_PLAN.md`

判定：大致完成

已落地：
- timeline page 已抽成薄頁面，見 `pages/timeline/index.vue:193` 到 `pages/timeline/index.vue:205`。
- hydration gate 與 `loadMore` 保護已在 composable，見 `composables/useTimelineDiaries.ts:19` 到 `composables/useTimelineDiaries.ts:24`、`composables/useTimelineDiaries.ts:55` 到 `composables/useTimelineDiaries.ts:77`。
- group-by-month / filter / pagination 也都在 composable，見 `composables/useTimelineDiaries.ts:79` 到 `composables/useTimelineDiaries.ts:149`。

未完成或未見證據：
- `IMPLEMENTATION_SUMMARY.md` 裡提到的虛擬滾動、手勢增強、搜尋功能仍未見。

### 6. `TOOLS_REVIEW.md`

判定：部分完成

已落地：
- ETF 工具已大幅擴充，包含 risk / valuation / rs tabs，見 `pages/tools/etf.vue:16`, `pages/tools/etf.vue:91`, `pages/tools/etf.vue:574`, `pages/tools/etf.vue:605`, `pages/tools/etf.vue:632`。

未完成：
- 文件中的 P0 工具首頁 `pages/tools/index.vue` 仍不存在。
- 導航仍是直接列出各工具，見 `components/Navigation.vue:56` 到 `components/Navigation.vue:70`。

### 7. `QUICK_NOTE_IMPROVEMENT_BRAINSTORM.md`

判定：部分完成

已落地：
- autosave / draft restore：`composables/useQuickNoteComposer.ts:128` 到 `composables/useQuickNoteComposer.ts:142`。
- 模板與非破壞性套用：`composables/useQuickNoteComposer.ts:144` 到 `composables/useQuickNoteComposer.ts:220`。
- reminder：`composables/useQuickNoteComposer.ts:223` 到 `composables/useQuickNoteComposer.ts:238`。

未完成：
- 「歷史記錄面板」未做；目前 `pages/diaries/quick.vue:9` 到 `pages/diaries/quick.vue:10` 只掛一個 `QuickDiaryOneLiner`。

補充：
- 之後的 merge checklist 已明確放棄 quicknote history panel，因此這一項應視為「需求變更後不做」，而不是單純延後。

### 8. `BLOG_IMPROVEMENT_BRAINSTORM.md`

判定：部分完成

已落地：
- list API 已排除 `content`，見 `server/api/blog/index.get.ts:98` 到 `server/api/blog/index.get.ts:123`。
- `view=meta` 已存在，見 `server/api/blog/[slug].get.ts:25` 到 `server/api/blog/[slug].get.ts:45`。
- `NuxtImg` 已實際用在 blog 卡片，見 `components/BlogCard.vue:23` 到 `components/BlogCard.vue:34`。

未完成：
- blog API 尚未使用 `cachedEventHandler`。
- 仍有舊式 `console.error`，見 `server/api/blog/index.get.ts:139`, `server/api/blog/[slug].get.ts:67`。

### 9. `docs/plans/2026-03-22-quicknote-tech-debt-consolidation-plan.md`

判定：部分完成

Phase 0 已落地：
- logout legacy cookie cleanup：`server/utils/auth.ts:51` 到 `server/utils/auth.ts:56`。
- diary tags persistence / response shape：`server/api/diaries.post.ts:47` 到 `server/api/diaries.post.ts:78`、`server/api/diaries.get.ts:74` 到 `server/api/diaries.get.ts:84`。

Phase 1 部分完成：
- shared composer 存在：`composables/useQuickNoteComposer.ts:37`。
- modal 與 page 兩邊都用 shared editor/composer：
  - `components/QuickDiaryModal.vue:88` 到 `components/QuickDiaryModal.vue:120`
  - `components/QuickDiaryOneLiner.vue:27` 到 `components/QuickDiaryOneLiner.vue:56`

仍未完成：
- auth / error / observability 沒有真正統一，repo 仍有大量 page-level / API-level `console.*`。

### 10. `docs/plans/2026-03-22-quicknote-merge-implementation-checklist.md`

判定：部分完成

已完成：
- tests 已存在：
  - `tests/composables/useQuickNoteSubmit.test.ts`
  - `tests/composables/useQuickNoteComposer.test.ts`
  - `tests/components/QuickDiaryModal.test.ts`
  - `tests/components/QuickDiaryOneLiner.test.ts`
  - `tests/components/QuickNoteEditorCore.test.ts`
- shared composer / editor core / template assistant 已落地。

未完成：
- `useQuickNoteSubmit.ts:3` 到 `useQuickNoteSubmit.ts:21` 仍只接受 `title/content/date/tags`，且直接硬編碼 `appendToToday: true`，沒有 checklist 想要的 `saveMode`、`templateKind`、`templateData` 正規 contract。
- `pages/diaries/quick.vue:9` 到 `pages/diaries/quick.vue:10` 仍是薄包一層 `QuickDiaryOneLiner`，但還沒完成 checklist 所說的 page-shell 重構驗證。
- `tests/unit/pages/diaries-quick.test.ts` 不存在。

### 11. `docs/plans/2026-03-10-quick-note-center-*`

判定：已完成

證據：
- modal wrapper 已有 `sm:items-center`，見 `components/QuickDiaryModal.vue:18`。
- modal panel 已有 `sm:mx-auto sm:max-w-3xl`，見 `components/QuickDiaryModal.vue:44`。

### 12. `docs/plans/2026-03-03-public-etf-profile-v2-*`

判定：已完成

證據：
- profile API：`server/api/etf/[symbol]/profile.get.ts:6` 到 `server/api/etf/[symbol]/profile.get.ts:35`
- RS API validation：`server/api/etf/[symbol]/rs.get.ts:6` 到 `server/api/etf/[symbol]/rs.get.ts:37`
- UI tabs：`pages/tools/etf.vue:574` 到 `pages/tools/etf.vue:659`
- tests：`tests/unit/server/etf-profile-api.test.ts:27` 到 `tests/unit/server/etf-profile-api.test.ts:46`

### 13. `docs/plans/2026-02-28-stocks-page-uiux-upgrade-*`

判定：已完成

證據：
- 搜尋 / filter / quick sort controls：`pages/stocks/index.vue:64` 到 `pages/stocks/index.vue:137`
- helper pipeline：`lib/stocks-view.ts:36` 到 `lib/stocks-view.ts:109`
- page integration：`pages/stocks/index.vue:511` 到 `pages/stocks/index.vue:583`
- mobile emphasis：`pages/stocks/index.vue:431` 到 `pages/stocks/index.vue:444`

### 14. `plans/unfinished-priority-plan.md`

判定：已過時且未完成

問題：
- 只剩這一份 `plans/*` 文件，卻引用了不存在的來源文件：
  - `plans/test-coverage-plan.md`
  - `plans/logger-error-handling-design.md`
  - `plans/product-priority-roadmap.md`
- 「56 failures / 7 files」明顯已過時。

仍有效的方向：
- coverage gate 仍未建立。
- logger/error handling 全面收斂仍未完成；repo 仍有大量 `console.*`。

### 15. `issues/2026-03-05-auth-session-expiry/*`

判定：主要路徑已修，延伸改善未做

已落地：
- middleware 已在 access token 失效時嘗試 refresh recovery，見 `server/middleware/auth.ts:27` 到 `server/middleware/auth.ts:64`。
- refresh endpoint 會補發 access token，見 `server/api/auth/refresh.post.ts:17` 到 `server/api/auth/refresh.post.ts:44`。

未完成：
- sliding session / refresh token rotation 仍未見。
- cookie policy 是否適配跨網域部署，仍需依真實部署驗證。

## 參考 / 操作文件的過時情況

### `TECHNICAL_DOC.md`

判定：部分過時

明顯過時點：
- 記載 `layouts/authenticated.vue`，見 `TECHNICAL_DOC.md:36` 到 `TECHNICAL_DOC.md:38`，但實際 repo 無此檔。
- 記載 `docker-compose.yml`，見 `TECHNICAL_DOC.md:89` 到 `TECHNICAL_DOC.md:91`，實際 repo 無此檔。

### `docs/TESTING.md`

判定：高度過時

問題：
- 文件描述的 tests tree 與現況不符，見 `docs/TESTING.md:9` 到 `docs/TESTING.md:44`。
- 覆蓋率數字 `~2%` 也已不可信，見 `docs/TESTING.md:96` 到 `docs/TESTING.md:104`。
- Git hooks / Codecov / CI gate 是目標描述，不是 repo 現況。

### `docs/HEALTH_CHECK.md`

判定：可用，但不能視為嚴格品質保證

問題：
- health check 腳本存在，但 TypeScript 檢查使用 `|| true`，見 `scripts/health-check.ts:121`，代表某些錯誤可能只被吞掉而不阻擋流程。

### `docs/DOCKER_DEPLOYMENT.md`

判定：大致可用

證據：
- 專案確實有多階段 Docker build，見 `Dockerfile:1` 到 `Dockerfile:80`。
- 也有建置與推送腳本，見 `scripts/build-and-push-docker.sh:68` 到 `scripts/build-and-push-docker.sh:139`。

## 建議保留與刪修

### 建議保留並持續更新

- `TIMELINE_REFACTOR_PLAN.md`
- `docs/plans/2026-02-28-stocks-page-uiux-upgrade-*`
- `docs/plans/2026-03-03-public-etf-profile-v2-*`
- `docs/plans/2026-03-22-quicknote-tech-debt-consolidation-plan.md`

### 建議合併或標記為過時

- `IMPLEMENTATION_SUMMARY.md`
- `TECHNICAL_DOC.md`
- `docs/TESTING.md`
- `plans/unfinished-priority-plan.md`

## 建議下一步

1. 先修工程守門機制：
   - 重做 ESLint flat config。
   - 讓 typecheck 真正覆蓋 server 與主要頁面。
   - 補 coverage gate。
2. 再處理 quicknote 收尾：
   - 補齊 `saveMode` contract。
   - 完成 page shell 收斂。
3. 最後清文件：
   - 把 `IMPLEMENTATION_SUMMARY.md`、`TECHNICAL_DOC.md`、`docs/TESTING.md` 的錯誤內容移除或標 `deprecated`。
