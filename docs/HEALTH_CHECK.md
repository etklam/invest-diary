# Health Check System

自動化系統健康檢查機制，確保每次代碼變更後系統都保持正常運行。

## ✅ 檢查項目

| 檢查項目 | 說明 |
|---------|------|
| 🔑 環境變數 | 驗證 `.env` 文件存在且 `DATABASE_URL` 已配置 |
| 🗄️ Prisma Schema | 驗證 Prisma schema 語法正確 |
| 📘 TypeScript 編譯 | 檢查 TypeScript 類型錯誤 |
| 🧪 單元測試 | 運行所有測試套件 |
| 🗃️ 數據庫連接 | 驗證 MySQL 服務可訪問 |
| 📦 依賴項 | 確保 `node_modules` 和 `.nuxt` 存在 |

## 🚀 使用方式

### 自動運行（Git Hooks）

```bash
# 每次 commit 前自動運行
git commit -m "feat: add new feature"
# → 執行 npm run health:check

# 每次 push 前自動運行完整檢查
git push
# → 執行 npm run health:full
```

### 手動運行

```bash
# 完整健康檢查
npm run health:check

# 包含建置驗證的完整檢查
npm run health:full

# 快速檢查（僅測試 + Prisma 驗證）
npm run health:quick
```

## 📊 輸出示例

```
🏥 Running System Health Check...

📊 Health Check Results:

────────────────────────────────────────────────────────────
✅ Environment Variables          OK
✅ Prisma Schema                  OK (500ms)
✅ TypeScript Compilation         OK (7793ms)
✅ Unit Tests                     OK (719ms)
✅ Database Connection            OK (433ms)
✅ Dependencies                   OK (1ms)
────────────────────────────────────────────────────────────

Total: 6 checks | ✅ 6 passed | ❌ 0 failed | ⏭️ 0 skipped

✅ All health checks PASSED! System is healthy.
```

## 🔧 API 端點

系統提供健康檢查 API 端點用於監控：

```bash
curl http://localhost:3000/api/health
```

**回應範例：**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "checks": {
    "database": {
      "status": "ok",
      "responseTime": 15
    },
    "server": {
      "status": "ok",
      "uptime": 3600,
      "environment": "development"
    }
  }
}
```

## 🎨 UI 狀態指示器

`<HealthStatus>` 組件在介面中顯示系統狀態：

- ✅ **綠色** - 系統正常
- ❌ **紅色** - 系統異常（點擊查看錯誤詳情）
- 每 30 秒自動刷新

## 🔄 跳過健康檢查

如果確定變更是安全的，可以跳過檢查：

```bash
# 跳過 pre-commit 檢查
git commit --no-verify -m "WIP: experimental changes"

# 跳過 pre-push 檢查
git push --no-verify
```

⚠️ **警告**: 僅在確定變更安全時使用！

## 🛠️ 開發建議

1. **開發過程中**: 定期運行 `npm run health:quick` 快速驗證
2. **提交前**: 讓 pre-commit hook 自動運行完整檢查
3. **部署前**: 運行 `npm run health:full` 確保一切正常
4. **生產環境**: 使用 `/api/health` 端點進行監控

## 📝 擴展健康檢查

如需添加自定義檢查項目，編輯 `scripts/health-check.ts`：

```typescript
runCheck(
  'Custom Check',
  () => {
    // Your check logic here
    if (somethingWrong) {
      throw new Error('Something went wrong')
    }
  }
)
```

## 📚 相關文件

- `scripts/health-check.ts` - 健康檢查腳本
- `server/api/health.get.ts` - 健康檢查 API
- `components/HealthStatus.vue` - UI 狀態指示器
- `.husky/pre-commit` - Git pre-commit hook
- `.husky/pre-push` - Git pre-push hook
