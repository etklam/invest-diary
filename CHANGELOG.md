# Changelog

本檔案所有重要變更均記錄於此，格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/)。

## [Unreleased]

### 計畫中
- **2026-05-01 改善計畫**：Phase 0 資料品質修復（Symbol 正規化、Transaction ID 穩定化、成本法註解統一）
- **安全性加固**：Content-Security-Policy Header、管理端點速率限制、CSRF Token 機制、API Key 創建速率限制、日誌 PII 遮罩
- **程式碼品質統一**：錯誤處理統一（27 處 console.log → 結構化 Logger）、抽取重複 enforceRateLimit、移除冗餘 jsonwebtoken 依賴、requestId 鏈路完整化
- **測試補強**：recurring-alerts 單元測試、API Key 系統測試、ETF Alert/Watchlist 測試、E2E 測試擴充、覆蓋率門檻設定
- **可維護性提升**：更新過時依賴（shiki、@nuxtjs/sitemap、@nuxt/image）、拆分 useQuickNoteComposer、拆分大型組件、Logger 結構化輸出
- **股票追蹤系統（新功能）**：Stock/StockWatchlist/StockTimelineRecord models、Agent API、User-facing API、Frontend 頁面與元件
- **通知系統 + 行動優化**：股票到價提醒、持倉回撤提醒、開單紀律確認、行動體驗優化
- **文檔與開發體驗**：CONTRIBUTING.md、CHANGELOG.md、備份與恢復文檔、API 文檔生成

---

## [2026.04] — 2026-04-26

### Added
- 快速日記交易範本新增「No Trades」選項，允許記錄無交易日記
- 改善 Metadata、無障礙存取性與健康檢查系統
- 落地頁與深色模式表面色調整合，統一整體視覺語言
- How-to-Use 頁面加入螢幕截圖與擴充功能說明
- 新增合作夥伴日記比較功能與 Agent API 流程
- 日記工作區設計與認證流程提升
- 落地頁重新設計，使用全新元件
- 部落格加入完整 i18n 支援，改善 UI/UX
- 認證系統加入全面診斷日誌以利追蹤競爭條件
- 行事曆加入統一 UI 系統與 composable
- 新增股票相對價值評估頁面
- 新增價格計算工具
- 導覽列重構為模組化元件，集中導覽邏輯
- 紀律頁面重構為模組化元件
- 新增 Claude Code 整合設定（.gstack/、CLAUDE.md）

### Changed
- 改善快速日記擷取流程，優化使用者體驗
- UI 元件與頁面同步 Design System 更新
- 改善日記桌面版面配置
- How-to-Use 頁面重新設計，精緻化視覺處理
- 市場資料提供者改用 yahoo-finance2
- 部落格編輯器更換為 md-editor-v3
- 技術債清理：移除棄用程式碼、新增常數、修正型別
- 統一工具頁面 i18n
- 改善計算機與季節性分析 UI
- 改善 UI 層級並清除建構警告
- 更新應用程式圖示，移除未使用的 PNG 資源
- 改善股票頁面
- 清理文件
- 重構 UI 第一版
- 完成 Phase 1-5 交付，更新開發計畫狀態

### Fixed
- 修復 Docker canvas 原生建構依賴問題
- 修復深色模式下 How-to-Use 頁面漸層文字顯示
- 修復 Vite 建構時 inline token bridge CSS 問題
- 修復深色模式對比度、恢復陰影效果、修復淺色模式顏色洩漏
- 修復管理員中介層認證上下文注入問題
- 停用管理員部落格 API 回應快取
- 將管理員中介層範圍限制為部落格寫入路由
- 序列化部落格 BigInt ID 以防止交易日誌載入失敗
- 修復 Dockerfile 建構問題
- 修復管理員認證
- 確保首頁與 How-to-Use 頁面在淺色模式下顯示正確表面顏色
- 修復快速日記深色模式表面顏色
- 強化 CapRover 部署環境的 WebSocket 降級機制
- 修復工具頁面文字溢出問題
- 穩定化 E2E 登入與響應式測試
- 穩定化快速日記瀏覽器流程
- 在 hydration 完成前阻擋認證表單操作
- 強化 WebSocket 重連與提醒恢復機制
- 恢復 WebSocket 啟動與 SSR 認證刷新
- 穩定化認證啟動與登入交接流程
- 對齊文章 metadata 與 i18n 狀態
- 修復語言切換器：切換語言後重新載入頁面
- 新增遺失的 blog.readingTimeLabel i18n key
- PostCSS 警告：將 @import 移到 @tailwind 之前
- 修復登入競爭條件導致立即登出的問題
- 改善 Token 恢復流程，加入診斷日誌
- 強化認證流程與品質閘道
- 註冊 UI 元件並加入遺失的 i18n 翻譯
- 修復 Yahoo Finance 資料擷取
- 增加工具頁面行動響應式覆蓋範圍

---

## [2026.03] — 2026-03-29

### Added
- 精緻化快速筆記工作流程與網站主題
- 更新快速提醒預設值
- 整合快速筆記工作流程
- How-to-Use 頁面以核心工作流程為中心重新設計
- 工具頁面加入行動響應式覆蓋

### Changed
- 合併市場資料提供者
- 統一認證恢復合約
- 加強品質閘道與 WebSocket 啟動
- 強化 API 認證與路由型別
- 更新應用程式圖示
- 移除管理員種子資料
- 保護快速筆記路由需認證

### Fixed
- 恢復部落格型別檢查合約
- 完成快速筆記 Phase 0 合約
- 集中化 ID 解析與輸入驗證
- 共用單一 Refresh Token 管線
- 修復紀律重新排序：取代不安全的查詢
- 將 Refresh Token 以 Hash 儲存
- 對齊 WebSocket 與 HTTP 認證驗證

---

## [2026.02] — 2026-02-28

### Added
- 專案初始化：Nuxt 4 + Vue 3 + TypeScript + Prisma + MySQL 架構
- JWT 認證系統（httpOnly Cookie、Access/Refresh Token、Token 版本控制）
- 投資日記 CRUD 功能（建立、編輯、刪除、列表）
- 交易記錄功能（買入/賣出，含策略、情緒欄位）
- 提醒系統（單次與重複提醒，WEEK/MONTH 模式）
- 紀律管理系統（建立、檢查、完成率追蹤）
- 部落格系統（草稿/發布/封存，支援 slug、分類、標籤）
- 股票季節性分析工具（靜態歷史資料、月份分析、建議）
- PWA 支援（安裝到主畫面、Service Worker 快取策略）
- i18n 國際化（英文/繁體中文/簡體中文）
- 深色/淺色模式主題切換
- Docker 部署（多階段建構、docker-compose）
- 健康檢查系統
- 管理員後台（使用者管理、系統統計）
- ETF 追蹤系統基礎架構（Etf/EtfPrice/EtfAlert/EtfWatchlist）
- API Key 認證機制（支援外部 Agent 寫入）
- 投資組合績效儀表板
- 持倉歷史快照系統

[Unreleased]: https://github.com/user/diary-vue/compare/v2026.04...HEAD
[2026.04]: https://github.com/user/diary-vue/compare/v2026.03...v2026.04
[2026.03]: https://github.com/user/diary-vue/compare/v2026.02...v2026.03
[2026.02]: https://github.com/user/diary-vue/releases/tag/v2026.02
