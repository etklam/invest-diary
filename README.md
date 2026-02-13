# 投資日記系統

一個為投資者設計的個人日記系統，具備 Markdown 寫作功能、應用程式內提醒功能，以及持股管理儀表板。支援多使用者帳號系統、JWT 身份驗證，使用 Nuxt 3、Vue 3、MySQL 和 Prisma ORM 建構。

## ✨ 主要功能

- 📝 **投資日記** - 使用 Markdown 格式建立和編輯日記條目
- 🔔 **智能提醒** - 建立在應用程式內的提醒，在指定時間觸發
- 📊 **持股管理** - 記錄買入/賣出交易，系統自動計算持股部位
- 📈 **持股儀表板** - 檢視所有持股的詳細資訊與成本分配
- 👥 **多使用者系統** - 支援註冊、登入、個人設定管理
- 🌙 **深色模式** - 支援深色/淺色主題切換
- 📱 **PWA 支援** - 可安裝為漸進式 Web 應用程式
- 🌍 **多語言** - 支援繁體中文、簡體中文、英文

## 🚀 快速開始

### 環境需求

- Node.js 18+ 
- MySQL 8.0+
- Git

### 安裝步驟

1. **複製專案**
   ```bash
   git clone <repository-url>
   cd diary-vue
   ```

2. **安裝相依套件**
   ```bash
   npm install
   ```

3. **設定環境變數**
   ```bash
   cp .env.example .env
   # 編輯 .env 檔案設定 DATABASE_URL 和 JWT_SECRET
   ```

4. **設定資料庫**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

5. **啟動開發伺服器**
   ```bash
   npm run dev
   ```

6. **訪問應用程式**
   
   開啟瀏覽器訪問 [http://localhost:3000](http://localhost:3000)

## 🐳 Docker 部署

### 生產環境

```bash
# 設定環境變數
cp .env.example .env

# 啟動服務
docker-compose up -d

# 查看日誌
docker-compose logs -f app
```

### 開發環境

```bash
# 使用開發配置啟動（支援熱重載）
docker-compose -f docker-compose.dev.yml up
```

詳細部署說明請參考 [DEPLOYMENT.md](DEPLOYMENT.md)

## 🛠️ 技術堆疊

| 層級 | 技術 | 用途 |
|------|------|---------|
| **框架** | Nuxt 3 | Vue 3 全端框架 |
| **UI** | Vue 3.5+ | 元件函式庫 |
| **樣式** | Tailwind CSS v3 | 實用優先的 CSS 框架 |
| **資料庫** | MySQL 8.0+ | 關聯式資料庫 |
| **ORM** | Prisma | 型別安全的資料庫客戶端 |
| **驗證** | JWT + bcrypt | 身份驗證與密碼雜湊 |
| **測試** | Vitest | 單元測試與整合測試 |
| **PWA** | @vite-pwa/nuxt | 漸進式 Web 應用程式 |

## 📁 專案結構

```
diary-vue/
├── pages/                 # 頁面路由
├── components/            # Vue 元件
├── server/api/           # API 路由
├── composables/          # Vue 組合式函數
├── middleware/           # 路由中介層
├── prisma/              # 資料庫 Schema 與遷移
├── tests/               # 測試檔案
├── docs/                # 文件
└── scripts/             # 工具腳本
```

## 🧪 測試

```bash
# 執行所有測試
npm test

# 監看模式
npm run test:watch

# 測試覆蓋率報告
npm run test:coverage
```

## 🔧 開發指令

```bash
# 開發
npm run dev              # 啟動開發伺服器

# 建置
npm run build            # 建置生產版本
npm run preview          # 預覽建置結果

# 資料庫
npx prisma studio        # 開啟 Prisma Studio
npm run seed             # 執行資料庫種子

# 健康檢查
npm run health:check     # 系統健康檢查
npm run health:full      # 完整健康檢查 + 建置驗證
```

## 📖 文件

- [CLAUDE.md](CLAUDE.md) - 開發者詳細指南
- [DEPLOYMENT.md](DEPLOYMENT.md) - 部署指南
- [docs/HEALTH_CHECK.md](docs/HEALTH_CHECK.md) - 健康檢查說明
- [docs/TESTING.md](docs/TESTING.md) - 測試指南

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request 來改進這個專案。

## 📄 授權

本專案為個人開發專案，保留所有權利。

---

**注意：** 這是一個個人自用的投資日記系統，專注於實用性而非商業化。沒有廣告、沒有數據收集、沒有不必要的功能，只有純粹的投資管理工具。
