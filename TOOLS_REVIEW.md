# Tools 功能審查與改善方案
**日期**: 2026-03-12
**範圍**: `/pages/tools` 投資工具集

---

## 📊 當前工具概覽

### 現有工具 (4個)

1. **Stock Seasonality Analyzer** (`seasonality.vue`)
   - 美股月份季節性分析
   - 基於 1950-現在的 S&P 500 歷史數據
   - 靜態數據，無需 API 調用
   - 公開訪問 (`requiresAuth: false`)

2. **Position Sizing Calculator** (`position-sizing.vue`)
   - 倉位管理計算器
   - 4 種策略：金字塔、金字塔變體、矩形、倒金字塔
   - 支援百分比模式和直接輸入模式
   - 公開訪問 (`requiresAuth: false`)

3. **Financial Freedom Calculator** (`financial-freedom.vue`)
   - 財務自由計算器
   - 計算達到財務自由所需時間
   - 支援多種提領率預設 (3%, 4%, 5%)
   - 公開訪問 (`requiresAuth: false`)

4. **ETF Analyzer** (`etf.vue`)
   - ETF 分析工具
   - 實時報價、技術分析、風險評估
   - 整合 Yahoo Finance API
   - 公開訪問 (`requiresAuth: false`)

---

## 🎯 整體評估

### ✅ 優點

1. **功能實用**: 每個工具都解決實際投資需求
2. **設計統一**: 使用相同的 UI 風格和組件
3. **i18n 完整**: 支援多語言 (EN/ZH-TW/ZH-CN)
4. **響應式**: 支援桌面和移動端
5. **計算準確**: 使用專門的 lib 函數處理計算邏輯
6. **SEO 友好**: Seasonality 工具有完整的 meta tags

### ⚠️ 待改善

1. **缺少工具導航**: 沒有統一的工具入口頁面
2. **數據持久化不足**: 計算結果無法保存
3. **缺少歷史記錄**: 無法查看過往計算
4. **無分享功能**: 除了 Seasonality 的複製功能外，其他工具無法分享
5. **缺少教學**: 新手可能不知道如何使用
6. **無收藏功能**: 無法收藏常用配置
7. **ETF 工具性能**: API 調用較慢 (10-12秒超時)
8. **缺少圖表**: Position Sizing 和 Financial Freedom 缺少視覺化

---

## 🚀 改善方案

### 1. 統一工具導航頁面 (P0 - 立即實施)

**問題**: 用戶需要知道 URL 才能訪問工具，缺少統一入口

**方案**: 創建工具導航頁面 `/pages/tools/index.vue`

```vue
<!-- pages/tools/index.vue -->
<template>
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-12">
      <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-4">
        {{ t('tools.index.title') }}
      </h1>
      <p class="text-lg text-gray-600 dark:text-gray-400">
        {{ t('tools.index.subtitle') }}
      </p>
    </div>

    <!-- 工具卡片網格 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Seasonality Analyzer -->
      <NuxtLink
        to="/tools/seasonality"
        class="tool-card group"
      >
        <div class="flex items-start gap-4">
          <div class="tool-icon bg-indigo-100 dark:bg-indigo-900/30">
            <Icon name="heroicons:calendar" class="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {{ t('tools.seasonality.title') }}
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {{ t('tools.seasonality.subtitle') }}
            </p>
            <div class="flex items-center gap-2">
              <span class="badge badge-green">{{ t('tools.index.free') }}</span>
              <span class="badge badge-gray">{{ t('tools.index.noAuth') }}</span>
            </div>
          </div>
          <Icon name="heroicons:arrow-right" class="h-5 w-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
        </div>
      </NuxtLink>

      <!-- Position Sizing -->
      <NuxtLink
        to="/tools/position-sizing"
        class="tool-card group"
      >
        <div class="flex items-start gap-4">
          <div class="tool-icon bg-emerald-100 dark:bg-emerald-900/30">
            <Icon name="heroicons:calculator" class="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {{ t('tools.positionSizing.title') }}
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {{ t('tools.positionSizing.subtitle') }}
            </p>
            <div class="flex items-center gap-2">
              <span class="badge badge-green">{{ t('tools.index.free') }}</span>
              <span class="badge badge-gray">{{ t('tools.index.noAuth') }}</span>
            </div>
          </div>
          <Icon name="heroicons:arrow-right" class="h-5 w-5 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
        </div>
      </NuxtLink>

      <!-- Financial Freedom -->
      <NuxtLink
        to="/tools/financial-freedom"
        class="tool-card group"
      >
        <div class="flex items-start gap-4">
          <div class="tool-icon bg-amber-100 dark:bg-amber-900/30">
            <Icon name="heroicons:banknotes" class="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              {{ t('tools.financialFreedom.title') }}
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {{ t('tools.financialFreedom.subtitle') }}
            </p>
            <div class="flex items-center gap-2">
              <span class="badge badge-green">{{ t('tools.index.free') }}</span>
              <span class="badge badge-gray">{{ t('tools.index.noAuth') }}</span>
            </div>
          </div>
          <Icon name="heroicons:arrow-right" class="h-5 w-5 text-gray-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
        </div>
      </NuxtLink>

      <!-- ETF Analyzer -->
      <NuxtLink
        to="/tools/etf"
        class="tool-card group"
      >
        <div class="flex items-start gap-4">
          <div class="tool-icon bg-purple-100 dark:bg-purple-900/30">
            <Icon name="heroicons:chart-bar" class="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              {{ t('tools.etf.title') }}
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {{ t('tools.etf.subtitle') }}
            </p>
            <div class="flex items-center gap-2">
              <span class="badge badge-green">{{ t('tools.index.free') }}</span>
              <span class="badge badge-gray">{{ t('tools.index.noAuth') }}</span>
              <span class="badge badge-amber">{{ t('tools.index.realtime') }}</span>
            </div>
          </div>
          <Icon name="heroicons:arrow-right" class="h-5 w-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
        </div>
      </NuxtLink>
    </div>

    <!-- 即將推出 -->
    <div class="mt-12">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {{ t('tools.index.comingSoon') }}
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="tool-card-disabled">
          <Icon name="heroicons:chart-pie" class="h-6 w-6 text-gray-400 mb-2" />
          <h4 class="font-medium text-gray-700 dark:text-gray-300">
            {{ t('tools.index.portfolioAnalyzer') }}
          </h4>
        </div>
        <div class="tool-card-disabled">
          <Icon name="heroicons:currency-dollar" class="h-6 w-6 text-gray-400 mb-2" />
          <h4 class="font-medium text-gray-700 dark:text-gray-300">
            {{ t('tools.index.dividendTracker') }}
          </h4>
        </div>
        <div class="tool-card-disabled">
          <Icon name="heroicons:bolt" class="h-6 w-6 text-gray-400 mb-2" />
          <h4 class="font-medium text-gray-700 dark:text-gray-300">
            {{ t('tools.index.optionsCalculator') }}
          </h4>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const { t } = useI18n()

definePageMeta({
  requiresAuth: false
})

useHead({
  title: '投資工具 - Trade Basic',
  meta: [
    { name: 'description', content: '專業投資工具集：美股季節性分析、倉位管理計算器、財務自由計算器、ETF 分析工具。' }
  ]
})
</script>

<style scoped>
.tool-card {
  display: block;
  padding: 1.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  transition: all 0.2s;
}

.tool-card:hover {
  border-color: #6366f1;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
  transform: translateY(-2px);
}

.dark .tool-card {
  background: #1f2937;
  border-color: #374151;
}

.tool-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 4rem;
  height: 4rem;
  border-radius: 0.75rem;
  flex-shrink: 0;
}

.badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.badge-green {
  background: #d1fae5;
  color: #065f46;
}

.badge-blue {
  background: #dbeafe;
  color: #1e40af;
}

.badge-gray {
  background: #f3f4f6;
  color: #4b5563;
}

.badge-amber {
  background: #fef3c7;
  color: #92400e;
}

.tool-card-disabled {
  padding: 1.5rem;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 0.75rem;
  text-align: center;
  opacity: 0.6;
}

.dark .tool-card-disabled {
  background: #111827;
  border-color: #374151;
}
</style>
```

**預期效果**:
- ✅ 統一的工具入口
- ✅ 清晰的工具分類和說明
- ✅ 視覺化標籤 (免費/無需認證/實時)
- ✅ 即將推出的工具預告

**公開訪問說明**:
所有工具都設置為 `requiresAuth: false`，無需登入即可使用：
- Seasonality: 靜態歷史數據分析
- Position Sizing: 客戶端倉位計算
- Financial Freedom: 客戶端財務規劃計算
- ETF Analyzer: 整合 Yahoo Finance 公開 API

---

### 2. 計算結果持久化 (P1)

**問題**: 用戶計算結果無法保存，刷新頁面後丟失

**方案**: 使用 LocalStorage 自動保存
