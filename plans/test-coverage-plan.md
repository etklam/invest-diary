# ✅ Test Coverage 提升計畫（確保重構安全）

> 目標：在開始重構（logger / error handling）前，先把關鍵路徑鎖住

---

## 🎯 覆蓋率目標（可量化）

使用 **Vitest + c8**：

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

- ✅ coverage 達標
- ✅ auth / diary / websocket 失敗情境全綠
- ✅ 任一測試失敗即可阻止重構

---

> 這份計畫的目的只有一個：
> **讓你可以放心大改 production-critical code，而不怕炸。**
