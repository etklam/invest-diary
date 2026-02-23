# ✅ Test Coverage 提升計畫（確保重構安全）

> 目標：在開始重構（logger / error handling）前，先把關鍵路徑鎖住

---

## 📊 Current Status (2026-02-24)

**Progress**: ⚠️ **In Progress** - Tests exist but need fixes and more coverage

| Metric | Target | Status |
|--------|--------|--------|
| Statements | ≥ 75% | TBD |
| Branches | ≥ 65% | TBD |
| Functions | ≥ 75% | TBD |
| Lines | ≥ 75% | TBD |

**Test Files**: 18 files, 260 tests (174 passing, 86 failing)

**Existing Tests**:
- ✅ API tests: auth.test.ts, blog.test.ts, diaries.test.ts
- ✅ Composables: useAuth.test.ts, useDiscipline.test.ts, useGestures.test.ts, useMobileDetection.test.ts, useNavigation.test.ts, usePerformance.test.ts, useToast.test.ts
- ✅ Components: AlertNotification.test.ts, BlogCard.test.ts, Toast.test.ts
- ✅ Integration: auth-flow.test.ts, diary-workflow.test.ts
- ✅ Unit: lib/jwt.test.ts, lib/utils.test.ts, lib/blog.test.ts

**Known Issues** (86 failures):
- ❌ lib/blog.test.ts: generateExcerpt not removing markdown properly
- ❌ composables/usePerformance.test.ts: computed not imported
- ❌ unit/lib/jwt.test.ts: token structure mismatch (type field)

---

## 🎯 覆蓋率目標（可量化）

使用 **Vitest + v8**：

- **Statements** ≥ 75%
- **Branches** ≥ 65%
- **Functions** ≥ 75%
- **Lines** ≥ 75%

> 原則：不是追求 100%，而是 **關鍵路徑 + 失敗情境** 必須被測到。

---

## 🔒 優先補齊的關鍵路徑（依風險排序）

### 1️⃣ 認證流程（最高優先）

**涵蓋範圍**
- `/api/auth/login`
- `/api/auth/refresh`
- `/api/auth/logout`
- `server/middleware/auth.ts`

**必測情境**
- ✅ 正確登入（access + refresh token）
- ❌ 密碼錯誤 / 使用者不存在
- ❌ refresh token 過期 / 不存在
- ✅ logout 即使 DB cleanup 失敗也成功
- ✅ middleware 在 token 無效時不注入 user

📁 建議檔案：
- [`tests/api/auth.error.test.ts`](tests/api/auth.error.test.ts)
- [`tests/middleware/auth.test.ts`](tests/middleware/auth.test.ts)

---

### 2️⃣ Diary API（錯誤與邊界）

**涵蓋範圍**
- `/api/diaries.get`
- `/api/diaries.post`
- `/api/diaries/[id].get`
- `/api/diaries/[id].put`
- `/api/diaries/[id].delete`

**必測情境**
- ❌ 未登入（401）
- ❌ 存取他人 diary（403）
- ❌ diary 不存在（404）
- ✅ BigInt → string 序列化正確
- ✅ DB error 時回傳 500

📁 建議檔案：
- [`tests/api/diaries.error.test.ts`](tests/api/diaries.error.test.ts)

---

### 3️⃣ WebSocket / Alert 互動

**涵蓋範圍**
- `server/websocket/connectionManager.ts`
- `server/plugins/alert-scheduler.ts`
- `composables/useWebSocket.ts`

**必測情境**
- ✅ user 連線 / 斷線 register / unregister
- ✅ emitToUser：在線 / 不在線
- ✅ alert trigger 時只推送給正確 user
- ✅ client composable 在 SSR / 未初始化時安全 fallback

📁 建議檔案：
- [`tests/websocket/connectionManager.test.ts`](tests/websocket/connectionManager.test.ts)
- [`tests/websocket/alert-scheduler.test.ts`](tests/websocket/alert-scheduler.test.ts)

---

## 🧪 測試層級策略

| 層級 | 工具 | 說明 |
|----|----|----|
| Unit | Vitest | utils / manager / pure logic |
| API | Vitest + mock prisma | handler + error path |
| Integration-lite | handler + middleware | 不跑真 DB |

> 原則：**不引入 Playwright**，先確保 server side 可安全重構。

---

## 🧰 覆蓋率強制機制

### Vitest 設定（建議）

```ts
// vitest.config.ts
coverage: {
  provider: 'c8',
  reporter: ['text', 'html'],
  lines: 75,
  functions: 75,
  branches: 65,
  statements: 75,
}
```

### CI Gate（概念）

- coverage 低於門檻 → CI fail
- PR 不允許 merge

---

## 🚦 執行順序（實戰）

1. 補 **auth error tests**（最擋風險）
2. 補 **diary API error tests**
3. 補 **websocket / alert tests**
4. 打開 coverage gate
5. ✅ **才開始重構 logger / error handling**

---

## ✅ Done Definition

在開始重構前，以下必須成立：

- [ ] coverage 達標 (75/65/75/75%)
- [ ] auth / diary / websocket 失敗情境全綠
- [ ] 所有測試通過 (0 failures)

---

## 📋 Remaining Tasks (2026-02-24)

### ✅ Completed (30 tests fixed)
- [x] Fix lib/blog.test.ts: generateExcerpt markdown link handling
- [x] Fix lib/blog.test.ts: calculateReadingTime returning 0 for empty
- [x] Fix composables/usePerformance.test.ts: import computed and readonly
- [x] Fix tests/unit/lib/jwt.test.ts: update expected token structure
- [x] Add vitest global setup (vi-setup.ts) for Nuxt auto-import mocks
- [x] Mock useToast, defineEventHandler, getRouterParam, etc.

### Remaining (56 failures in 7 test files)

#### Integration Tests (auth-flow, diary-workflow)
- Need proper auth context/middleware mocking
- Tests fail with "Unauthorized" or "Cannot convert undefined to a BigInt"
- Requires comprehensive auth utility mocking

#### API Tests (auth)
- Cookie mock setup issues (setCookie, deleteCookie, getCookie)
- Need proper event context mocking

#### useGestures Tests
- DOM event mocking issues (touchstart, touchend, etc.)
- Happy-dom event listener setup required

#### usePerformance Tests
- Metric rating assertions not matching mock behavior

### Coverage Gaps (still need)
- [ ] Add diary API error tests (401/403/404/500)
- [ ] Add websocket connectionManager tests
- [ ] Add alert-scheduler tests
- [ ] Add auth middleware tests
- [ ] Run coverage report and identify gaps

### Final Steps
- [ ] Achieve coverage targets
- [ ] Set up CI coverage gate
- [ ] Document test approach

---

> 這份計畫的目的只有一個：
> **讓你可以放心大改 production-critical code，而不怕炸。**
