# 全自動測試機制設計文檔

## 📋 概述

本測試機制旨在提供完整的自動化測試覆蓋，確保代碼品質和系統穩定性。

## 🏗️ 測試架構

```
tests/
├── setup.ts                 # 測試環境設定
├── helpers/                 # 測試工具函數
│   ├── api.ts              # API 測試工具
│   ├── auth.ts             # 認證測試工具
│   ├── database.ts         # 資料庫測試工具
│   └── mock.ts             # Mock 工具
├── unit/                    # 單元測試
│   ├── lib/                # Lib 工具測試
│   │   ├── utils.test.ts
│   │   └── jwt.test.ts
│   └── composables/        # Composables 測試
│       ├── useAuth.test.ts
│       ├── useToast.test.ts
│       ├── useNavigation.test.ts
│       └── useDiscipline.test.ts
├── integration/             # 整合測試
│   └── api/                # API 端點測試
│       ├── auth/
│       │   ├── login.test.ts
│       │   ├── register.test.ts
│       │   ├── logout.test.ts
│       │   └── me.test.ts
│       ├── diaries/
│       │   ├── index.test.ts
│       │   └── [id].test.ts
│       ├── alerts/
│       ├── discipline/
│       ├── stocks/
│       ├── transactions/
│       ├── user/
│       └── admin/
└── e2e/                     # 端對端測試 (可選)
    └── playwright.config.ts
```

## 🔧 測試分層

### 1. 單元測試 (Unit Tests)
- **目標**: 測試獨立函數和組件
- **覆蓋率目標**: 80%+
- **執行時間**: < 5 秒

### 2. 整合測試 (Integration Tests)
- **目標**: 測試 API 端點和資料庫交互
- **覆蓋率目標**: 70%+
- **執行時間**: < 30 秒

### 3. E2E 測試 (可選)
- **目標**: 測試完整用戶流程
- **執行時間**: < 2 分鐘

## 🚀 自動化流程

### Git Hooks (Husky)

```yaml
pre-commit:
  - 執行 lint 檢查
  - 執行相關單元測試

pre-push:
  - 執行完整測試套件
  - 執行健康檢查

CI/CD:
  - 執行所有測試
  - 生成覆蓋率報告
  - 上傳覆蓋率到 Codecov
```

### NPM Scripts

```json
{
  "test": "vitest run",
  "test:watch": "vitest watch",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest run --coverage",
  "test:unit": "vitest run tests/unit",
  "test:integration": "vitest run tests/integration",
  "test:e2e": "playwright test",
  "test:ci": "vitest run --coverage --reporter=json"
}
```

## 📊 測試覆蓋率目標

| 類別 | 當前 | 目標 |
|------|------|------|
| Server API | ~0% | 70% |
| Components | ~0% | 60% |
| Composables | ~0% | 80% |
| Lib | ~33% | 90% |
| **總計** | **~2%** | **75%** |

## 🔒 測試環境

### 環境變數

```env
# .env.test
DATABASE_URL="mysql://test:test@localhost:3306/diary_test"
JWT_SECRET="test-secret-key"
NODE_ENV="test"
```

### 資料庫策略

1. **測試資料庫**: 使用獨立的測試資料庫
2. **清理策略**: 每個測試前後清理資料
3. **交易回滾**: 使用交易確保測試隔離

## 📝 測試規範

### 命名規範

```
測試檔案: {source-file}.test.ts
測試描述: should {expected-behavior} when {condition}
```

### 測試結構

```typescript
describe('Feature/Module', () => {
  describe('function/endpoint', () => {
    it('should return X when Y', async () => {
      // Arrange
      const input = createTestData()
      
      // Act
      const result = await functionUnderTest(input)
      
      // Assert
      expect(result).toEqual(expectedOutput)
    })
  })
})
```

### AAA 模式

1. **Arrange**: 準備測試數據和環境
2. **Act**: 執行被測試的代碼
3. **Assert**: 驗證結果

## 🛠️ 測試工具

### API 測試工具

```typescript
// tests/helpers/api.ts
export async function setupTestServer() {
  // 啟動測試伺服器
}

export async function makeAuthenticatedRequest(
  endpoint: string,
  options: RequestInit,
  token: string
) {
  // 發送帶認證的請求
}
```

### 認證測試工具

```typescript
// tests/helpers/auth.ts
export async function createTestUser(overrides?: Partial<User>) {
  // 創建測試用戶
}

export async function getTestAuthToken(userId: string) {
  // 獲取測試用 JWT
}

export async function createAdminUser() {
  // 創建管理員用戶
}
```

### Mock 工具

```typescript
// tests/helpers/mock.ts
export function mockPrisma() {
  // Mock Prisma Client
}

export function mockNuxtComposable(name: string) {
  // Mock Nuxt Composables
}
```

## 🔄 CI/CD 整合

### GitHub Actions

```yaml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: test
          MYSQL_DATABASE: diary_test
        ports:
          - 3306:3306
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup test database
        run: npx prisma migrate deploy
      
      - name: Run tests
        run: npm run test:ci
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/coverage-final.json
```

## 📈 監控與報告

### 覆蓋率報告

- **本地**: `npm run test:coverage` → `coverage/index.html`
- **CI**: 自動上傳到 Codecov

### 測試報告

- **JUnit XML**: 用於 CI 整合
- **HTML Report**: 用於本地查看

## 🎯 優先級

### Phase 1: 基礎建設
1. ✅ 建立測試 helpers
2. ✅ 設定測試資料庫
3. ✅ 建立 CI/CD 流程

### Phase 2: 核心測試
1. ✅ Lib 工具測試 (jwt.ts)
2. ✅ Composables 測試 (useAuth.ts)
3. ✅ Auth API 測試

### Phase 3: 擴展測試
1. ✅ Diaries API 測試
2. ✅ Alerts API 測試
3. ✅ Admin API 測試

### Phase 4: 組件測試
1. ✅ 配置 @nuxt/test-utils
2. ✅ 關鍵組件測試

## 🚨 失敗處理

### 測試失敗時

1. **本地**: 阻止 commit (pre-commit hook)
2. **CI**: 阻止 merge (branch protection)
3. **通知**: GitHub PR 狀態檢查

### 覆蓋率不足時

1. **警告**: 低於 70% 時發出警告
2. **阻止**: 低於 50% 時阻止 merge

---

*最後更新: 2026-02-10*
