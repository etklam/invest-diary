# 備份與恢復指南

本文件定義 Diary Vue 的資料庫備份、恢復與定期驗證流程。目標不是「有備份檔就算完事」，而是能在資料庫故障、誤刪資料或部署失敗時，明確知道可以恢復到哪個時間點。

## 適用範圍

- MySQL/MariaDB 資料庫
- Prisma migration 狀態
- 使用者上傳或產生的持久化檔案（如未來新增）
- 環境變數與部署設定

不包含 `node_modules/`、`.nuxt/`、`.output/`、測試快取或其他可重新生成的建置產物。

## 備份策略

### 資料庫

建議採用每日完整備份，保留至少 14 天；若正式使用者與交易紀錄增加，改成每日完整備份加每小時 binlog 或 provider point-in-time recovery。

```bash
mysqldump \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --set-gtid-purged=OFF \
  "$DATABASE_NAME" > "backups/diary-vue-$(date +%Y%m%d-%H%M%S).sql"
```

備份檔命名需包含環境與時間，例如：

```text
diary-vue-production-20260501-030000.sql
diary-vue-staging-20260501-030000.sql
```

### Prisma migration

`prisma/schema.prisma` 與 `prisma/migrations/` 必須透過 Git 版本控制保存。資料庫備份只代表資料當下狀態，migration history 才能解釋 schema 怎麼來的，這倆少一個都容易把恢復流程玩成考古。

### 環境設定

`.env` 不進 Git。正式環境需在密碼管理工具或部署平台保存：

- `DATABASE_URL`
- `JWT_SECRET`
- 第三方 API key
- 部署平台 token 或 webhook secret

每次 rotation 後更新密碼管理工具，不要只改伺服器上的值。

## 恢復流程

### 1. 確認恢復目標

先記錄以下資訊：

- 事故時間
- 目標恢復時間點
- 影響環境：local、staging、production
- 是否需要保留事故後資料做人工合併

若是 production，先停止會寫入資料庫的服務，避免恢復過程繼續產生新資料。

### 2. 建立事故快照

恢復前先備份目前狀態，哪怕它是壞的。

```bash
mysqldump \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --set-gtid-purged=OFF \
  "$DATABASE_NAME" > "backups/pre-restore-$(date +%Y%m%d-%H%M%S).sql"
```

### 3. 還原資料庫

建議先還原到 staging 或臨時資料庫驗證。

```bash
mysql "$DATABASE_NAME" < backups/diary-vue-production-YYYYMMDD-HHMMSS.sql
```

還原後執行 Prisma 檢查：

```bash
npx prisma validate
npx prisma migrate status
npm run typecheck
npm test
```

### 4. 應用服務驗證

恢復後至少檢查：

- 使用者登入與刷新 token
- 日記列表、建立、編輯
- 交易資料與持倉計算
- API key 建立與外部寫入
- 提醒列表與 WebSocket 推播
- 管理員後台讀取

若 staging 驗證通過，再切回 production 或將同一流程套到 production。

## 定期恢復演練

每月至少做一次恢復演練，並記錄：

- 使用的備份檔
- 還原耗時
- 驗證指令結果
- 發現的缺口
- 下次要修的項目

演練結果可追加到 `docs/operations/HEALTH_CHECK.md` 或對應 incident 文件。

## 備份檢查清單

- 備份檔可下載
- 備份檔大小合理，不是 0 byte
- 備份檔可在乾淨資料庫還原
- `npx prisma migrate status` 無漂移
- 關鍵流程 smoke test 通過
- 備份檔存放位置有權限控管
- 過期備份已按保留政策清理

## 安全注意事項

- 備份檔含 email、交易紀錄與 hash 後憑證，仍視為敏感資料。
- 不要把 `.sql` 備份提交到 Git。
- 備份傳輸需使用加密通道。
- 離站備份需使用加密儲存。
- 調試用資料庫恢復完成後，應輪替測試環境憑證或隔離網路權限。
