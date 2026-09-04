# SEC Filings Downloader — Implementation Contract

Status: Complete — phases 1–8 implemented and regression-tested on 2026-07-15.

This document is the final contract for the public SEC Filings Downloader. It is intentionally limited to the current invest-diary repository and the official SEC EDGAR sources listed below.

## 1. Product and source boundary

- Public entry page: `/tools/sec-filings` (`requiresAuth: false`).
- Public filing detail page: `/tools/sec-filings/[cik]/[accession]` (`requiresAuth: false`).
- No database models, migrations, persisted filings, or persisted ZIP packages.
- No HTML-to-PDF conversion. A PDF action is shown only for a submitted `.pdf` document present in the SEC filing index.
- All upstream requests run in Nitro server code. Browser code calls only `/api/tools/sec-filings/**`.
- Allowed upstream origins are exactly:
  - `https://www.sec.gov/files/company_tickers_exchange.json`
  - `https://data.sec.gov/submissions/CIK##########.json`
  - historical segment names returned by a validated submissions response, resolved below `https://data.sec.gov/submissions/`
  - constructed paths below `https://www.sec.gov/Archives/edgar/data/`
- No caller-provided URL, host, path, or redirect target is ever fetched.

Official SEC facts used by this contract:

- Submissions JSON contains at least one year or 1,000 recent filings and advertises older segment files through its `files` array.
- Filing documents live below `/Archives/edgar/data/{cik}/{accessionWithoutDashes}/`.
- The SEC automated-access ceiling is 10 requests per second. This tool deliberately stays below it.

## 2. Runtime configuration and dependencies

Declare `SEC_USER_AGENT` in the centralized server runtime schema at
`server/config/env.ts`. The Nuxt config bridge exposes the validated value as
the server-only `runtimeConfig.secUserAgent`; SEC endpoint-level validation
remains because this optional setting is allowed to be absent at startup.

```ts
runtimeConfig: {
  secUserAgent: runtimeEnv.secUserAgent,
}
```

`.env.example` documents a value containing both application name and monitored contact email, for example:

```dotenv
SEC_USER_AGENT="Trade Basic SEC Filings contact@example.com"
```

Startup remains possible without the variable, but every SEC-backed endpoint returns the stable `SEC_CONFIG_MISSING` 503 error until it is configured. Never silently use a fake production contact.

Phase 6 may add one direct, maintained ZIP streaming dependency and its types. The implementation must not rely on an undeclared transitive package. Filing-index parsing should use the smallest maintained parser necessary; parsing behavior must be fixture-tested.

## 3. Canonical identifiers and validation

Shared Zod schemas live with `server/utils/sec-edgar/validation.ts` and are reused by handlers.

- CIK input: 1–10 ASCII digits; canonical response form is exactly 10 digits with leading zeroes. Archive paths use the same numeric CIK without leading zeroes.
- Accession: exactly `##########-##-######`; canonical directory form removes the two dashes.
- Ticker search: trim, Unicode-normalize, uppercase; allow SEC directory punctuation such as `.` and `-`, maximum 20 characters.
- Document basename: 1–255 ASCII characters; basename only; no slash, backslash, control character, null byte, `.`/`..`, percent-encoded octets, or Unicode lookalike path separator.
- Dates: strict `YYYY-MM-DD` calendar dates. `filedFrom <= filedTo` and `periodFrom <= periodTo`.
- Form: trim and uppercase. Supported quick filters are `10-K`, `10-Q`, `8-K`, `20-F`, `6-K`, `40-F`; an amendment is its exact `/A` variant. The API may return other forms when no form filter is selected.
- Amendment filter: `include` (default), `exclude`, or `only`.
- Paging limit: 1–100, default 50. Cursors are opaque, versioned base64url JSON generated only by the server and rejected when malformed or when filters/company do not match.

Every route validates decoded values again. A value previously emitted by this application is not treated as trusted input.

## 4. Public API contract

All JSON success responses use `{ data, meta }`. `meta` contains `stale`, `cacheStatus: 'miss' | 'hit' | 'stale'`, and `fetchedAt`. Download endpoints return bodies directly with safe `Content-Type`, `Content-Length` when known, `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`, and no-store caching.

### Company search

`GET /api/tools/sec-filings/companies?q={query}&limit={1..20}`

- Requires at least 1 trimmed character; CIK exact/prefix, ticker exact/prefix, then company-name token match determine rank.
- Exact ticker and exact canonical CIK rank above name results.
- Duplicate CIK rows are coalesced while retaining exchange/ticker pairs.
- Response data: `SecCompanySearchResult[]` with canonical CIK, name, tickers, exchanges, and `matchedBy`.

### Filing list

`GET /api/tools/sec-filings/companies/{cik}/filings`

Query: `forms` (comma-separated, maximum 20), `filedFrom`, `filedTo`, `periodFrom`, `periodTo`, `amendments`, `cursor`, `limit`.

- Merges recent filing columns with only the historical segments needed to satisfy the requested cursor/date range.
- Normalizes malformed or uneven SEC column arrays by ignoring incomplete rows rather than shifting values across columns.
- Sort is deterministic: filing date descending, acceptance time descending when available, accession descending.
- Response data contains company summary, filing rows, and `nextCursor`.
- Foreign issuer forms and amendments are ordinary rows, not special-case exclusions.

### Filing detail

`GET /api/tools/sec-filings/companies/{cik}/filings/{accession}`

- The accession must exist in the selected company's submissions history before archive metadata is fetched.
- Fetches the constructed filing index and directory index from SEC Archives.
- Returns the filing metadata plus every submitted file that is safe and present in the directory listing.
- `primaryDocument` comes only from the matching submissions row and must also exist in the filing directory.
- Documents expose a classification: `primary`, `complete-submission`, `xbrl`, `exhibit`, `pdf`, or `other`. A PDF can also be an exhibit; `isPdf` remains an independent boolean.
- File description/type/sequence come from the SEC filing index when available. Directory metadata is the authority for basename and byte size.

### Individual download

`GET /api/tools/sec-filings/companies/{cik}/filings/{accession}/documents/{basename}`

- Validates company, accession membership, and basename membership in the cached/refetched filing index before constructing the archive path.
- Proxies the SEC response as a stream. It never creates a `Buffer` containing the whole file.
- Primary HTML, complete submission TXT, XBRL, exhibits, and original PDF files all use this one route.

### Single-filing ZIP

`GET /api/tools/sec-filings/companies/{cik}/filings/{accession}/package`

Query `include=all|primary|complete|xbrl|exhibits|pdf` may repeat; default is `all`.

- Resolves an immutable manifest first, stages upstream streams into a request-scoped temporary directory, then streams the ZIP from disk.
- Includes `manifest.json` with SEC source metadata, selected files, byte sizes, and creation timestamp.
- Duplicate output names are deterministically disambiguated.

### Multi-filing batch ZIP

`GET /api/tools/sec-filings/batch`

Validated query:

```ts
{
  cik: string
  accessions: string[] // repeated query key, 1..10, unique
  mode: 'primary' | 'complete'
}
```

- All accessions must belong to the same validated company.
- Output contains one file per filing plus a root `manifest.json`.
- Naming is deterministic: `{ticker-or-cik}_{form}_{filed}_{accession}_{basename}` after safe ASCII sanitization.
- The operation is read-only and ephemeral, so GET is intentional: a normal browser navigation can stream the attachment directly to disk instead of forcing `$fetch` to materialize a full ZIP `Blob` in browser memory.

## 5. Shared TypeScript domain contract

Public interfaces live in `types/sec-filings.ts`. Server-only raw SEC response schemas stay under `server/utils/sec-edgar/`.

Required public types:

- `SecCompany`, `SecCompanySearchResult`
- `SecFilingSummary`, `SecFilingPage`, `SecFilingFilters`
- `SecFilingDetail`, `SecFilingDocument`, `SecDocumentClass`
- `SecCacheMeta`, `SecApiResponse<T>`
- `SecBatchRequest`, `SecBatchMode`
- `SecProviderErrorCode`

The composable owns view state, not provider parsing: selected company, filters, list cursor stack, loading/error/stale states, up-to-10 same-company selection, and download actions.

## 6. SEC client, queue, retries, and redirects

`server/utils/sec-edgar/client.ts` is the only module allowed to call SEC hosts.

- HTTPS only; exact host allowlist `www.sec.gov` and `data.sec.gov`.
- Route-specific URL constructors accept validated identifiers/basenames, never URL strings.
- Required headers: configured `User-Agent`, `Accept-Encoding: gzip, deflate`, and a narrow `Accept` value.
- Global process-local concurrency: 2.
- Minimum interval between upstream request starts: 125 ms (maximum 8 starts/second).
- FIFO queue with bounded length 200; overflow fails fast with `SEC_QUEUE_FULL`.
- In-flight deduplication for identical metadata GET keys. Download/body streams are never shared between callers.
- Metadata timeout 15 seconds; streamed document timeout 60 seconds, both abortable.
- At most 2 retries after the initial attempt.
- Retry only network failures, timeouts, 429, 502, 503, and 504. Do not retry validation errors, 4xx other than 429, or partial streamed bodies.
- Honor numeric and HTTP-date `Retry-After`, capped at 30 seconds. Otherwise use capped exponential backoff with jitter.
- Fetch uses manual redirect handling. A redirect is followed at most once only when its parsed HTTPS destination remains on the exact host expected by that URL constructor and the reconstructed path still satisfies that constructor. Any other redirect is `SEC_UNSAFE_REDIRECT`.

## 7. Bounded cache and stale fallback

Use a small generic TTL/LRU cache with explicit fresh and stale windows, access-order eviction, and in-flight load deduplication.

| Resource | Fresh TTL | Stale window | Max entries |
| --- | ---: | ---: | ---: |
| Company directory | 24 h | 7 d | 1 |
| Company submissions | 5 min | 24 h | 250 |
| Historical segment | 24 h | 30 d | 500 |
| Filing index | 1 h | 7 d | 500 |

- Stale data is returned only after a retryable SEC/network failure, never after validation, 404, unsafe redirect, or parse-integrity failure.
- Stale responses are visibly marked in API metadata and UI.
- A stale entry is never extended merely because it was served.
- File bodies and generated ZIPs are not cached.

## 8. Security and resource limits

All values below are constants with unit tests. Limits apply before work starts when `Content-Length`/index metadata is available and again while streaming.

- Metadata response: 5 MiB maximum.
- Individual document: 250 MiB maximum.
- Single filing package: 200 files maximum and 500 MiB maximum total uncompressed bytes.
- Batch package: 10 filings, 10 payload files, and 500 MiB maximum total uncompressed bytes.
- ZIP output: 550 MiB maximum bytes written.
- Temporary workspace: created with an unpredictable name under the OS temp directory and mode 0700 where supported.
- Every stream has byte-count enforcement and abort propagation.
- Temporary files are removed in `finally` after success, client disconnect, upstream failure, ZIP failure, or timeout.
- Archive entries never contain absolute paths, `..`, control characters, or caller-controlled directories.
- Response filenames are generated/sanitized server-side and encoded safely for `Content-Disposition`.
- Logs contain request ID, operation, canonical CIK/accession, cache status, retry count, durations, and byte counts. They never log document contents, query free text beyond a bounded/masked form, contact email, cookies, or full client IP.

Per-IP limits use `getRateLimitIdentifier` and new named limiters in `lib/rate-limiter.ts`:

- Search/list/detail metadata: 60 requests/minute/IP.
- Individual downloads: 20 requests/minute/IP.
- ZIP creation: 5 requests/10 minutes/IP.
- Batch ZIP: 3 requests/10 minutes/IP.

429 responses set `Retry-After` and use a SEC-tool-specific stable error code.

## 9. Stable errors

Add provider-specific codes to the central error catalog and all three locales:

- `SEC_CONFIG_MISSING` — 503
- `SEC_VALIDATION_ERROR` — 400
- `SEC_COMPANY_NOT_FOUND` — 404
- `SEC_FILING_NOT_FOUND` — 404
- `SEC_DOCUMENT_NOT_FOUND` — 404
- `SEC_UPSTREAM_RATE_LIMITED` — 503 (includes bounded retry-after metadata)
- `SEC_UPSTREAM_UNAVAILABLE` — 503
- `SEC_UPSTREAM_INVALID_RESPONSE` — 502
- `SEC_QUEUE_FULL` — 503
- `SEC_UNSAFE_REDIRECT` — 502
- `SEC_FILE_TOO_LARGE` — 413
- `SEC_PACKAGE_LIMIT_EXCEEDED` — 413
- `SEC_RATE_LIMITED` — 429

Unexpected errors still flow through `handleApiError`. Expected provider errors are `AppError` instances/factories so handlers retain the standard log/error shape.

## 10. UI and navigation contract

- Use Calm Institutional Ledger primitives and `dt-*` tokens: `LedgerCard`, `BaseButton`, `StatusBadge`.
- Search is the first task in view. Results use an accessible combobox/listbox pattern with keyboard selection.
- Filing filters remain usable on narrow screens and collapse behind an explicit filter control when needed.
- Desktop uses a dense filing table; mobile uses dedicated filing cards. No page-level horizontal overflow.
- Detail is a real route with a document table on desktop and document cards on mobile.
- Selection is capped at 10 and reset when company changes. Batch controls state why cross-company selection is impossible.
- Explicit states: initial, loading, empty search, no filings, stale data, unavailable, rate-limited, PDF available, and no PDF.
- Download actions, including batch ZIP, use normal same-origin links/navigation so the browser streams attachments without materializing them in application memory.
- All visible copy, aria labels, SEO title/description, error messages, filter labels, document classes, and statuses exist in `en`, `zh-TW`, and `zh-CN`.
- Add SEC Filings after the existing first three featured tools in `toolNavItems`; do not reorder Financial Freedom, Position Sizing, or Seasonality.
- Add SEC Filings to the authenticated desktop `tools` group, mobile/public tools navigation, `pages/how-to-use.vue`, and sitemap.
- The how-to-use card may use a stable checked-in screenshot only after the page is implemented; do not ship a broken image reference.

## 11. Test contract

Tests never call a live SEC host. A shared fixture directory contains:

- company directory rows with normal tickers, punctuation, duplicate CIKs, and foreign issuers;
- recent submissions, multiple historical segments, amendments, 20-F/6-K/40-F examples, and uneven-column corruption;
- filing index HTML/JSON with primary HTML, complete TXT, inline and instance XBRL, schemas/linkbases, exhibits, original PDF, and no-PDF variants;
- retry/429/Retry-After, redirects, truncated streams, over-limit sizes, and unavailable responses.

Coverage by layer:

- Unit: identifier normalization, schemas, URL construction, document classification, column normalization, paging/cursor integrity, queue order/concurrency/interval, retries, cache eviction/stale fallback, ZIP manifest/naming.
- API: every JSON and download route, stable errors, headers, per-IP limits, individual streaming, single ZIP, batch ZIP.
- Integration: search → company → recent/historical filters → detail → download, and same-company selection/batch behavior.
- Security: arbitrary URL/host attempts, CIK/accession mismatch, raw and encoded traversal, double encoding, null bytes, unsafe redirect, index poisoning, oversized/truncated streams, file-count and total-size limits, duplicate ZIP names, cleanup after failure/disconnect.
- Playwright: desktop and mobile search/list/detail/batch flows with route interception; loading, empty, stale, unavailable, rate-limited, PDF, and no-PDF states; add the route to responsive and text-containment suites.
- i18n parity test remains green with identical leaf-key sets.

## 12. Phase gates

1. Repository audit and final contract — this document only; no runtime code.
2. SEC client, queue, cache, types, validation, fixtures, and unit tests.
3. Company search and filing list/detail metadata APIs with API tests.
4. Search and filing-list UI, navigation/i18n integration, component/integration tests.
5. Detail route and individual streamed downloads.
6. Single-filing streamed ZIP using temporary files and cleanup tests.
7. Same-company multi-filing selection and batch ZIP.
8. Security hardening, docs/config, Playwright additions, lint, typecheck, full Vitest, build, and E2E regression.

Each later phase stops after its own focused tests and reports files, decisions, results, and remaining phases.
