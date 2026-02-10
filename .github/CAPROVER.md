# CapRover + GitHub Actions 部署指南

本專案使用 **CapRover** 觸發 GitHub Actions 構建 Docker image，並自動部署。

## 部署架構

```
┌─────────────────────────────────────────────────────────────────┐
│                         工作流程                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 推送代碼到 GitHub (main 分支)                               │
│     或                                                          │
│  2. CapRover Webhook 觸發 (手動/定時)                           │
│     ↓                                                          │
│  3. GitHub Actions 構建 Docker Image                            │
│     ↓                                                          │
│  4. 推送到 Container Registry (GHCR/Docker Hub)                 │
│     ↓                                                          │
│  5. CapRover 自動偵測到新 Image                                 │
│     ↓                                                          │
│  6. CapRover 拉取並部署新容器                                   │
│     ↓                                                          │
│  7. docker-entrypoint.sh 自動執行 prisma migrate deploy        │
│     ↓                                                          │
│  8. ✅ 資料庫 schema 同步完成                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Step 1: 設置 CapRover App

### 在 CapRover Dashboard 中創建新 App

1. 登入 CapRover Dashboard
2. 點擊 **"Create New App"**
3. 設定 App 名稱（例如：`diary-vue`）
4. 設定環境變數：

| 環境變數 | 值 | 說明 |
|---------|---|------|
| `DATABASE_URL` | 你的 MySQL 連線字串 | 例如：`mysql://user:pass@host:3306/db` |
| `JWT_SECRET` | 隨機安全密鑰 | 用於 JWT token 簽名 |
| `NUXT_PUBLIC_APP_NAME` | `投資日記` | 應用名稱 |
| `NODE_ENV` | `production` | 生產環境 |
| `RUN_MIGRATIONS` | `true` | 啟動時自動執行遷移 |
| `PORT` | `3000` | 應用端口 |

### ⚠️ 重要：關閉 CapRover 的內建資料庫

由於 CapRover 的 MySQL 和你的應用分開部署，請確保：

1. **選項 A：使用 CapRover 的 MySQL**
   - 在 CapRover 中創建 MySQL App
   - 設定 One-Click App 模板
   - 記得連線字串格式

2. **選項 B：使用外部 MySQL**
   - 設定 DATABASE_URL 指向外部 MySQL
   - 確保防火牆允許 CapRover 伺服器連線

## Step 2: 配置 Container Registry

### 選項 A：使用 GitHub Container Registry (GHCR) ✅ 推薦

**優點：** 無需額外設定，使用 GitHub Token 即可

GitHub Actions workflow 已經配置好使用 GHCR。

**在 CapRover 中設定：**
1. 進入 App 設定
2. **Image** 設為：`ghcr.io/你的用戶名/diary-vue:latest`
3. **Registry Username**：你的 GitHub 用戶名
4. **Registry Password**：GitHub Personal Access Token (PAT)

**如何創建 GitHub PAT：**
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. 勾選 `read:packages` 權限
3. 複製 token 並貼到 CapRover

### 選項 B：使用 Docker Hub

**優點：** 更普及，相容性好

需要修改 `.github/workflows/docker-build.yml`：

```yaml
env:
  REGISTRY: docker.io
  IMAGE_NAME: 你的dockerhub用戶名/diary-vue
```

並在 GitHub Secrets 中加入：
- `DOCKER_USERNAME`：Docker Hub 用戶名
- `DOCKER_PASSWORD`：Docker Hub Access Token

## Step 3: 設定自動部署

### 方法 A：CapRover Webhook 觸發 GitHub Actions

**在 CapRover 中設定 Webhook：**

1. 進入 App → **Deployment** 標籤
2. 找到 **"Webhook"** 區塊
3. 選擇 **"GitHub Actions"** 模式
4. 設定 Webhook URL：

```
https://api.github.com/repos/你的用戶名/diary-vue/dispatches
```

5. 設定 Webhook Method：`POST`
6. 設定 Webhook Body (JSON)：

```json
{
  "event_type": "caprover-deploy",
  "client_payload": {
    "branch": "main"
  }
}
```

7. 設定 Webhook Headers：
   - `Authorization`: `token YOUR_GITHUB_PAT`
   - `Accept`: `application/vnd.github.v3+json`

### 方法 B：GitHub 自動觸發（推薦）✅

**最簡單的方式：**

直接推送到 `main` 分支，GitHub Actions 會自動：
1. 構建 Docker image
2. 推送到 GHCR
3. CapRover 自動偵測到新 image 並重啟

```bash
git push origin main
```

## Step 4: 驗證資料庫自動同步

### 檢查部署日誌

在 CapRover Dashboard 中：

1. 進入你的 App
2. 點擊 **"Logs"** 標籤
3. 查找以下訊息：

```
🚀 Starting Personal Investment Diary System...
⏳ Waiting for database connection...
✅ Database is ready!
🔄 Running database migrations...
✅ Migrations completed!
```

### 手動測試遷移

**本地開發時：**

```bash
# 1. 修改 schema
nano prisma/schema.prisma

# 2. 建立遷移
npx prisma migrate dev --name add_new_field

# 3. 測試
npm run dev

# 4. 提交
git add .
git commit -m "feat: add new field"
git push origin main
```

**GitHub Actions 會自動：**
1. 構建新 image（包含新的 migration files）
2. 推送到 GHCR
3. CapRover 拉取新 image
4. 容器重啟時 `prisma migrate deploy` 自動執行
5. ✅ 生產資料庫 schema 已更新

## 故障排除

### 問題 1：CapRover 無法拉取 Image

**錯誤訊息：** `Failed to pull image`

**解決方法：**
1. 檢查 CapRover 中的 Registry 認證資訊
2. 確認 GitHub PAT 有 `read:packages` 權限
3. 確認 image 名稱正確：`ghcr.io/username/diary-vue:latest`

### 問題 2：資料庫遷移失敗

**錯誤訊息：** `Migration failed`

**解決方法：**
1. 檢查 `DATABASE_URL` 環境變數是否正確
2. 確認 MySQL 容器正在運行
3. 檢查資料庫使用者權限

```bash
# 在 CapRover 的 MySQL 容器中檢查
docker exec -it mysql-container mysql -u root -p
SHOW GRANTS FOR 'diary_user'@'%';
```

### 問題 3：應用無法啟動

**檢查步驟：**
1. 查看 CapRover 日誌
2. 確認所有環境變數已設定
3. 檢查健康檢查端點：

```bash
curl https://your-app.captain.localhost/api/health
```

## 進階配置

### 啟用 CapRover 的 HTTPS

1. 在 CapRover Dashboard 中
2. 進入 App → **Domains**
3. 設定自定義域名
4. 啟用 **"Force HTTPS"**
5. 設定 SSL 憑證（Let's Encrypt 自動）

### 設定資料庫持久化

在 CapRover MySQL App 中：

1. 設定 **Persistent Directories**
2. 掛載 `/var/lib/mysql` 到持久卷

### 定時備份資料庫

```bash
# 在 CapRover 中設定 Cron Job
0 2 * * * docker exec mysql-container mysqldump -u root -p${MYSQL_ROOT_PASSWORD} invest_diary | gzip > /backup/backup_$(date +\%Y\%m\%d).sql.gz
```

## 安全建議

1. ✅ 使用強密碼和隨機的 JWT_SECRET
2. ✅ 限制 GitHub PAT 權限範圍
3. ✅ 啟用 CapRover 的 HTTPS
4. ✅ 定期更新依賴套件
5. ✅ 設定防火牆規則
6. ✅ 定期備份資料庫

## 快速命令參考

```bash
# 本地測試
npm run dev

# 建立遷移
npx prisma migrate dev --name description

# 查看遷移狀態
npx prisma migrate status

# 重置資料庫（⚠️ 危險！）
npx prisma migrate reset --force

# 部署到生產
git push origin main

# 查看 CapRover 日誌（在 Dashboard 中）
# 或透過 CapRover CLI
captain logs diary-vue --follow
```

## 相關文檔

- [CapRover 官方文檔](https://caprover.com/docs/)
- [GitHub Actions 文檔](https://docs.github.com/en/actions)
- [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- 專案 README：`../README.md`
- Docker 配置：`../docker-compose.yml`
- Entrypoint 腳本：`../docker-entrypoint.sh`
