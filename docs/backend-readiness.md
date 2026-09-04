# Backend Ready v1 Audit & Implementation Spec

Audit baseline: `main@86994a7`（2026-09-01）

> Backend Ready v1：任何新 client 只依賴正式 API contract，就可以完整實作 Invest Diary 核心功能，不需要知道 Nuxt、Vue 或 Prisma 內部實作，而且正常情況下不需要 breaking API redesign。

本文件保留 2026-09-01 的 audit baseline，並在本文前段記錄目前的實作與
release-gate evidence。Current release-gate section 是現況真相；後面的 baseline 章節
是歷史判斷，不應再當成未完成 blocker。React Native/Expo UI 仍不在本批範圍。

## Current release-gate evidence（2026-09-05）

Status: **Backend Ready v1 implementation complete; release gate verified in this worktree.**

Supported production path: **K3s + MariaDB 11.4**. Prisma continues to use its `mysql`
provider name. CapRover/standalone Docker and external MySQL instructions are legacy
references only; they are not v1 production support until a separate engine matrix exists.

Stable API policy: the frozen core `/api/**` surface is v1. Future breaking changes use a
documented deprecation window or `/api/v2/**`; no duplicate `/api/v1/**` route tree is created.
The checked-in OpenAPI 3.1 artifact and generated transport are derived from canonical Zod
contracts under `lib/contracts/`.

### Testing reliability hardening addendum（2026-09-05）

本批 testing hardening 已把高風險邊界拆成可重現 gate：

- E2E global setup 使用 `mariadb:11.4` disposable container、動態 loopback
  port、`diary_e2e_` name guard、migration lifecycle；auth helper 以
  per-test user 同 forwarded identity 隔離 login rate-limit。
- `npm run typecheck:tests` 保持 inherited `strict` 與
  `noUncheckedIndexedAccess`，只納入新增及 critical changed tests。舊 test
  tree 仍有廣泛 fixture/mock typing baseline，沒有用數十個 `!` 或機械式
  rewrite 假裝清零；其錯誤分類記錄於本節後方的 baseline note。
- `npm run test:socketio` 執行真正的 `createSocketServer()` + Node listener +
  `socket.io-client` contract；一般 `npm test` 只在未設定
  `SOCKET_IO_INTEGRATION=1` 時跳過這個需要 bind loopback 的環境 gate。
- `npm run test:diary-reconciliation:mysql`、
  `npm run test:backend-http:mariadb`、
  `npm run test:market-rotation:mysql` 均固定 MariaDB 11.4、loopback/test-name
  guard、migration readiness/version check 及 trap cleanup。
- Runtime config、error hook、observability、shared `serialize()`、Cron/HTTP
  batch dispatch、Yahoo provider seam 均有 regression/contract tests；Forgejo
  對 PR 保持 fast `quality` path，push 到 `main` 則要求完整 E2E 通過後才可
  build/push/deploy。

**Typecheck baseline note:** production `npm run typecheck` 與 critical test
allowlist 是 gate；完整 legacy tree 的未收斂 errors 主要集中於舊 Nuxt
`tests/vi-setup` globals、Prisma mocked query fixtures（diary read/write、
admin middleware、market rotation monitor、trade analytics、recurring alerts、
partner compare、auth/CSRF middleware）、部分 script registry 的 Zod/readonly
型別，以及未納入本輪 critical allowlist 的測試陣列索引。這些是後續分階段
baseline，不是本輪用 assertion 改寫掩蓋的 pass。

### Verification matrix

| Gate | Evidence |
| --- | --- |
| Unit/API/integration suite | `npm test -- --reporter=dot` — see the latest CI run for exact count; environment-gated real DB/Socket contracts run as separate commands |
| Lint and types | `npm run lint --silent`; `npm run typecheck --silent`; `npm run typecheck:tests` — production and critical-test gates |
| Production build | `npm run build` — passed |
| Documentation | `npm run docs:check` — passed |
| OpenAPI/client drift | `npm run openapi:check`; `npm run openapi:breaking`; `npm run client:smoke` — passed |
| Migration + real HTTP/DB boundaries | `npm run test:backend-http:mariadb`; `npm run test:diary-reconciliation:mysql`; `npm run test:market-rotation:mysql` — disposable MariaDB 11.4 gates |
| Real Socket.IO | `npm run test:socketio` — production server construction, handshake, rooms, events and BigInt wire contract |
| Playwright release gate | `npm run test:e2e` — required for every push to `main`; disposable MariaDB 11.4 and Chromium |
| Production error signal | K3s app/CronJob `LOG_FORMAT=json` → collector rule on `level == "ERROR"`; `ErrorTrackingSink` is optional secondary telemetry |
| Worktree hygiene | `git diff --check`; `bash -n scripts/test-backend-http-mariadb.sh` — passed; no migration harness debug residue |
| Second-pass review | Claude Code `glm-5.3[1M]` focused read-only review — `VERDICT: PASS`, `NONE` actionable findings |

### Final reliability disposition（2026-09-05）

本輪 final hardening 的 disposition：

- **Closed**：blog `FULLTEXT` index/query contract、recurring alert dismissal
  semantics、BigInt raw wire boundary、Cron/HTTP batch/domain divergence、
  production structured `ERROR` signal path，以及 Playwright E2E 作為 `main`
  push 的 deploy gate。
- **Accepted constraints**：K3s app 維持 `replicas: 1`、`strategy: Recreate`，
  manifest 明確啟用唯一 `SCHEDULER_ENABLED=true`；WebSocket broadcaster 與
  market-data cache 仍為 process-local；Yahoo 維持單一 provider seam。
- **Reviewed and intentionally unchanged**：runtime config 不做 process-level
  cache，因 tests 會改動 `process.env`，且 Nuxt build/runtime 有不同讀取時機；
  目前沒有 performance blocker。Recurring alert 仍只在 create-time
  materialize children，沒有另加 lazy future path；root/child dismissal 和
  active-list/scheduler parent guards 維持既有語義。
- **Remaining**：只保留選定的 MariaDB integration coverage gaps。Redis、BullMQ、
  distributed lock、leader election、microservice split 或 speculative
  fallback provider 不在本輪，也不再以架構 hardening 為下一個工作目標。

這個 disposition 是本輪停止條件：下一輪回到 product work；只有真實水平擴展需求、
新的 runtime incident，或明確選定的 MariaDB coverage gap，才重新開啟相應設計。

### Contract and compatibility decisions

- Calendar Date is `YYYY-MM-DD`; Instants are UTC RFC 3339 values ending in `Z`; public IDs
  are decimal strings; persisted Decimal values are JSON strings unless a bounded portfolio
  display projection explicitly defines a number.
- Management lists use bounded offset envelopes or bounded full lists; the merged Investment
  Activity feed uses the `{ data, pagination: { nextCursor, hasMore, asOf } }` cursor envelope.
- Diary Review remains one mutable post-mortem per Diary. Thesis Review remains append-only
  history under Investment Thesis; the two aggregates do not share a lifecycle or API.
- `DiaryCreatedVia.TELEGRAM_BOT` remains readable historical provenance. Telegram runtime
  routes, tables, packages, secrets, and scheduler behavior remain removed.
- Compatibility entrypoints are retained only where current Web callers or operational
  tooling still use them; exact usage audits are recorded in the completed issue comments.

## 1. Historical Executive Summary（2026-09-01 baseline）

現有 backend 不是爛地基。Web cookie auth、Bearer access JWT、API key、fail-closed credential resolution、transport-aware CSRF、BigInt serialization、集中 error hook，以及主要 query modules 都已存在。先前 `.scratch/app-ready-auth-api/` 十張票也確實完成了大部分安全基線。

但目前仍不能宣告 Backend Ready v1：

1. Native 雖可用 Bearer access JWT 呼叫 API，卻沒有正式 JSON login/refresh/logout、rotation、replay 與 device-session contract。
2. `lib/contracts/` 只完整覆蓋少數 domain；auth、Thesis、Trade Plan、Alert、Watchlist、Timeline、Company Hub、market 等 contract 仍散落。
3. Runtime 與宣告已 drift：`diaryListParamsSchema` 存在，`/api/diaries` 卻手動 parse，並接受 schema 未記錄的 legacy `days`。
4. Calendar Date 仍常以 ISO instant 對外，mobile/web 會各自猜 timezone semantics。
5. Diary Review、Trade Plan、recurring Alert 與跨 parent ownership 主要只靠 TypeScript/Zod，DB 可接受非法狀態。
6. 大量「integration」測試是 mocked handler invocation，不是真實 HTTP wire test。
7. Forgejo deploy workflow 完全沒有 lint、typecheck 或 test gate；即使日後生成 OpenAPI，現時 CI 也不會阻止 contract drift。

**Overall backend readiness: 6.2/10 — Partially Ready。** 現在應先 incremental freeze contract/schema，不應直接開 React Native，也完全不需要換 Nuxt/Nitro。

## 2. Baseline Architecture（historical）

```text
Web cookie       Future Native Bearer       Agent API key
    \                    |                       /
       fail-closed credential resolution
                       ↓
             transport-aware CSRF
                       ↓
               server/api/** handler
              / manual parse | Zod \
                       ↓
                server/utils/**
                       ↓
                 Prisma / MySQL
                       ↓
            mapper and/or serialize()
                       ↓
                  JSON response
```

現況距離目標主要差兩步：request 必須由 canonical runtime schema 驅動；response 必須經 explicit mapper + canonical response schema，而不是只靠 `serialize()` 與 type assertion。現有 `server/utils/**` 已是足夠的 application seam，不需要新增 RepositoryFactory/Interactor 等抽象俄羅斯娃娃。

## 3. Historical Backend Readiness Score

| Area | Score | Status | Evidence summary |
| --- | ---: | --- | --- |
| Overall | **6.2/10** | Partially Ready | Web 穩定；Native session、全域 contract、DB freeze、HTTP tests 未完成 |
| Auth | **6/10** | Blocking | Bearer Ready；Native login/refresh/logout/rotation Blocking |
| Contracts | **5/10** | Partially Ready | contract layer 只覆蓋少數 domain，Diary runtime仍 drift |
| Domain stability | **8/10** | Ready / Partial | Diary Review / Thesis Review 邊界清楚；DB lifecycle未鎖死 |
| Database integrity | **6/10** | Partially Ready | 主要 FK/index/Thesis enum良好；review/status/ownership有缺口 |
| Testing | **5/10** | Partially Ready | 數量多，但缺 production-like HTTP boundary suite，CI亦不執行測試 |
| Mobile compatibility | **5/10** | Blocking | Resource API收 Bearer；Native無 session lifecycle |
| ID serialization | **8/10** | Ready / Partial | BigInt runtime一致轉 string；缺全域 response schema guard |
| Date/time | **5/10** | Blocking | timezone utilities良好；Calendar Date wire不明確 |
| Error contract | **7/10** | Partially Ready | H3 envelope/requestId Ready；多個 resource仍用 SYS_NOT_FOUND |
| Pagination | **5/10** | Partially Ready | Diaries offset、Activity cursor可用；其餘漂移或缺失 |

本次定向執行 13 個關鍵 test files、102 tests，全數通過。這證明既有 guard 沒壞，但不能替代真實 HTTP suite。

## 4. Confirmed Blockers at Baseline

### B1. Native auth session protocol

**Blocking / P0**

- `server/api/auth/login.post.ts:53-73` 生成 access/refresh token，但只 set cookie，response不回 token。
- `server/api/auth/refresh.post.ts:11-44` 只讀 refresh cookie、只 set access cookie、只回 `{ ok: true }`。
- `server/api/auth/logout.post.ts:7-24` 只讀/清 cookie。
- `prisma/schema.prisma:123-134` 的 RefreshToken 無 clientType、family、revocation/replacement lineage。

Native 必須有正式 JSON token lifecycle；不可要求 React Native 模擬 browser cookie jar。

### B2. Refresh rotation/reuse semantics

**Blocking / P0**

`.scratch/app-ready-auth-api/PLAN.md` 已拍板 native no-grace rotation，但未定義 family identity、replacement lineage、revokedAt/reason、stale token replay 後是否撤銷 descendant，以及 one-device/all-device logout。

建議：每次 native login建立獨立 family；A→B在同一 transaction revoke A並 insert B；重用 A 時 revoke 該 family active tokens，不影響其他裝置。Access token暫維持無 sid、最多存活現有 1h，是 v1可接受 trade-off。

### B3. Canonical contracts不足

**Blocking / P0**

- `lib/contracts/` 未覆蓋 auth、Thesis、Trade Plan、Alert、watchlist、Timeline、Company Hub、market core schemas。
- `types/reviews.ts:1-10` 的 client wire type import `server/utils/diary-read`。
- `types/portfolio-attention.ts:1-10` 依賴 internal lib implementation types。
- `types/diary.ts:31-87` 手工 mirror Prisma；`server/utils/diary-write.ts` 多次 `as unknown as DiaryRecord`。

現在生成 OpenAPI只會把漂移包裝成漂亮文件，並不可信。

### B4. Calendar Date / Instant未分離

**Blocking / P0**

- Diary date 是 business calendar date，DB以 UTC noon儲存（`prisma/schema.prisma:168-169`、`lib/dates/normalize.ts:45-74`），但 public response只寫 string，實際常成 ISO instant。
- `server/utils/investment-activity.ts:100-103` 明確把 Diary date輸出 `toISOString()`。
- Trade Plan linked diary、Company Hub related diary、Stock Note與 market trading date同樣缺 format-level contract。

### B5. DB可接受主要非法狀態

**Blocking for Backend Ready DoD / P0**

- Diary `reviewStatus/reviewOutcome` 是 nullable String（`schema.prisma:153-159`），runtime vocabulary已在 `lib/contracts/review`。
- TradePlan `status` 是 String（`schema.prisma:199-223`），只在 Zod限制。
- Alert `recurringMode` 是 String、`parentId` 無 self relation（`schema.prisma:268-283`）。
- Transaction/TradePlan/ThesisReview冗餘 userId可與 parent owner不一致。

## 5. Tech Debt Findings

### P0 — must finish before RN

- Native session issuance、rotation、replay與 revocation。
- Canonical request/response schemas覆蓋所有 core domain。
- Calendar Date/Instant wire policy。
- Diary Review、Trade Plan、recurring Alert與 ownership DB constraints。
- `/api/diaries` runtime contract convergence與 legacy `days` 決定。
- 真實 Nitro + MySQL HTTP contract suite。
- OpenAPI artifact + generated client proof。
- Forgejo CI執行 lint、typecheck、核心 test與 contract drift gate。

### P1 — should finish before RN

- Trade Plan、Thesis、Price Alert、API Key、Watchlist等 resource-specific error codes。
- Trade Plans、Alerts、Stock Timeline、Thesis Reviews pagination/upper-bound決定。
- 明訂 auth Origin/CSRF policy；`/api/auth*` 目前 blanket skip。
- 決定 JWT iss/aud；清理不可達 expired refresh-row cleanup。
- 收斂成功 response conventions，但不為美觀全面重包。
- 對齊 deployment/API docs與實際行為。

### P2 — can coexist with RN

- 一次過替換所有 Web raw `$fetch()`。
- 統一所有成功 envelope。
- WebSocket bearer handshake與 push delivery。
- 全部 list強制 cursor。
- UI/CSS/無關 Vue refactor。
- 無第二個 caller的「clean architecture」抽象。

## 6. Auth Readiness

### Ready

- Bearer access token：`server/middleware/auth.ts:85-121`；`/api/auth/me` 有 Bearer integration guard。
- Credential precedence：explicit credential優先；invalid不 fallback cookie；ambiguous reject。見 ADR-0006。
- Cookie：HttpOnly、production Secure、SameSite Strict；access 1h、refresh 30d（`server/utils/auth.ts:11-45`）。
- JWT：HS256 allowlist、expiry與 required claims runtime validation（`lib/jwt.ts:85-109`）。
- Login/Register已有 IP + identity兩級 rate limit（`server/api/auth/login.post.ts:18-34`、`register.post.ts:17-35`）。Native endpoints只需延伸現有 policy，不是另起爐灶。
- API key：不灌 unrestricted `context.user`，仍需 endpoint scope（`server/middleware/auth.ts:54-57`）。
- Web multi-session：每次 login獨立 refresh row；logout刪目前 refresh；改密碼 transaction內 tokenVersion++並刪全部 refresh（`server/utils/user-queries.ts:223-232`）。

### Partially Ready

- `/api/auth` 全 path跳過 CSRF（`server/middleware/csrf.ts:9,60-63`），主要靠 SameSite Strict。v1需明訂 Origin/Referer policy。
- Web refresh刻意 stable以避 cross-tab race；可保留給 web，但不可複製到 native。
- JWT無 iss/aud；單 issuer現況可接受，freeze前應決定。
- `JWT_SECRET=CHANGE_THIS_RANDOM_SECRET` 目前只寫 error log仍會啟動（`lib/jwt.ts:42-44`）；v1前必須 fail-fast。

### Native target contract

```text
POST /api/auth/native/login
  { email, password, deviceName? }
  -> { accessToken, refreshToken, accessTokenExpiresAt,
       refreshTokenExpiresAt, user }

POST /api/auth/native/refresh
  { refreshToken } -> rotated token pair

POST /api/auth/native/logout
  { refreshToken } -> idempotent current-session revoke

POST /api/auth/logout-all
  authenticated request -> tokenVersion++ + revoke all families
```

Client採 single-flight refresh；任一401 → refresh一次 → retry一次 → 再失敗 logout。Refresh token只存 SecureStore，access token存 memory。

## 7. API Contract Audit（historical baseline）

| Domain | Status | Confirmed state |
| --- | --- | --- |
| Auth | Blocking | Web有效；Native lifecycle缺失；schemas未進 contracts |
| Diaries | Partially Ready | CRUD/ownership/serialization有 guard；list runtime drift；write無完整 Zod object |
| Diary Review | Partially Ready | PATCH用 canonical Zod；response schema/DB enum未 freeze |
| Stocks/Watchlist | Partially Ready | symbol/source SSOT Ready；response schemas散落，pagination manual |
| Investment Thesis | Partially Ready | domain/query mapper良好；route-local schemas與 types未 canonicalize |
| Thesis Review | Partially Ready | append-only API良好；schema/ownership invariant缺失 |
| Trade Plans | Partially Ready | write Zod與 ownership良好；DB String、無 pagination；Trade Plan Decimal為 string，但 Activity transaction Decimal為 number |
| Alerts | Partially Ready | validation/query layer有；recurring DB invariant、pagination、canonical schemas缺失 |
| Timeline/Activity | Partially Ready | Investment Activity有 cursor；Stock Timeline只有 limit；compat alias存在 |
| Research/Company Hub | Partially Ready | aggregation resource合理；只有 TS response type，無 runtime schema |
| API Keys | Partially Ready | hashing/scope/revoke Ready；public schemas/error codes未 canonicalize |
| Market | Partially Ready | domain logic成熟；query/response conventions與 contracts分散 |

### Confirmed Diary drift（resolved in the current release gate）

- `lib/contracts/diary/index.ts:57-65` 定義 `diaryListParamsSchema`。
- `server/api/diaries.get.ts:34-76` 手動 parse，未呼叫 schema。
- handler接受 `days`（:44-46），canonical schema/API docs未列。
- `DiariesApiResponse` compatibility alias and the manual `DiaryRecord` mirror were removed;
  current callers use canonical Diary contracts and explicit mappers.

先決定 `days` 是正式 filter或移除；無 current Web caller則 deprecated一個 release window。Runtime handler之後只能 parse canonical schema，別再讓 schema當牆上掛畫。

### Contract rules

- BigInt ID → decimal string。
- Decimal → string，除非個別欄位明確定義 bounded number。現況 Trade Plan經 `serialize()` 輸出 string，Investment Activity卻把 transaction quantity/price轉 number；freeze前要選定並遷移 caller。
- Calendar Date → YYYY-MM-DD。
- Instant → UTC RFC 3339。
- enum → canonical literal。
- nullable與 optional分開。
- response mapper必須在 production path，並由 response schema/contract test驗證。

## 8. Domain Model Audit

### Diary Review

保留，定位為一次 Diary／investment decision 的 post-mortem：

- root = Diary；每篇0..1個 current review。
- lifecycle = none → pending → reviewed；可再次編輯，不建立 company history。
- scope = 當次 thesis/risk/execution/outcome/learning/adjustment。
- evidence：`server/utils/diary-review.ts:76-94` 更新同一 Diary。

### Thesis Review

保留，定位為 company Investment Thesis 的 append-only歷史評估：

- root = Investment Thesis；每 user/company一個 current projection。
- 一個 Thesis有0..N reviews。
- review建立 snapshot並更新 current latest review fields；歷史 review不改。
- scope = thesis health、change、invalidation、portfolio decision。
- evidence：`prisma/schema.prisma:523-579`、`investment-thesis-queries.ts:233-264`。

共用 INTACT/PARTIAL/INVALIDATED/UNCLEAR 是刻意共用 outcome vocabulary，不代表同一 aggregate。為少 code強行合併會把 domain攪成一鍋粥。

## 9. Database Integrity Audit

### Ready

- 主要 FK/cascade普遍存在。
- Diary user/date unique、Investment Thesis user/stock unique。
- Thesis status/outcome/portfolio decision已是 DB enum。
- Watchlist與 market snapshot unique/index合理。
- Telegram runtime tables已有 forward migration移除。

### Must harden

1. Diary Review status/outcome enum + lifecycle CHECK。
2. TradePlan status enum。
3. Alert recurringMode enum + parent self-FK/series invariant。
4. Transaction、TradePlan、ThesisReview parent-owner composite invariant。
5. Investment Thesis ACTIVE required fields及 status/timestamps CHECK。
6. Price Alert isTriggered/triggeredAt consistency CHECK。

Migration順序：read-only data audit → remediation mapping → backfill → add enum/FK/CHECK/NOT NULL → migration tests → deploy strict API → compatibility removal。禁止讓 MySQL-compatible engine默默截斷未知 enum值。

實際 K3s production manifest使用 MariaDB 11.4（`k8s/02b-mariadb-deployment.yaml:19-20`），而 CapRover文件/設定指向 MySQL。Prisma provider雖名為 `mysql`，enum、CHECK、ALTER與 strict-mode migration必須至少在 MariaDB 11.4驗證；若 CapRover/MySQL仍是正式 supported path，亦要在指定 MySQL版本跑同一 migration matrix。

## 10. ID / Date / Pagination / Error Semantics

### ID

```json
{ \"id\": \"123456789012345678\" }
```

所有 public/nested/foreign ID皆為 base-10 string。Path/body只接受正整數字串，不先轉 JS number。`serialize()` 是 safety net，response mapper/schema才是 contract。Runtime目前大致 Ready，未發現 BigInt ID轉 Number；缺口是 schema coverage與 legacy request unions。

### Date/time

| Class | Wire format | Examples |
| --- | --- | --- |
| Calendar Date | `YYYY-MM-DD` | Diary date、market trading date、related diary date |
| Instant | UTC RFC 3339（millisecond） | createdAt、updatedAt、reviewedAt、triggerAt、occurredAt |

Calendar Date不可輸出 storage-only UTC-noon。Instant永遠帶 Z。Client只做 display formatting，不重新定義 business date。`reviewDueAt` 若產品其實只關心 user-local day，freeze前應改成 reviewDueDate；不能兩邊猜。

### Pagination

- Offset/page：Diaries、Stock Notes等管理/search list。
- Cursor：Investment Activity/Timeline等 merged/insert-heavy feed。
- Bounded full list：Watchlist、active alerts等，但產品上限必須入 contract。

**Current wire並不一致：**

| Resource | Current shape | v1 action |
| --- | --- | --- |
| Diaries | `{ data, pagination: { page, limit, total, totalPages } }` | 保留並 canonicalize |
| Stock Notes | `{ notes, total, page, limit }` | freeze前遷移至 offset envelope |
| Investment Activity | `{ items, nextCursor, asOf }` | freeze前遷移至 cursor envelope，保留 `asOf` |
| Trade Plans / Alerts等 | full list或不完整 metadata | 決定 offset或明訂 bounded full list |

**v1 target：**Offset=`{ data, pagination: { page, limit, total, totalPages } }`；Cursor=`{ data, pagination: { nextCursor, hasMore, asOf? } }`。這是 freeze前的刻意 wire migration，不是對現況的描述。統一 envelope不代表把所有 list強制改 cursor；pagination strategy仍按資源實際使用選擇。所有 ordering加 ID tie-breaker。

### Error

保留 ADR-0007 H3 envelope：

```json
{
  \"statusCode\": 404,
  \"statusMessage\": \"Diary not found\",
  \"data\": {
    \"code\": \"DIARY_NOT_FOUND\",
    \"details\": null,
    \"requestId\": \"req_...\"
  }
}
```

Client只依 HTTP status + `data.code`。Message可改，code在同一 major version不可改語意。Validation=400、auth=401、capability=403、ownership secrecy/not found=404、conflict=409、rate limit=429、unexpected=500。為 Trade Plan、Thesis、Price Alert、API Key、Watchlist補 resource code，不再全部塞 SYS_NOT_FOUND。

## 11. OpenAPI & Generated Client Recommendation

```text
canonical Zod 4 schemas
      ↓ zod-openapi (build-time OpenAPI 3.1)
OpenAPI artifact
      ↓ openapi-typescript + openapi-fetch
generated transport client
      ↓ thin named domain facade
Web + future React Native
```

`zod-openapi` 原生支援 Zod 4/OpenAPI 3.1，不需要換 Nitro；`openapi-typescript` 產生 runtime-free types，`openapi-fetch` 提供 typed fetch。Named facade提供 `api.diaries.list()`、`api.diaries.get(id)`、`api.diaries.review(id,input)`、`api.stocks.get(symbol)`。

Phase 6先做小型 generation spike：現有 Diary query大量使用 `z.preprocess` 將 query string轉 number/string，generator未必能推斷真正 wire input。必要時以 wire-faithful string schema + transform、或明確 OpenAPI metadata重寫；不可只靠 `z.coerce`/推斷碰運氣。

參考：

- https://github.com/samchungy/zod-openapi
- https://openapi-ts.dev/introduction
- https://openapi-ts.dev/openapi-fetch/api

不引入 production Swagger UI，不由手寫 interface反猜 OpenAPI，不一次納入全部100+ routes。Artifact進 git並有 CI drift check。

## 12. Integration Test Gaps

目前 `tests/api/**` 與多數 `tests/integration/**` 直接 import handler並 mock H3/Prisma，不能證明 routing/middleware順序、real cookies/headers/status、serialized JSON、error hook、MySQL constraint或 generated client。

Target：真實 Nitro test server + isolated MariaDB 11.4 schema；若 MySQL仍是 supported deployment，migration suite另覆蓋指定 MySQL版本。核心 domain至少測 200/201、400、401、cross-user 404、必要的403/409/429、pagination、string ID、Calendar Date、Instant、error envelope。Auth另測 Web cookie、Native pair、A→B、A replay family revoke、one/all-device logout、credential precedence與CSRF。

（歷史 baseline，已由現行 release gate supersede。）當時
`.forgejo/workflows/build.yml` 只有 image build/push、Prisma artifact 檢查及
K3s deploy；目前已由 `quality` → `e2e` → `build-push-deploy` 的依賴鏈提供
PR 與 `main` push 的不同 gate。

## 13. Dead Code / Migration Residue（current disposition）

| Candidate | Classification | Disposition |
| --- | --- | --- |
| `components/PostMeta.vue` | Removed 2026-09-02 | exact usage audit found zero callers |
| `lib/errors/codes.ts` | Removed 2026-09-02 | production imports use canonical error contracts |
| `lib/stocks/timeline-source.ts` | Removed 2026-09-02 | production imports use canonical stock contracts |
| `DiariesApiResponse` | Removed 2026-09-02 | exact usage audit found zero callers after Diary convergence |
| `types/common.ts` | Not dead yet | compatibility export仍被多個 types使用 |
| `DiaryRecord` mirrors | Removed 2026-09-02 | client-facing types are canonical contract aliases |
| completed `.scratch/**` | Cleanup Only | tracker history，按 archive policy整理 |
| reconciliation scripts | Conditional | docs仍引用；確認所有環境完成後才 archive |

Telegram runtime removal是 Ready：routes/models/secrets/packages已移除，有 `telegram-removal-contract.test.ts` guard。`DiaryCreatedVia.TELEGRAM_BOT` 是歷史 provenance，新寫入只允 WEB/API_KEY，不是垃圾。

`docs/API.md` 仍是 selective handwritten reference且有 drift（例如 register duplicate status）。部署 docs需明確區分 CapRover/MySQL與 k8s/MariaDB supported path。

## 14. Target Backend Architecture

```text
HTTP request
  ↓ credential resolution + CSRF
canonical path/query/body Zod schemas
  ↓
existing focused application/query module
  ↓
Prisma/MySQL with domain constraints
  ↓
explicit mapper → canonical response schema
  ↓
H3 JSON + stable error contract
  ↓
OpenAPI 3.1 → generated TypeScript client
```

### Mobile aggregation

現在不新增 `/api/v1/app/today` 等 endpoints：Company Hub已有 `/api/stocks/:symbol/hub`，Review Queue已有 `/api/reviews`；目前沒有經 screen trace/profile證明任何核心 mobile畫面需要5–10個 serial/parallel requests。等 RN profiling證明 latency問題再考慮 aggregation，別先養一隻 BFF 寵物。

### Versioning

**Recommendation：Option A，現有 `/api/**` 正式視為 v1，暫時不搬 route。**

OpenAPI info.version=1.0.0；Backend Ready後 breaking change進未來 `/api/v2/**` 或走 deprecation window。今天建立 `/api/v1/**` 只會複製大量 handlers，沒有新增能力。Native update delay由 v1 freeze + future v2 coexistence處理。

## 15. Implementation Roadmap

### Phase 1 — Native auth protocol freeze

- Scope：ADR、family schema、native login/refresh/logout、rotation/replay、one/all revoke、延伸既有 rate limit、placeholder JWT secret fail-fast。
- Modules：`lib/contracts/auth`、JWT/auth-session/auth routes、Prisma migration、HTTP auth tests。
- Risk：High；web/native transport separation與 data backfill。
- Breaking：Web none；Native additive；DB internal breaking。
- Tests：real cookie/token flows、atomic A→B、replay、multi-device、precedence、CSRF。
- Exit：Native只靠 JSON+Bearer完成 session lifecycle；Web cookie不變。

### Phase 2 — Diary + Diary Review convergence

- Scope：runtime canonical schemas、legacy days、aliases、response mapper、Calendar Date、review response/error。
- Modules：Diary/Review contracts、routes/utils、types、Web callers，包含 `useTimelineDiaries` 與相關 timezone/date formatting utilities。
- Risk：Medium；date wire與 legacy removal。
- Breaking：Diary date ISO→YYYY-MM-DD；days若移除需 deprecation。
- Tests：HTTP CRUD/list/review、pagination、ID/date/error/cross-user/409。
- Exit：無 Prisma mirror leak、無 deprecated alias caller、runtime/contract一致。

### Phase 3 — Thesis domain/schema freeze

- Scope：Thesis/Review/Company Hub contracts、lifecycle/ownership constraints、append-only。
- Modules：new contracts、thesis routes/query mapper、types、Prisma/migration。
- Risk：High；legacy lifecycle與 owner mismatch。
- Breaking：invalid states不再接受。
- Tests：HTTP current thesis/review/history/cross-user + DB invalid state。
- Exit：兩套 Review責任在 contract/DB/tests一致。

### Phase 4 — Trade Plans + Alerts

- Scope：status enum、Decimal wire（包含 Activity transaction number/string drift）、pagination；recurring invariant；Price Alert schema/errors/pagination。
- Modules：contracts、routes/query modules、Prisma/migration、Web callers。
- Risk：Medium-High；enum/backfill/series data。
- Breaking：invalid state拒絕；list可能加入 pagination。
- Tests：HTTP CRUD、ownership、recurrence、ordering、ID/date/Decimal/error。
- Exit：DB拒絕主要非法狀態，mobile list語意穩定。

### Phase 5 — Stocks, Watchlist, Timeline, Market

- Scope：Stock/Notes/Watchlist/Timeline/Hub/Portfolio/market schemas；feed cursor或 bounded policy。
- Modules：`lib/contracts/stocks`、routes/mappers、types、Web consumers。
- Risk：Medium；surface大但多為 formalization。
- Breaking：只改已證實 date/pagination/alias drift。
- Tests：HTTP symbol/ownership/list/cursor/nested IDs/dates/market dates。
- Exit：core clients不 import internal types/server modules。

### Phase 6 — OpenAPI + generated client

- Scope：OpenAPI 3.1 generation spike（含 preprocess/wire-input fidelity）、build、CI drift、generated client、named facade、代表性 Web smoke migration。
- Modules：contract metadata/registry、generated artifact/client、scripts/CI/composables。
- Risk：Medium；schema strictness會揭露 drift。
- Breaking：previous phases完成則 none。
- Tests：OpenAPI validation、generated output check、real-server client smoke。
- Exit：named client methods可用，transport core不含 framework state。

### Phase 7 — Integration suite + v1 freeze

- Scope：Forgejo lint/typecheck/test gate、完整 HTTP matrix、breaking diff、version/deprecation policy、dead aliases、declare stable。
- Modules：HTTP harness、CI、API docs/ADRs、cleanup candidates。
- Risk：Low-Medium；主要是漏網 drift。
- Breaking：freeze前最後 cleanup。
- Tests：DoD matrix、MariaDB 11.4 migration；如正式支援則加指定 MySQL版本；build/typecheck/lint。
- Exit：DoD全勾，Backend v1正式 stable。

## 16. Backend Ready Definition of Done（current evidence above）

- [x] No obsolete Telegram runtime residue; historical provenance documented
- [x] No known dead public contract layer
- [x] All stable v1 public write inputs runtime validated by canonical schemas
- [x] All stable v1 list query params runtime validated
- [x] Stable v1 public responses runtime-schema validated
- [x] No v1 public contract imports Prisma/Vue/Nuxt/Node/server-only modules
- [x] Stable resource-specific machine error codes
- [x] `requestId` present on every error path
- [x] All stable v1 public/nested IDs are decimal strings
- [x] Calendar Date and Instant semantics consistent
- [x] No stable v1 Calendar Date leaks UTC-noon storage
- [x] Native bearer login/refresh/logout works end-to-end
- [x] Refresh rotation/replay/family/lost-response behavior tested
- [x] Logout-one and logout-all semantics frozen
- [x] Web cookie auth remains valid
- [x] Credential precedence and CSRF matrix green
- [x] Diary Review domain/lifecycle frozen
- [x] Thesis Review domain/append-only lifecycle frozen
- [x] DB states constrained for review/trade plan/alerts/thesis
- [x] DB rejects parent/owner mismatch
- [x] Pagination/filter/sort frozen per stable v1 resource
- [x] Stable ordering has deterministic tie-breakers
- [x] OpenAPI generation and generated client validated
- [x] Core HTTP tests run through Nitro + MariaDB 11.4
- [x] Core HTTP tests and migrations run against production MariaDB 11.4
- [x] Forgejo CI runs lint, typecheck and required test suites before deploy
- [x] OpenAPI/client drift check runs in CI
- [x] Breaking/deprecation/versioning policy documented
- [x] Current Web migrates incrementally
- [x] Backend v1 declared stable

The checks above are backed by the verification matrix at the start of this document;
the individual issue comments contain the narrower evidence for each vertical slice.

## 17. Files Expected To Change

- `docs/backend-readiness.md`、`docs/API.md`、`docs/adr/**`
- `lib/contracts/**`、`lib/jwt.ts`
- auth/diary/review/stock/trade-plan/alert/activity/selected market routes
- relevant `server/utils/**` mappers/query modules與 auth/csrf middleware
- `prisma/schema.prisma`、new migrations/data-audit scripts
- selected `types/**` 與 Web callers
- real HTTP test harness、existing tests、package scripts/CI/generated artifacts

不應改：React Native UI、Expo、navigation、push、CSS、unrelated Vue components。

## 18. Risks / Migration Notes

1. Web stable refresh與Native rotating refresh必須以 clientType分離。
2. 無 family/lineage不能處理 compromised stale refresh token。
3. Diary date改 YYYY-MM-DD 是正確但 breaking，需同 slice更新 Web。
4. MariaDB/MySQL enum/CHECK前必須 data audit，禁止未知值被靜默截斷；migration需在正式 supported engine/version驗證。
5. Composite owner FK可能需額外 unique index，先 audit/量測。
6. OpenAPI只有 runtime真的 parse同一 schema才可信。
7. 不維護 duplicate `/api` 與 `/api/v1` route trees。
8. Audit時既有 docs/CONTEXT/CLAUDE/README等 dirty changes屬使用者，implementation不得覆蓋。
9. Pagination v1 envelope是刻意 breaking migration；current與target shape必須在 ticket/API docs分開記錄。
10. Calendar Date改 YMD會影響現有 timezone sorting/grouping caller，不只是顯示 formatter。

## Recommended next task

不要再開新的 architecture hardening。下一輪回到 product work；若要處理
backend readiness，只做已選定的 MariaDB integration coverage gaps。Native auth
protocol 仍是未來產品 scope，不是本輪 release gate 的阻塞項目。
