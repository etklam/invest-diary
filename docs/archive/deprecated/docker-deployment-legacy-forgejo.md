# Docker 部署指南（舊 Forgejo 環境，已被取代）

> Superseded by `docs/operations/DEPLOYMENT.md` and the current `.forgejo/workflows/build.yml` workflow. Hostnames, image paths, and workflow names below are historical.

本文檔說明如何配置和使用自動化的 Docker 映像檔建置和部署流程。

## 概述

當您推送到 `main` 分支時，系統會自動：
1. 建置 Docker 映像檔
2. 推送到 Forgejo Container Registry
3. 同時更新 GitHub 和 Forgejo 的程式碼倉庫

## 設置步驟

### 1. 配置 Forgejo Secrets

在您的 Forgejo 倉庫中，需要設置以下 Secrets：

1. 前往 Forgejo 倉庫的 Settings > Secrets and variables > Actions
2. 添加以下 Secrets：

#### PACKAGES_TOKEN
- Forgejo 的存取權杖，用於推送 Docker 映像檔到 Container Registry
- 如何取得：
  1. 登入 Forgejo (https://forgejo.hker.me)
  2. 前往 Settings > Applications
  3. 點擊 "Generate new token"
  4. 選擇適當的權限（至少需要 `write:package` 權限）
  5. 複製生成的 token

### 2. 使用推送腳本

我們提供了一個便利腳本來同時推送到兩個遠端倉庫：

```bash
# 推送到兩個遠端倉庫
./scripts/push-to-remotes.sh
```

這個腳本會：
1. 檢查當前分支（警告如果不是 main 分支）
2. 先推送到 Forgejo（觸發 Docker 建置）
3. 再推送到 GitHub（備份程式碼）

### 3. 手動推送方式

如果您不想使用腳本，可以手動推送：

```bash
# 推送到 Forgejo（會觸發 Docker 建置）
git push forgejo main

# 推送到 GitHub（備份程式碼）
git push origin main
```

### 4. 本地建置和推送（選項）

如果您想要在本地建置 Docker 映像檔再推送，可以使用：

```bash
# 本地建置並推送
./scripts/build-and-push-docker.sh

# 或者指定特定標籤
./scripts/build-and-push-docker.sh latest
```

這個腳本會：
1. 在本地建置 Docker 映像檔
2. 自動推送到 Forgejo Container Registry
3. 支援多平台建置（linux/amd64, linux/arm64）

## Docker 映像檔

### 映像檔位置
- Registry: `forgejo.hker.me`
- 映像檔名稱: `etklam/diary-vue`
- 完整路徑: `forgejo.hker.me/etklam/diary-vue`

### 標籤策略
系統會自動產生以下標籤：
- `latest` - 最新版本（僅在 main 分支）
- `main-{commit-sha}` - 包含 commit SHA 的標籤
- 版本標籤（如果有 git tag）

### 拉取映像檔

```bash
# 拉取最新版本
docker pull forgejo.hker.me/etklam/diary-vue:latest

# 拉取特定 commit 版本
docker pull forgejo.hker.me/etklam/diary-vue:main-abc123def
```

## 部署到生產環境

### Nginx 反向代理設定（重要 - WebSocket 支援）

由於本應用使用 Socket.io 實現即時 Alert 推播，**必須**在 Nginx 設定中正確配置 WebSocket 支援：

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 設定...
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # WebSocket 代理設定（重要！）
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;  # 24 hours for WebSocket connections
    }

    # 一般 HTTP 代理
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**關鍵設定說明**：
- `proxy_read_timeout 86400` - 必須設定為較大值（24小時），否則 WebSocket 連線會被中斷
- `/socket.io/` 路徑需要專用的 location block
- 必須正確設定 `Upgrade` 和 `Connection` 標頭

### 使用 Docker Compose

更新您的 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  app:
    image: forgejo.hker.me/etklam/diary-vue:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=mysql://user:password@db:3306/diary
      - JWT_SECRET=your-secret-key
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=rootpassword
      - MYSQL_DATABASE=diary
      - MYSQL_USER=user
      - MYSQL_PASSWORD=password
    volumes:
      - mysql_data:/var/lib/mysql
    restart: unless-stopped

volumes:
  mysql_data:
```

### 更新到最新版本

```bash
# 拉取最新映像檔
docker pull forgejo.hker.me/etklam/diary-vue:latest

# 重新建立容器
docker-compose up -d --force-recreate
```

## 工作流程詳情

Forgejo Actions 工作流程 (`.forgejo/workflows/docker.yml`) 會：

1. **觸發條件**：
   - 推送到 main 分支
   - 手動觸發 (workflow_dispatch)

2. **建置步驟**：
   - 檢出程式碼
   - 設置 Docker Buildx
   - 登入 Forgejo Container Registry
   - 提取元數據（標籤、標記）
   - 建置並推送 Docker 映像檔
   - 支援多平台 (linux/amd64, linux/arm64)

3. **快取優化**：
   - 使用 Forgejo Actions 快取加速建置

4. **監控建置**：
   - 您可以在 https://forgejo.hker.me/etklam/diary-vue/actions 查看建置狀態

## 故障排除

### 常見問題

1. **推送失敗 - 權限錯誤**
   - 檢查 PACKAGES_TOKEN 是否有正確的權限
   - 確認 Forgejo 使用者名稱是否正確

2. **建置失敗 - 依賴問題**
   - 檢查 package.json 和 package-lock.json 是否一致
   - 確認 Dockerfile 中的所有步驟都能正常執行

3. **映像檔無法拉取**
   - 確認映像檔已成功推送到 Forgejo
   - 檢查網路連線到 forgejo.hker.me

### 查看建置日誌

1. 前往 Forgejo 倉庫的 Actions 頁面
2. 點擊 "Build and Publish Docker Image" 工作流程
3. 查看詳細的執行日誌

### 本地建置除錯

如果您在使用本地建置腳本時遇到問題：

1. **登入問題**：
   ```bash
   docker login forgejo.hker.me
   # 輸入您的 Forgejo 使用者名稱和密碼或存取權杖
   ```

2. **建置失敗**：
   - 檢查 Dockerfile 是否存在
   - 確認所有依賴項都已正確安裝
   - 查看詳細的錯誤訊息

3. **推送失敗**：
   - 確認已正確登入 Forgejo Container Registry
   - 檢查網路連線
   - 確認有足夠的權限推送映像檔

## 安全注意事項

1. **Secrets 管理**：
   - 永遠不要在程式碼中硬編碼敏感資訊
   - 定期輪換 PACKAGES_TOKEN

2. **映像檔安全**：
   - 定期更新基礎映像檔
   - 使用多階段建置減少攻擊面

3. **網路安全**：
   - 確保生產環境使用 HTTPS
   - 限制資料庫存取權限

## 自動化建議

您可以設置定期更新：

```yaml
# 在 .forgejo/workflows/docker.yml 中添加
on:
  schedule:
    - cron: '0 2 * * 1'  # 每週一凌晨 2 點
```

這將確保即使沒有程式碼變更，Docker 映像檔也會定期更新以包含最新的安全修補程式。

## 兩種部署方式比較

### Forgejo Actions（推薦）
**優點：**
- 自動化程度高
- 無需本地 Docker 環境
- 統一的 CI/CD 流程
- 自動多平台建置

**缺點：**
- 需要設定 Forgejo runner
- 依賴網路連線

### 本地建置
**優點：**
- 更快的建置速度（本地資源）
- 更好的控制建置過程
- 可以在推送前測試映像檔

**缺點：**
- 需要本地 Docker 環境
- 手動流程
- 需要管理本地映像檔

選擇適合您工作流程的方式，或兩者結合使用。
