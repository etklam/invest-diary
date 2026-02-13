#!/bin/bash

# 簡化版 Docker 建置和推送腳本（單一平台）
# 使用方式: ./scripts/build-and-push-simple.sh [tag]

set -e

# 配置變數
REGISTRY="forgejo.hker.me"
IMAGE_NAME="etklam/diary-vue"
FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}"

# 取得 git 資訊
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
COMMIT_SHA=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=format:"%s")

# 處理標籤
if [ -z "$1" ]; then
    # 如果沒有指定標籤，使用 branch-commit 格式
    TAG="${CURRENT_BRANCH}-${COMMIT_SHA}"
    # 如果是 main 分支，也加上 latest 標籤
    if [ "$CURRENT_BRANCH" = "main" ]; then
        LATEST_TAG="latest"
    fi
else
    TAG="$1"
    if [ "$1" = "latest" ]; then
        LATEST_TAG="latest"
    fi
fi

echo "🐳 Docker 建置和推送腳本（單一平台版）"
echo "=========================================="
echo "Registry: ${REGISTRY}"
echo "Image: ${IMAGE_NAME}"
echo "Branch: ${CURRENT_BRANCH}"
echo "Commit: ${COMMIT_SHA}"
echo "Message: ${COMMIT_MSG}"
echo "Tag: ${TAG}"
if [ -n "$LATEST_TAG" ]; then
    echo "Latest Tag: ${LATEST_TAG}"
fi
echo

# 檢查 Docker 是否正在運行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未運行，請先啟動 Docker"
    exit 1
fi

# 檢查是否已登入 registry
echo "🔐 檢查 registry 登入狀態..."
# 檢查 Docker 配置文件中是否有 registry 的認證資訊
if docker system info | grep -q "Registry: ${REGISTRY}" || grep -q "${REGISTRY}" ~/.docker/config.json 2>/dev/null; then
    echo "✅ 已登入 ${REGISTRY}"
    PUSH_AFTER_BUILD=true
else
    echo "⚠️  可能尚未登入 ${REGISTRY}"
    echo "   請確認已執行：docker login ${REGISTRY}"
    read -p "是否繼續建置（稍後需手動推送）？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    PUSH_AFTER_BUILD=false
fi

# 建置映像檔
echo "🏗️  建置 Docker 映像檔..."
docker build \
    --tag "${FULL_IMAGE_NAME}:${TAG}" \
    --label "org.opencontainers.image.title=${IMAGE_NAME}" \
    --label "org.opencontainers.image.description=Personal Investment Diary System" \
    --label "org.opencontainers.image.source=https://github.com/etklam/invest-diary" \
    --label "org.opencontainers.image.revision=${COMMIT_SHA}" \
    --label "org.opencontainers.image.created=$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
    --label "org.opencontainers.image.version=${TAG}" \
    .

# 如果是 main 分支，也建置 latest 標籤
if [ -n "$LATEST_TAG" ]; then
    echo "🏷️  建置 latest 標籤..."
    docker tag "${FULL_IMAGE_NAME}:${TAG}" "${FULL_IMAGE_NAME}:${LATEST_TAG}"
fi

echo "✅ 建置完成！"

# 推送映像檔
if [ "$PUSH_AFTER_BUILD" = true ]; then
    echo "📤 推送映像檔到 registry..."
    
    # 設定較小的最大並發上傳數和重試次數
    export DOCKER_CLI_EXPERIMENTAL=enabled
    echo "⚙️  設定推送參數：較小的並發上傳和重試機制"
    
    # 推送主要標籤（帶重試機制）
    echo "推送 ${FULL_IMAGE_NAME}:${TAG}..."
    MAX_RETRIES=3
    RETRY_COUNT=0
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if docker push --max-concurrent-uploads=1 "${FULL_IMAGE_NAME}:${TAG}"; then
            echo "✅ 主要標籤推送成功！"
            break
        else
            RETRY_COUNT=$((RETRY_COUNT + 1))
            if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
                echo "⚠️  推送失敗，等待 10 秒後重試 (${RETRY_COUNT}/${MAX_RETRIES})..."
                sleep 10
            else
                echo "❌ 推送失敗，已達最大重試次數"
                echo "💡 建議："
                echo "   1. 檢查網路連線"
                echo "   2. 嘗試壓縮映像檔大小"
                echo "   3. 聯繫 Forgejo 管理員增加請求大小限制"
                exit 1
            fi
        fi
    done
    
    # 推送 latest 標籤（如果存在）
    if [ -n "$LATEST_TAG" ]; then
        echo "推送 ${FULL_IMAGE_NAME}:${LATEST_TAG}..."
        RETRY_COUNT=0
        
        while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
            if docker push --max-concurrent-uploads=1 "${FULL_IMAGE_NAME}:${LATEST_TAG}"; then
                echo "✅ Latest 標籤推送成功！"
                break
            else
                RETRY_COUNT=$((RETRY_COUNT + 1))
                if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
                    echo "⚠️  推送失敗，等待 10 秒後重試 (${RETRY_COUNT}/${MAX_RETRIES})..."
                    sleep 10
                else
                    echo "❌ 推送失敗，已達最大重試次數"
                    exit 1
                fi
            fi
        done
    fi
    
    echo "✅ 推送完成！"
    echo
    echo "📦 映像檔資訊："
    echo "   主要標籤: ${FULL_IMAGE_NAME}:${TAG}"
    if [ -n "$LATEST_TAG" ]; then
        echo "   Latest 標籤: ${FULL_IMAGE_NAME}:${LATEST_TAG}"
    fi
    echo
    echo "🚀 您可以使用以下命令拉取映像檔："
    echo "   docker pull ${FULL_IMAGE_NAME}:${TAG}"
    if [ -n "$LATEST_TAG" ]; then
        echo "   docker pull ${FULL_IMAGE_NAME}:${LATEST_TAG}"
    fi
else
    echo
    echo "⚠️  映像檔已建置但未推送"
    echo "   請先登入 registry：docker login ${REGISTRY}"
    echo "   然後手動推送："
    echo "   docker push --max-concurrent-uploads=1 ${FULL_IMAGE_NAME}:${TAG}"
    if [ -n "$LATEST_TAG" ]; then
        echo "   docker push --max-concurrent-uploads=1 ${FULL_IMAGE_NAME}:${LATEST_TAG}"
    fi
fi

# 顯示映像檔大小
echo
echo "📊 本地映像檔資訊："
docker images "${FULL_IMAGE_NAME}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"