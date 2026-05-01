# Docs 目錄說明

本目錄包含專案的所有計劃、審查和改善文檔，按狀態分類。

## 📁 目錄結構

```
docs/
├── README.md                                    # 本文件
├── BACKUP_RESTORE.md                            # 備份、恢復與演練流程
├── PLANS_COMPLETENESS_REVIEW.md                 # 文檔完成度審查報告
│
├── archives/            # ❌ 已過時/不再使用
│   ├── IMPLEMENTATION_SUMMARY.md                # 混有已完成與不存在檔案，基礎資訊錯誤
│   └── unfinished-priority-plan.md              # 來源文件缺失，失敗測試數字已過時
│
├── completed/           # ✅ 已完成 (90-100%)
│   ├── TIMELINE_REFACTOR_PLAN.md                # 時間軸重構（Hydration gate, composable 抽離）
│   └── 2026-03-26-document-inventory-status-review.md  # 文檔盤點審查
│
├── ongoing/             # ⚠️ 部分完成 (40-80%)
│   ├── QUALITY_REVIEW.md                        # 品質審查（lint/typecheck gate 待修）
│   ├── 2026-03-22-quicknote-tech-debt-consolidation-plan.md
│   └── 2026-03-22-quicknote-merge-implementation-checklist.md
│
├── ideas/               # 💡 創意/改善想法
│   ├── BLOG_IMPROVEMENT_BRAINSTORM.md            # Blog 改善方案
│   ├── QUICK_NOTE_IMPROVEMENT_BRAINSTORM.md      # Quick Note 改善方案
│   └── TOOLS_REVIEW.md                          # 工具審查與改善
│
├── plans/               # 📋 設計與實施文檔
│   ├── partner-shared-diary/
│   │   └── 2026-04-09-partner-shared-diary-design.md  # 待實施
│   │
│   ├── 2026-02-28-stocks-page-uiux-upgrade-design.md
│   ├── 2026-02-28-stocks-page-uiux-upgrade-implementation.md  # ✅ 完成
│   │
│   ├── 2026-03-03-public-etf-profile-v2-design.md
│   ├── 2026-03-03-public-etf-profile-v2-implementation.md   # ✅ 完成
│   │
│   ├── 2026-03-10-quick-note-center-design.md
│   └── 2026-03-10-quick-note-center-implementation.md      # ✅ 完成
│
└── plans/               # 其他參考文檔
    ├── TESTING.md
    ├── HEALTH_CHECK.md
    └── DOCKER_DEPLOYMENT.md
```

## 🏷️ 狀態標籤說明

| 狀態 | 意義 | 完成度 |
|------|------|--------|
| ✅ 已完成 | 所有主要目標已達成 | 90-100% |
| ⚠️ 部分完成 | 核心功能完成，但仍有待辦事項 | 40-80% |
| ❌ 已過時 | 內容過時或不再適用 | N/A |
| 🆕 待實施 | 已通過設計審查，等待實施 | 0% |

## 📊 當前狀態總覽

### 已完成 ✅
- **Timeline Refactor**: Hydration gate、composable 抽離、型別整合
- **Stocks Page UI/UX**: 搜尋、篩選、快速排序、移動優化
- **Public ETF Profile V2**: Risk/Valuation/RS tabs
- **Quick Note Center**: Modal 桌面置中
- **Backup/Restore Docs**: 資料庫備份、恢復與定期演練流程

### 進行中 ⚠️
- **Quality Review**: Lint/Typecheck gate 需修復
- **Quicknote Merge**: Phase 0 完成，Phase 1 進行中
- **Blog Improvements**: 部分優化完成，cache 待實施
- **Tools Review**: ETF 完成，工具首頁待建

### 待實施 🆕
- **Partner Shared Diary**: 已通過設計審查 (2026-04-09)

### 已過時 ❌
- **Implementation Summary**: 檔案路徑錯誤
- **Unfinished Priority Plan**: 來源文件缺失

## 🚀 下一步行動

詳細行動建議請參考 [`PLANS_COMPLETENESS_REVIEW.md`](./PLANS_COMPLETENESS_REVIEW.md)

**優先級 P0**:
1. 修復 Lint/Typecheck Gate
2. 完成 Quicknote Merge

**優先級 P1**:
1. Blog 緩存優化
2. 工具首頁
3. Partner Shared Diary 實施
