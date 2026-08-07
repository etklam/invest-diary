# 部署指南 | Deployment Guide

本指南說明如何使用 Docker 或 CapRover 將投資日記系統部署到已有 MySQL 的伺服器上。

This guide explains how to deploy the Investment Diary System using Docker or CapRover to a server with an existing MySQL installation.

## 目錄 | Table of Contents

- [前置要求](#前置要求--prerequisites)
- [準備工作](#準備工作--preparation)
- [部署步驟](#部署步驟--deployment-steps)
- [使用外部 MySQL](#使用外部-mysql--using-external-mysql)
- [反向代理設定](#反向代理設定--reverse-proxy)
- [維護與更新](#維護與更新--maintenance)

---

## 前置要求 | Prerequisites

### 伺服器需求
- **作業系統**: Linux (Ubuntu 20.04+, Debian 11+, CentOS 8+)
- **RAM**: 最低 1GB，建議 2GB+
- **硬碟空間**: 最低 5GB 可用空間
- **網路**: 開放 3000 埠（或使用反向代理）

### 必要軟體

**選項 1: Docker（標準部署）**
```bash
# Docker Engine 20.10+
docker --version

# Docker Compose 2.0+
docker compose version
```

### 外部 MySQL
- **版本**: MySQL 8.0+
- **權限**: 需要能夠建立資料庫和使用者的權限
- **連線**: 確保伺服器可以透過網路連接到 MySQL

---

## 準備工作 | Preparation

### 1. 設定 MySQL 資料庫

在您的 MySQL 伺服器上建立資料庫和使用者：

```sql
-- 連接到 MySQL
mysql -u root -p

-- 建立資料庫
CREATE DATABASE invest_diary CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 建立專用使用者（請修改密碼）
CREATE USER 'diary_user'@'%' IDENTIFIED BY 'your_secure_password_here';

-- 授權
GRANT ALL PRIVILEGES ON invest_diary.* TO 'diary_user'@'%';

-- 重新載入權限
FLUSH PRIVILEGES;

-- 離開
EXIT;
```

### 2. 準備環境變數

建立 `.env` 檔案：

```bash
# 在專案目錄中
cp .env.example .env
nano .env
```

設定以下內容（**請務必修改為您的實際值**）：

```bash
# 資料庫連線字串（請修改為您的 MySQL 伺服器資訊）
DATABASE_URL="mysql://diary_user:your_secure_password_here@your-mysql-host:3306/invest_diary"

# JWT 金鑰（必須是 32 字元以上的隨機字串）
JWT_SECRET="your-very-secure-random-32-character-secret-key-change-this"

# 應用程式名稱
NUXT_PUBLIC_APP_NAME="投資日記"
NUXT_PUBLIC_SITE_URL="https://your-domain.com"

SEC_USER_AGENT="Trade Basic SEC Filings monitored-contact@example.com"
```

### 3. 生成安全的 JWT_SECRET

```bash
# 生成隨機金鑰
openssl rand -base64 32
```

---

## CapRover 部署

CapRover 是一個簡單的 PaaS 平台，可以輕鬆部署 Docker 應用程式。

### 1. 準備 CapRover App

1. 登錄 CapRover 管理面板
2. 建立一個新的 App（例如：`diary-vue`）
3. 在 App Config / HTTP Settings 確認 **WebSocket Support** 已啟用

**WebSocket 注意事項**：

- CapRover 若未啟用 **WebSocket Support**，Nginx 模板中的 `s.websocketSupport` 會是關閉狀態
- 這會導致 `proxy_set_header Upgrade $http_upgrade` 與 `proxy_set_header Connection "upgrade"` 不會被注入
- 結果就是 `/socket.io/` 的 WebSocket upgrade 直接失敗，瀏覽器會持續看到 `wss://.../socket.io` 連線錯誤
- 若你看到這類錯誤，先檢查 CapRover 開關，再檢查自定義 Nginx 是否有覆蓋掉 upgrade headers

### 2. 配置環境變量

在 CapRover App 設定中添加以下環境變量：

```bash
# 資料庫連線字串
DATABASE_URL="mysql://diary_user:password@your-mysql-host:3306/invest_diary"

# JWT 金鑰（必須是 32 字元以上的隨機字串）
JWT_SECRET="your-very-secure-random-32-character-secret-key"

# 應用程式名稱
NUXT_PUBLIC_APP_NAME="投資日記"

# Site URL（用於 SEO/Sitemap）
NUXT_PUBLIC_SITE_URL="https://your-domain.com"

# 調度器啟用狀態（重要！）
# 只在主實例上設置為 "true"，其他實例設為 "false" 或不設置
# 這可以防止多實例環境中的重複執行
SCHEDULER_ENABLED="true"
```

**⚠️ 重要說明**：

- **單實例部署**：設置 `SCHEDULER_ENABLED="true"`
- **多實例部署**：只對其中一個實例設置 `SCHEDULER_ENABLED="true"`，其他實例不設置或設置為 `"false"`

### 3. 配置持久化

如果需要持久化數據，可以在 CapRover 中配置卷（volume）映射。

### 4. 部署

#### 方法 A：直接部署 Git 倉庫

在 CapRover App 設定中：

1. 選擇 "Create New App from Dockerfile"
2. 輸入 Git 倉庫 URL
3. 設置分支（例如：`main`）
4. 點擊 "Create & Deploy"

#### 方法 B：部署預建映像

1. 建置映像並推送到 Docker Registry
2. 在 CapRover App 設定中，選擇 "Deploy Image"
3. 輸入映像名稱（例如：`your-registry/diary-vue:latest`）
4. 點擊 "Deploy"

### 5. 配置域名

1. 在 CapRover App 設定中，點擊 "Domains"
2. 添加域名（例如：`diary.yourdomain.com`）
3. 開啟 HTTPS（Let's Encrypt）

### 6. 監控日誌

在 CapRover 管理面板中：

1. 點擊你的 App
2. 點擊 "Logs" 標籤
3. 查看實時日誌輸出

---

## 部署步驟 | Deployment Steps

### 選項 A: 使用 Docker Build（推薦）

直接在伺服器上建置和執行：

```bash
# 1. 上傳程式碼到伺服器
git clone <your-repo-url> /opt/diary-vue
cd /opt/diary-vue

# 或使用 scp 上傳
# scp -r ./diary-vue user@server:/opt/diary-vue

# 2. 建立 .env 檔案（參考上節）
cp .env.example .env
nano .env

# 3. 建置 Docker 映像檔
docker build -t diary-vue:latest .

# 4. 執行容器
docker run -d \
  --name diary-vue-app \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  -e RUN_MIGRATIONS=true \
  diary-vue:latest

# 5. 檢查容器狀態
docker ps
docker logs diary-vue-app
```

### 選項 B: 使用預建映像檔

如果您已經在其他地方建置好映像檔：

```bash
# 1. 拉取映像檔
docker pull your-registry/diary-vue:latest

# 2. 執行容器（與選項 A 相同）
docker run -d \
  --name diary-vue-app \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  -e RUN_MIGRATIONS=true \
  your-registry/diary-vue:latest
```

---

## 使用外部 MySQL | Using External MySQL

### MySQL 在同一台伺服器上

如果 MySQL 在同一台機器上：

```bash
# 使用 host.docker.internal 連線到主機
DATABASE_URL="mysql://diary_user:password@host.docker.internal:3306/invest_diary"
```

### MySQL 在遠端伺服器上

如果 MySQL 在遠端伺服器上：

```bash
# 直接使用遠端主機的 IP 或域名
DATABASE_URL="mysql://diary_user:password@192.168.1.100:3306/invest_diary"

# 或使用域名
DATABASE_URL="mysql://diary_user:password@mysql.example.com:3306/invest_diary"
```

### 防火牆設定

確保 MySQL 埠（預設 3306）允許來自 Docker 容器的連線：

```bash
# Ubuntu/Debian
sudo ufw allow from 172.16.0.0/12 to any port 3306

# CentOS/RHEL
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="172.16.0.0/12" port protocol="tcp" port="3306" accept'
sudo firewall-cmd --reload
```

---

## 反向代理設定 | Reverse Proxy

### 使用 Nginx

```bash
# 安裝 Nginx
sudo apt update
sudo apt install nginx -y

# 建立設定檔
sudo nano /etc/nginx/sites-available/diary-vue
```

Nginx 設定：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 重導向到 HTTPS（可選但建議）
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 憑證（使用 Let's Encrypt）
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL 設定
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

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

    # 代理設定
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

**重要**: WebSocket 連線需要特定的 Nginx 設定：
- 必須設定 `proxy_read_timeout` 為較大值（建議 86400 秒 = 24 小時）
- 必須正確設定 `Upgrade` 和 `Connection` 標頭
- 必須為 `/socket.io/` 路徑設定專用的 location block

啟用設定：

```bash
# 建立符號連結
sudo ln -s /etc/nginx/sites-available/diary-vue /etc/nginx/sites-enabled/

# 測試設定
sudo nginx -t

# 重新載入 Nginx
sudo systemctl reload nginx
```

### 使用 Let's Encrypt 取得免費 SSL

```bash
# 安裝 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 取得憑證
sudo certbot --nginx -d your-domain.com

# 自動更新已設定
sudo certbot renew --dry-run
```

---

## 維護與更新 | Maintenance

### 查看日誌

```bash
# 即時查看日誌
docker logs -f diary-vue-app

# 查看最近 100 行日誌
docker logs --tail 100 diary-vue-app
```

### 重啟容器

```bash
# 優雅重啟（優先）
docker restart diary-vue-app

# 強制重啟
docker stop diary-vue-app && docker start diary-vue-app
```

### 更新應用程式

```bash
# 1. 拉取最新程式碼
cd /opt/diary-vue
git pull

# 2. 重新建置映像檔
docker build -t diary-vue:latest .

# 3. 停止並移除舊容器
docker stop diary-vue-app
docker rm diary-vue-app

# 4. 執行新容器
docker run -d \
  --name diary-vue-app \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  -e RUN_MIGRATIONS=true \
  diary-vue:latest
```

### 退役舊聊天整合（一次性操作）

這次版本會移除舊聊天機器人的 runtime、路由與四張專用資料表；歷史日記的
`createdVia = TELEGRAM_BOT` 值會保留。正式環境執行部署前，請依序完成：

1. 先在供應商端刪除 webhook，並撤銷舊 bot token，停止外部更新繼續送入舊端點。
2. 先完成 MySQL 備份，確認可還原，再進行任何 schema migration。
3. 先排空並停止仍在執行舊版映像的 app pod / container；不可讓舊版 runtime
   與刪表 migration 同時運行，否則舊版查詢可能在 migration 後失敗。
4. 部署新映像並以受控方式執行 `npx prisma migrate deploy`（或設定
   `RUN_MIGRATIONS=true`），套用
   `20260807100000_remove_telegram_bot_support`。
5. 確認新部署不再注入舊 token / secret 環境變數，並檢查一般 Web 與 API-key
   日記寫入仍可用；舊 webhook 路徑應不再提供 handler。

此 migration 僅刪除聊天整合的專用表，不會改寫或刪除 `diaries` 的歷史來源值。

### 備份與還原

```bash
# 備份資料庫
docker exec mysql-container mysqldump -u root -p invest_diary > backup_$(date +%Y%m%d).sql

# 還原資料庫
docker exec -i mysql-container mysql -u root -p invest_diary < backup_20240101.sql
```

### 清理 Docker 資源

```bash
# 清理未使用的映像檔
docker image prune -a

# 清理未使用的容器
docker container prune

# 清理未使用的卷
docker volume prune

# 一次清理所有
docker system prune -a --volumes
```

---

## Batch CronJobs | 排程任務

Market Rotation snapshot batch 採用 K8s CronJob，每日美東收盤後跑一次。詳細排程、scope 隔離、staleness contract 與 YAML 範例請參考 [Beta Cockpit batch cron schedule](../BETA_COCKPIT.md#batch-cron-schedule)。

- **Manifest**: [`k8s/cron-market-rotation.yaml`](../../k8s/cron-market-rotation.yaml)
- **Entry point**: `scripts/market-rotation/run-batch.ts`
- **Schedule**: `30 21 * * 0-5` (21:30 UTC, Sunday–Friday)

若以 Docker / CapRover 部署而非 K8s，需自備 cron 或外部排程器觸發同一支 script；`docs/BETA_COCKPIT.md` 的失敗處理與 staleness 契約仍然適用。

---

## 健康檢查 | Health Check

應用程式提供健康檢查端點：

```bash
# 檢查應用程式健康狀態
curl http://localhost:3000/api/health

# 預期回應
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
      "environment": "production"
    }
  }
}
```

成功時回傳 HTTP `200`；資料庫檢查失敗時回傳 HTTP `503`，並在
`checks.database.message` 帶出錯誤訊息。

---

## 故障排除 | Troubleshooting

### 容器無法啟動

```bash
# 查看容器日誌
docker logs diary-vue-app

# 檢查容器狀態
docker inspect diary-vue-app
```

### 資料庫連線失敗

```bash
# 測試 MySQL 連線
docker exec diary-vue-app nc -zv your-mysql-host 3306

# 檢查環境變數
docker exec diary-vue-app env | grep DATABASE_URL
```

### 遷移失敗

```bash
# 進入容器手動執行遷移
docker exec -it diary-vue-app sh
npx prisma migrate deploy
```

---

## 安全建議 | Security Recommendations

1. **定期更新**: 保持 Docker 和應用程式更新
2. **強密碼**: 使用強密碼和安全的 JWT_SECRET
3. **HTTPS**: 生產環境必須使用 HTTPS
4. **防火牆**: 只開放必要的埠
5. **備份**: 定期備份資料庫
6. **監控**: 設定日誌監控和告警

---

## 生產環境檢查清單 | Production Checklist

- [ ] 修改所有預設密碼和金鑰
- [ ] 設定強壯的 JWT_SECRET
- [ ] 配置 HTTPS/SSL
- [ ] 設定防火牆規則
- [ ] 配置自動備份
- [ ] 設定日誌輪轉
- [ ] 配置監控和告警
- [ ] 測試災難還原程序
- [ ] 檢查健康檢查端點
- [ ] 驗證所有功能正常運作

---

## 聯絡與支援 | Contact & Support

如有問題，請透過以下方式聯繫：

- **GitHub Issues**: [專案 Issues 頁面]
- **Email**: your-email@example.com

---

**部署完成後，請訪問您的域名並開始使用投資日記系統！**
