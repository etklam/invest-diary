#!/bin/bash
# =============================================================================
# CapRover Deployment Script for Investment Diary System
# =============================================================================
# This script is designed to be used by CapRover (captain-definition)
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# CapRover handles Docker/Compose, no local prerequisite checks needed
check_prerequisites() {
    print_info "Running inside CapRover environment"
}

# Check .env file
check_env_file() {
    print_header "檢查環境變數檔案 | Checking Environment File"

    if [ ! -f .env ]; then
        print_warning ".env 檔案不存在 | .env file not found"
        print_info "從 .env.example 建立 .env 檔案 | Creating .env from .env.example"
        cp .env.example .env
        print_warning "請編輯 .env 檔案並設定必要的環境變數 | Please edit .env and set required variables"
        print_info "至少需要設定：| At minimum, set:"
        echo "  - DATABASE_URL (MySQL 連線字串)"
        echo "  - JWT_SECRET (至少 32 字元的隨機字串)"
        echo ""
        read -p "按 Enter 繼續編輯 .env 檔案... | Press Enter to edit .env file..."
        ${EDITOR:-nano} .env
    else
        print_success ".env 檔案已存在 | .env file exists"
    fi

    # Validate critical variables
    source .env

    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL 未設定 | DATABASE_URL is not set"
        print_info "請在 .env 中設定 DATABASE_URL"
        exit 1
    fi

    if [ -z "$JWT_SECRET" ]; then
        print_error "JWT_SECRET 未設定 | JWT_SECRET is not set"
        print_info "請在 .env 中設定 JWT_SECRET"
        exit 1
    fi

    if [ ${#JWT_SECRET} -lt 32 ]; then
        print_warning "JWT_SECRET 少於 32 字元 | JWT_SECRET is less than 32 characters"
        print_warning "建議使用: openssl rand -base64 32"
    fi

    print_success "環境變數檢查通過 | Environment variables validated"
}

# Test database connection
test_database() {
    print_header "測試資料庫連線 | Testing Database Connection"

    DB_HOST=$(echo "$DATABASE_URL" | grep -oP 'mysql://[^@]*@\K[^:]+' || echo "unknown")
    DB_PORT=$(echo "$DATABASE_URL" | grep -oP 'mysql://[^@]*@[^:]*:\K[0-9]+' || echo "3306")

    print_info "測試連線到 $DB_HOST:$DB_PORT | Testing connection to $DB_HOST:$DB_PORT"

    if nc -zv "$DB_HOST" "$DB_PORT" 2>&1 | grep -q succeeded; then
        print_success "資料庫連線成功 | Database connection successful"
    else
        print_warning "無法連線到資料庫 | Cannot connect to database"
        print_warning "請確保：| Please ensure:"
        echo "  1. MySQL 伺服器正在運行"
        echo "  2. 防火牆允許連線"
        echo "  3. DATABASE_URL 正確設定"
        echo ""
        read -p "是否繼續部署？| Continue deployment? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Build is handled by CapRover based on Dockerfile
build_image() {
    print_info "Image build handled by CapRover"
}

# Container lifecycle is managed by CapRover
remove_existing() {
    print_info "Container lifecycle managed by CapRover"
}

# CapRover runs the container automatically
# This hook is kept for logging purposes only
deploy() {
    print_header "CapRover Deployment"
    print_success "Application container started by CapRover"
}

# Wait for app to be ready
wait_for_app() {
    print_header "等待應用程式啟動 | Waiting for Application to Start"

    print_info "等待應用程式回應... | Waiting for application to respond..."
    max_attempts=30
    attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
            print_success "應用程式已就緒 | Application is ready"
            return 0
        fi
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done

    print_warning "應用程式啟動超時 | Application startup timeout"
    print_info "請檢查容器日誌: docker logs diary-vue-app | Check logs: docker logs diary-vue-app"
}

# Show deployment info
show_info() {
    print_header "部署資訊 | Deployment Information"

    echo -e "${GREEN}應用程式已成功部署！| Application deployed successfully!${NC}\n"
    echo "📍 應用程式 URL | Application URL:"
    echo "   http://localhost:3000"
    echo ""
    echo "🔍 健康檢查 | Health Check:"
    echo "   curl http://localhost:3000/api/health"
    echo ""
    echo "📋 查看日誌 | View Logs:"
    echo "   docker logs -f diary-vue-app"
    echo ""
    echo "🔄 重啟應用程式 | Restart Application:"
    echo "   docker restart diary-vue-app"
    echo ""
    echo "🛑 停止應用程式 | Stop Application:"
    echo "   docker stop diary-vue-app"
    echo ""
    echo "📊 容器狀態 | Container Status:"
    docker ps --filter name=diary-vue-app
}

# Main flow for CapRover (non-interactive)
main() {
    print_header "CapRover Deployment"

    check_prerequisites
    check_env_file
    test_database
    build_image
    deploy

    print_success "CapRover deployment script completed"
}

# Run main function
main
