#!/bin/bash

# 本地建置並推送 Docker 映像檔到 Forgejo Container Registry
# 使用方式: ./scripts/build-and-push-docker.sh [tag]

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

echo "🐳 Docker 建置和推送腳本"
echo "=========================="
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
if ! docker manifest inspect "${REGISTRY}/${IMAGE_NAME}:latest" > /dev/null 2>&1; then
    echo "⚠️  尚未登入 ${REGISTRY}，請先執行："
    echo "   docker login ${REGISTRY}"
    echo "   使用您的 Forgejo 使用者名稱和密碼或存取權杖"
    read -p "是否繼續建置（稍後需手動推送）？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    PUSH_AFTER_BUILD=false
else
    PUSH_AFTER_BUILD=true
fi

# 建置映像檔
echo "🏗️  建置 Docker 映像檔..."

# 檢查是否支援多平台建置
if docker buildx inspect default | grep -q "Platforms:"; then
    echo "使用 buildx 進行多平台建置..."
    docker buildx build \
        --platform linux/amd64,linux/arm64 \
        --tag "${FULL_IMAGE_NAME}:${TAG}" \
        --label "org.opencontainers.image.title=${IMAGE_NAME}" \
        --label "org.opencontainers.image.description=Personal Investment Diary System" \
        --label "org.opencontainers.image.source=https://github.com/etklam/invest-diary" \
        --label "org.opencontainers.image.revision=${COMMIT_SHA}" \
        --label "org.opencontainers.image.created=$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --label "org.opencontainers.image.version=${TAG}" \
        --load \
        .
else
    echo "使用標準 Docker 建置（單一平台）..."
    docker build \
        --tag "${FULL_IMAGE_NAME}:${TAG}" \
        --label "org.opencontainers.image.title=${IMAGE_NAME}" \
        --label "org.opencontainers.image.description=Personal Investment Diary System" \
        --label "org.opencontainers.image.source=https://github.com/etklam/invest-diary" \
        --label "org.opencontainers.image.revision=${COMMIT_SHA}" \
        --label "org.opencontainers.image.created=$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --label "org.opencontainers.image.version=${TAG}" \
        .
fi

# 如果是 main 分支，也建置 latest 標籤
if [ -n "$LATEST_TAG" ]; then
    # 只有在非多平台建置時才需要標記
    if ! docker buildx inspect default | grep -q "Platforms:"; then
        echo "🏷️  建置 latest 標籤..."
        docker tag "${FULL_IMAGE_NAME}:${TAG}" "${FULL_IMAGE_NAME}:${LATEST_TAG}"
    fi
fi

echo "✅ 建置完成！"

# 推送映像檔
if [ "$PUSH_AFTER_BUILD" = true ]; then
    echo "📤 推送映像檔到 registry..."
    
    # 檢查是否需要使用 buildx 推送多平台映像檔
    if docker buildx inspect default | grep -q "Platforms:"; then
        echo "使用 buildx 推送多平台映像檔..."
        docker buildx build \
            --platform linux/amd64,linux/arm64 \
            --tag "${FULL_IMAGE_NAME}:${TAG}" \
            --push \
            .
        
        # 推送 latest 標籤（如果存在）
        if [ -n "$LATEST_TAG" ]; then
            echo "推送 ${FULL_IMAGE_NAME}:${LATEST_TAG}..."
            docker buildx build \
                --platform linux/amd64,linux/arm64 \
                --tag "${FULL_IMAGE_NAME}:${LATEST_TAG}" \
                --push \
                .
        fi
    else
        # 推送主要標籤
        echo "推送 ${FULL_IMAGE_NAME}:${TAG}..."
        docker push "${FULL_IMAGE_NAME}:${TAG}"
        
        # 推送 latest 標籤（如果存在）
        if [ -n "$LATEST_TAG" ]; then
            echo "推送 ${FULL_IMAGE_NAME}:${LATEST_TAG}..."
            docker push "${FULL_IMAGE_NAME}:${LATEST_TAG}"
        fi
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
    echo "   docker push ${FULL_IMAGE_NAME}:${TAG}"
    if [ -n "$LATEST_TAG" ]; then
        echo "   docker push ${FULL_IMAGE_NAME}:${LATEST_TAG}"
    fi
fi

# 顯示映像檔大小
echo
echo "📊 本地映像檔資訊："
docker images "${FULL_IMAGE_NAME}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"