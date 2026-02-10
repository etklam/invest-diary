# GitHub Actions CI/CD 說明

本專案使用 GitHub Actions 進行持續整合與部署。

## Workflow 文件

### 1. `docker-build.yml` - 構建並推送 Docker Image

**觸發條件：**
- 推送到 `main` 分支
- 創建 tag (如 `v1.0.0`)
- 對 `main` 分支的 Pull Request

**功能：**
- 構建 Docker image
- 推送到 GitHub Container Registry (GHCR)
- 自動標記版本（latest、版本號、commit SHA）

### 2. `deploy.yml` - 部署到生產環境

**觸發條件：**
- 推送到 `main` 分支後自動執行
- 手動觸發（GitHub UI 的 workflow_dispatch）

**功能：**
- 透過 SSH 連接到部署伺服器
- 拉取最新 Docker image
- 重啟容器
- 自動執行資料庫遷移（透過 docker-entrypoint.sh）

## 設置步驟

### Step 1: 配置 GitHub Secrets

在 GitHub Repository 中設定以下 Secrets：

#### 部署相關 Secrets (用於 deploy.yml)

| Secret 名稱 | 說明 | 範例 |
|------------|------|------|
| `DEPLOY_HOST` | 部署伺服器的 IP 或域名 | `192.168.1.100` 或 `example.com` |
| `DEPLOY_USER` | SSH 登入用戶名 | `ubuntu` 或 `root` |
| `DEPLOY_SSH_KEY` | SSH 私鑰 | 從 `~/.ssh/id_rsa` 複製 |
| `DEPLOY_PORT` | SSH port (選填，預設 22) | `22` |

**如何設定 Secrets：**
1. 進入 GitHub Repository
2. Settings → Secrets and variables → Actions
3. 點擊 "New repository secret"
4. 輸入名稱和值

### Step 2: 準備部署伺服器

在目標伺服器上：

```bash
# 1. 安裝 Docker 和 Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 2. 安裝 docker-compose (如果沒有)
sudo apt-get update
sudo apt-get install docker-compose-plugin

# 3. 複製 docker-compose.yml 到伺服器
# 將專案中的 docker-compose.yml 上傳到伺服器

# 4. 設定 .env 檔案
cat > .env << EOF
DATABASE_URL="mysql://diary_user:your_password@mysql:3306/invest_diary"
JWT_SECRET="your-production-secret-key"
NUXT_PUBLIC_APP_NAME="投資日記"
EOF

# 5. 首次啟動
docker-compose up -d
```

### Step 3: 生成 SSH 金鑰

如果還沒有 SSH 金鑰：

```bash
# 本地機器上執行
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy

# 將公鑰複製到伺服器
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub user@your-server.com

# 將私鑰內容複製到 GitHub Secret `DEPLOY_SSH_KEY`
cat ~/.ssh/github_actions_deploy
```

## 使用方式

### 自動部署流程

```mermaid
graph LR
    A[推送代碼到 main] --> B[觸發 docker-build.yml]
    B --> C[構建 Docker Image]
    C --> D[推送到 GHCR]
    D --> E[觸發 deploy.yml]
    E --> F[SSH 連接伺服器]
    F --> G[拉取最新 Image]
    G --> H[重啟容器]
    H --> I[自動執行資料庫遷移]
```

### 手動觸發部署

1. 進入 GitHub Repository
2. 點擊 "Actions" 標籤
3. 選擇 "Deploy to Production" workflow
4. 點擊 "Run workflow" → "Run workflow"

## 資料庫遷移說明

✅ **資料庫會自動同步**，無需手動執行！

流程：
1. Prisma migration files 包含在 Docker image 中
2. 容器啟動時，`docker-entrypoint.sh` 自動執行 `prisma migrate deploy`
3. 只會執行**尚未應用**的遷移

**開發新功能時的流程：**
```bash
# 本地開發
npx prisma migrate dev --name add_new_feature

# Commit 遷移文件
git add prisma/migrations/
git commit -m "feat: add new feature"
git push

# 部署後自動執行遷移 ✅
```

## 檢查部署狀態

```bash
# 在伺服器上查看容器狀態
docker ps

# 查看應用日誌
docker logs -f diary-vue-app

# 查看健康狀態
curl http://localhost:3000/api/health

# 重新啟動（如需要）
docker-compose restart
```

## 故障排除

### 問題：部署失敗

```bash
# 查看容器日誌
docker logs diary-vue-app

# 查看所有容器狀態
docker-compose ps

# 重新構建和啟動
docker-compose down
docker-compose up -d --build
```

### 問題：資料庫連線失敗

檢查 `.env` 中的 `DATABASE_URL` 是否正確，以及 MySQL 容器是否正在運行。

### 問題：遷移失敗

```bash
# 在伺服器上手動檢查遷移狀態
docker exec -it diary-vue-app npx prisma migrate status

# 重置資料庫（⚠️ 警告：會刪除所有資料）
docker exec -it diary-vue-app npx prisma migrate reset --force
```

## 進階配置

### 使用 Docker Hub 而非 GHCR

修改 `.github/workflows/docker-build.yml`：

```yaml
env:
  REGISTRY: docker.io
  IMAGE_NAME: your-dockerhub-username/diary-vue
```

並在 Secrets 中加入 `DOCKER_USERNAME` 和 `DOCKER_PASSWORD`。

### 多環境部署

複製 `deploy.yml` 創建不同環境（staging, production），並設定不同的 Secrets。

## 安全建議

1. ✅ 使用強密碼和隨機的 JWT_SECRET
2. ✅ 定期更新依賴套件
3. ✅ 限制 SSH 金鑰的使用範圍
4. ✅ 在伺服器上使用防火牆
5. ✅ 定期備份資料庫

```bash
# 資料庫備份範例
docker exec diary-vue-mysql mysqldump -u root -prootpassword invest_diary > backup_$(date +%Y%m%d).sql
```
