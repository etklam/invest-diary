# Forgejo Actions CI：Docker Image 自動建置指南

記錄從零開始設定 Forgejo Actions CI pipeline，自動建置 Docker image 並推送到 Forgejo Container Registry 的完整過程。

---

## 環境背景

| 項目 | 說明 |
|------|------|
| Forgejo 版本 | 自建實例，域名 `git.913555.xyz` |
| Runner | `forgejo/runner:12.9.0`，DooD（Docker outside of Docker）模式 |
| Runner Name | `runner-hk`，tag 為 `hk` |
| 管理 Panel | 1Panel |
| 反向代理 | Nginx |
| 專案 | Nuxt 4 + MySQL，多階段 Dockerfile |

---

## 架構說明

```
┌─────────────┐    Docker Socket     ┌──────────────┐
│   Nginx     │                      │  DinD 容器    │
│  (反向代理)  │──── :443 ──────────▶│  docker:29    │
└─────────────┘    /var/run/          │  tcp://2375   │
                   docker.sock        └──────────────┘
                        │
                        ▼
┌──────────────────────────────┐
│  Forgejo Runner 容器          │
│  forgejo/runner:12.9.0       │
│  - 掛載 host Docker socket    │
│  - tag: hk                   │
│  - 本身不包含 Docker CLI       │
└──────────────────────────────┘
```

Runner 容器掛了 host 的 `/var/run/docker.sock`，但 image 本身不包含 Docker CLI。需要在 workflow 中手動安裝。

---

## 踩過的坑

### 坑 1：Runner 容器沒有 Docker CLI

**症狀**：`docker: command not found`

**原因**：`forgejo/runner:12.9.0` image 只包含 runner binary，沒有 Docker CLI。雖然掛了 Docker socket，但沒有 client 去呼叫。

**解法**：在 workflow 第一步下載 Docker static binary：

```yaml
- name: Install Docker CLI
  run: |
    curl -fsSL https://download.docker.com/linux/static/stable/x86_64/docker-27.5.1.tgz | \
      tar xz --strip-components=1 -C /usr/bin docker/docker
```

**不適用的方法**：
- `apk add docker-cli` — Runner image 不是 Alpine，沒有 `apk`
- `apt-get install docker-cli` — Runner image 沒有 apt cache，也沒裝 apt

---

### 坑 2：Docker static binary 不包含 buildx

**症狀**：`docker: 'buildx' is not a docker command`

**原因**：從 Docker 官方下載的 static binary 不帶 buildx 插件。

**解法**：不用 buildx，直接用 `docker build` + `docker tag` + `docker push`。對於單平台 build 已經夠用。

---

### 坑 3：Runner tag 對不上

**症狀**：Workflow 一直 pending，找不到 runner 執行。

**原因**：Workflow 裡寫 `runs-on: docker`，但 Runner 的 tag 是 `hk`。

**解法**：`runs-on` 要精確匹配 Runner 的 tag：

```yaml
runs-on: hk
```

---

### 坑 4：Push Image 被 401 擋

**症狀**：`docker login` 成功，但 `docker push` 回傳 `401 Unauthorized`。

**原因**：Forgejo Access Token 的 scope 沒有包含 `write:package`。

**解法**：到 Forgejo → Settings → Applications → Access Tokens，建立 token 時勾選：
- `write:package`（必須）
- `read:package`

然後到 repo → Settings → Actions → Secrets，設定 `FORGEJO_TOKEN` 為此 token。

---

### 坑 5：Push Image 被 413 擋

**症狀**：`413 Request Entity Too Large`

**原因**：Nginx 反向代理預設 `client_max_body_size` 為 1MB，Docker image 層（尤其 `node_modules`）遠超此限制。

**解法**：在 Forgejo 對應的 Nginx 配置中加大限制：

```nginx
server {
    server_name git.913555.xyz;
    client_max_body_size 500M;
    # ... 其餘配置
}
```

改完後 reload：`nginx -t && nginx -s reload`

---

### 坑 6：GitHub Actions 專用 action 不適用

**症狀**：使用 `docker/setup-buildx-action@v3`、`docker/login-action@v3` 等 action 各種報錯。

**原因**：這些 action 是為 GitHub Actions 設計的，在 Forgejo Runner 的 DooD 環境下相容性不佳。

**解法**：全部改用原生 Docker CLI 命令，不依賴第三方 action。唯一保留的是 `actions/checkout@v4`，Forgejo 原生支援。

---

### 坑 7：BuildKit 需要 buildx

**症狀**：`BuildKit is enabled but the buildx component is missing or broken`

**原因**：啟用 `DOCKER_BUILDKIT=1` 但 static binary 沒有 buildx。

**解法**：關掉 BuildKit，用傳統 builder。cache 機制仍然有效：

```yaml
docker build \
  --cache-from $REGISTRY/$IMAGE:latest \
  -t $REGISTRY/$IMAGE:$SHA \
  .
```

只要 `package.json` 沒變，`npm install` 層會命中快取，縮短 build 時間。

---

## 最終 Workflow 檔案

```yaml
# .forgejo/workflows/build.yml
name: Build and Push Docker Image

on:
  push:
    branches:
      - main

env:
  REGISTRY: git.913555.xyz
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: hk
    steps:
      - name: Install Docker CLI
        run: |
          curl -fsSL https://download.docker.com/linux/static/stable/x86_64/docker-27.5.1.tgz | \
            tar xz --strip-components=1 -C /usr/bin docker/docker

      - name: Checkout
        uses: actions/checkout@v4

      - name: Login to Forgejo Registry
        run: echo "${{ secrets.FORGEJO_TOKEN }}" | docker login ${{ env.REGISTRY }} -u ${{ github.actor }} --password-stdin

      - name: Pull previous image for cache
        run: docker pull ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest || true

      - name: Build and push
        run: |
          SHA=$(echo "${{ github.sha }}" | cut -c1-7)
          docker build \
            --cache-from ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest \
            -t ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${SHA} \
            .
          docker tag ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${SHA} ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
          docker push ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${SHA}
          docker push ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
```

---

## 設定步驟清單

1. **建立 Access Token**：Forgejo → Settings → Applications → Access Tokens
   - Scope：`write:package` + `read:package`

2. **設定 Repo Secret**：Repo → Settings → Actions → Secrets
   - Name：`FORGEJO_TOKEN`
   - Value：剛建立的 token

3. **修改 Nginx 配置**（如果 Forgejo 前面有 Nginx）：
   - 加入 `client_max_body_size 500M;`

4. **確認 Runner 配置**：
   - Runner 的 `config.yaml` 要掛載 Docker socket：
     ```yaml
     container:
       valid_volumes:
         - "/var/run/docker.sock"
       options: "-v /var/run/docker.sock:/var/run/docker.sock"
     ```

5. **建立 Workflow 檔案**：`.forgejo/workflows/build.yml`

6. **Push 觸發**：
   ```bash
   git push forgejo main
   ```

---

## 使用 Image

```bash
# 拉取最新版本
docker pull git.913555.xyz/etklam/invest-diary:latest

# 拉取特定 commit
docker pull git.913555.xyz/etklam/invest-diary:fc158de
```

在 Forgejo 上查看 Image：
- 個人頁面 → Packages tab
- 或直接 `https://git.913555.xyz/-/packages`

---

## 安全提醒

- **永遠不要在聊天、程式碼、文件中暴露 Token**
- Token 只放在 Forgejo 的 Repo Secrets 中
- Workflow 透過 `${{ secrets.FORGEJO_TOKEN }}` 讀取，不會出現在 log 裡
- 如果 Token 洩漏，立即到 Settings → Applications 撤銷並重建
