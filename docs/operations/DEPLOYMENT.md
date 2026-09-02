# 部署指南 | Deployment Guide

本指南的 Backend Ready v1 正式支援路徑是 K3s + MariaDB 11.4；Prisma provider 名稱仍然是 `mysql`。Docker 只作為 image build/runtime 基礎，CapRover 與外部 MySQL 段落保留作 legacy migration 參考，並不屬於 v1 production support matrix。

The supported Backend Ready v1 path is K3s + MariaDB 11.4. Docker is the image build/runtime substrate; CapRover and external MySQL sections below are retained as legacy migration references and are not part of the v1 production support matrix.

> **Backend v1 support boundary:** production migrations are verified against MariaDB 11.4. Do not treat the legacy CapRover/MySQL examples below as an alternative supported deployment until a separate pinned engine matrix is added.

## 目錄 | Table of Contents

- [前置要求](#前置要求--prerequisites)
- [支援矩陣](#支援矩陣--support-matrix)
- [K3s + MariaDB 11.4（Backend v1）](#k3s--mariadb-114backend-v1)
- [準備工作](#準備工作--preparation)
- [部署步驟](#部署步驟--deployment-steps)
- [使用外部 MySQL](#使用外部-mysql--using-external-mysql)
- [反向代理設定](#反向代理設定--reverse-proxy)
- [維護與更新](#維護與更新--maintenance)

## 支援矩陣 | Support Matrix

| Deployment/database | Status | Notes |
| --- | --- | --- |
| K3s + MariaDB 11.4 | Supported for Backend v1 | Source of truth: `k8s/` manifests and Forgejo release gate |
| Docker standalone | Legacy operational aid | Useful for local/disposable runs; not the v1 production rollout contract |
| CapRover + MySQL | Legacy / unsupported for v1 | Requires a separately pinned migration compatibility matrix |

## K3s + MariaDB 11.4（Backend v1）

正式 production rollout 使用 repository 內的 manifests。先建立並檢查
`diary-vue-db-creds` 與 `diary-vue-app-secrets`，再按以下順序套用：

```bash
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01a-db-secret.yaml -f k8s/01b-app-secret.yaml
kubectl apply -f k8s/02a-mariadb-pvc.yaml -f k8s/02b-mariadb-deployment.yaml -f k8s/02c-mariadb-service.yaml
kubectl rollout status deployment/diary-vue-db -n diary-vue --timeout=120s
kubectl apply -f k8s/03-app-deployment.yaml -f k8s/03b-app-service.yaml -f k8s/04-ingress.yaml
kubectl rollout status deployment/diary-vue-app -n diary-vue --timeout=120s
```

MariaDB credentials、`DATABASE_URL` 與 `JWT_SECRET` 必須由 Kubernetes Secret 提供，
不得寫入 image 或 application logs。Migration 由 release gate / controlled deployment
執行；部署前後使用 `kubectl rollout status` 及 `/api/health` 驗證。

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

### 外部 MySQL（Legacy；不屬於 Backend v1 production support）
- **版本**: MySQL 8.0+（僅供舊環境 migration 參考，未納入 v1 gate）
- **權限**: 需要能夠建立資料庫和使用者的權限
- **連線**: 確保伺服器可以透過網路連接到 MySQL

---

## 準備工作 | Preparation

以下內容只供 legacy Docker/CapRover 環境參考，不是 Backend v1 production rollout。

### 1. 設定 MariaDB/MySQL 資料庫（Legacy）

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

## CapRover 部署（Legacy；不支援 Backend v1）

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

以下 Docker standalone steps 只作 legacy operational aid；正式 production 請使用上方
K3s + MariaDB 11.4 manifests。

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

本節是 legacy migration 參考，不支援 Backend v1 production。

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

### Diary 日期唯一性：legacy reconciliation 維護流程

目前正式環境已完成 `diaries(user_id, date)` 唯一性 migration；以下流程只供仍停在
`20260807080000_add_diary_reconciliation_audit` 之前的 legacy 環境，或從該時點的
備份重建時使用。不要在已經完成 migration 的環境重跑 reconciliation。

普通 `npx prisma migrate deploy` 不會停在 audit-table migration 與 uniqueness
migration 之間。若 legacy 資料有同一使用者、同一 civil date 的 Diary，它會直接在
unique index migration 失敗。因此必須使用以下受控 maintenance sequence：

1. **停止所有寫入。** 將 app deployment scale 至 0，停止 workers、API-key clients
   與任何會建立或更新 Diary 的 job。維護映像必須使用 `RUN_MIGRATIONS=false`，避免
   container entrypoint 偷跑完整 migration。
2. **建立可還原備份。** 使用本文件的 MySQL backup 流程，並在隔離資料庫驗證備份
   可以還原。reconciliation 會搬移關聯並刪除 merged Diary；完整 rollback 依賴備份。
3. **執行 final read-only audit，保存於受控位置。** Audit 可能包含 user ID 與 Diary
   title，不可提交 repository：

   ```bash
   npm run diary:duplicates:audit > /secure/path/diary-duplicates-before.json
   ```

4. **只套用 audit table migration，並登記為 applied。** 不可先執行普通 deploy：

   ```bash
   npx prisma db execute --file prisma/migrations/20260807080000_add_diary_reconciliation_audit/migration.sql
   npx prisma migrate resolve --applied 20260807080000_add_diary_reconciliation_audit
   ```

   若 `prisma migrate status` 已顯示該 migration applied，跳過這一步；不可重建 audit
   table。
5. **預覽並由 maintainer 核准具名 policy。** 預覽不寫資料：

   ```bash
   npm run diary:duplicates:reconcile -- --migration-id=<approved-change-id>
   ```

   輸出會列明 canonical 選擇、content/review fields、tags、固定 child relations，並按
   schema capability 說明是否處理 `DiaryStock`。若政策或 duplicate group 數量與 audit
   不符，停止操作。
6. **在 maintenance window 內執行 reconciliation，再做第二次 audit：**

   ```bash
   npm run diary:duplicates:reconcile -- --apply --migration-id=<approved-change-id>
   npm run diary:duplicates:audit > /secure/path/diary-duplicates-after.json
   ```

   第二次 audit 必須為 0 duplicate groups。任何錯誤都應停止流程並保留 maintenance
   mode；不可靠手改資料「頂住先」。

   Reconciliation 以每個 duplicate group 為一個 transaction：單組內的 content、child
   relations、audit row 與 merged Diary delete 會一起 commit 或 rollback；若多組之間
   中途失敗，較早完成的組別會保留。修正失敗原因後可用相同 migration ID 重跑，已無
   duplicate 的完成組別不會再被處理。重跑前仍須再次 audit，且不可恢復 writers。
7. **套用餘下 migrations 並驗證：**

   ```bash
   npx prisma migrate deploy
   npx prisma migrate status
   ```

   若 uniqueness migration 曾因 duplicate key 失敗，先在完成 reconciliation 後執行：

   ```bash
   npx prisma migrate resolve --rolled-back 20260807090000_enforce_diary_user_date
   npx prisma migrate deploy
   ```

8. **直接驗證資料 invariant 與 index，全部通過後才恢復 app writers：**

   ```sql
   SELECT user_id, DATE(date) AS diary_date, COUNT(*) AS diary_count
   FROM diaries
   GROUP BY user_id, DATE(date)
   HAVING COUNT(*) > 1;

   SELECT COUNT(*) AS non_normalized_dates
   FROM diaries
   WHERE TIME(date) <> '12:00:00';

   SHOW INDEX FROM diaries WHERE Key_name = 'diaries_user_date_key';
   ```

   第一個查詢必須回傳 0 rows，第二個 count 必須為 0；index 必須為 unique，欄位順序
   必須是 `user_id`、`date`。

Repository 提供一次性 MariaDB 驗證命令，會啟動並自動移除 disposable container：

```bash
npm run test:diary-reconciliation:mysql
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

Market Rotation snapshot 與 Sector Breadth 共用 K8s CronJob，每日美東收盤後循序更新。Breadth 必須在 rotation 成功後執行，避免 Market State 繼續靜默使用過期的 `marketBreadthDaily`。詳細排程、scope 隔離、staleness contract 與 YAML 範例請參考 [Beta Cockpit batch cron schedule](../BETA_COCKPIT.md#batch-cron-schedule)。

- **Manifest**: [`k8s/cron-market-rotation.yaml`](../../k8s/cron-market-rotation.yaml)
- **Entry points**: `scripts/market-rotation/run-batch.ts`，接著是 `scripts/market-state/update-breadth.ts`
- **Schedule**: `30 21 * * 0-5` (21:30 UTC, Sunday–Friday)
- **Database access**: 兩支 script 都在 CronJob 內直接使用 `DATABASE_URL` 連線資料庫，不經 HTTP。

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
