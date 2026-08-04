<template>
  <div class="stocks-page min-h-screen pb-20">
    <!-- Header -->
    <header class="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="flex items-center gap-3 font-display text-2xl font-semibold tracking-tight text-dt-text sm:text-3xl">
            <Icon name="heroicons:presentation-chart-line" class="text-dt-primary" />
            {{ t('stock.dashboard.title') }}
          </h1>
          <div class="mt-1 flex flex-wrap items-center gap-3">
            <p class="text-sm text-dt-text-muted">
              {{ t('stock.dashboard.manageDescription') }}
            </p>
            <span v-if="marketState" class="inline-flex items-center gap-1.5 rounded-full border border-dt-border bg-dt-surface-strong px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-dt-text-muted">
              <span class="h-1.5 w-1.5 rounded-full" :class="marketState === 'REGULAR' ? 'bg-dt-success animate-pulse' : 'bg-dt-warning'"></span>
              {{ t('stock.dashboard.marketState') }}: {{ marketState }}
            </span>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <NuxtLink to="/stocks/watchlist" class="action-btn-muted-dashboard">
            <Icon name="heroicons:queue-list" class="w-4 h-4 mr-2" />
            {{ t('stock.watchlist.title') }}
          </NuxtLink>
          <button
            @click="fetchStockPrices"
            :disabled="isFetchingPrices || cooldownRemaining > 0 || pending"
            class="action-btn-dashboard group"
          >
            <Icon :name="(isFetchingPrices || pending) ? 'svg-spinners:180-ring-with-bg' : 'heroicons:arrow-path'" class="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
            {{ (isFetchingPrices || pending) ? t('stock.fetching') : cooldownRemaining > 0 ? `${cooldownRemaining}s` : t('stock.dashboard.refresh') }}
          </button>
          <NuxtLink to="/" class="action-btn-muted-dashboard">
            <Icon name="heroicons:home" class="w-4 h-4 mr-2" />
            {{ t('stock.dashboard.home') }}
          </NuxtLink>
        </div>
      </div>
    </header>

    <!-- Main Content Grid -->
    <main class="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Top Stats Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <!-- Portfolio Value -->
        <div class="stats-card">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-dt-text-muted">{{ t('stock.dashboard.netLiquidity') }}</span>
            <Icon name="heroicons:banknotes" class="h-5 w-5 text-dt-primary opacity-50" />
          </div>
          <div class="font-data text-2xl font-bold tabular-nums text-dt-text">
            {{ formatCurrency(currentMarketValue || totalCost) }}
          </div>
          <div class="flex items-center gap-1.5 mt-1">
            <span class="text-xs font-medium" :class="(unrealizedAmount || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
              {{ (unrealizedAmount || 0) >= 0 ? '+' : '' }}{{ formatCurrency(unrealizedAmount || 0) }}
            </span>
            <span class="text-[10px] text-slate-400 dark:text-slate-400">{{ t('stock.dashboard.totalPL') }}</span>
          </div>
        </div>

        <!-- Day Change -->
        <div class="stats-card">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-dt-text-muted">{{ t('stock.dashboard.dayChange') }}</span>
            <Icon name="heroicons:bolt" class="h-5 w-5 text-dt-warning opacity-50" />
          </div>
          <div class="text-2xl font-bold tabular-nums" :class="totalDayChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
            {{ totalDayChange >= 0 ? '+' : '' }}{{ formatCurrency(totalDayChange) }}
          </div>
          <div class="flex items-center gap-1.5 mt-1">
            <span class="text-xs font-medium" :class="totalDayChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
              {{ totalDayChange >= 0 ? '+' : '' }}{{ totalDayChangePercent.toFixed(2) }}%
            </span>
            <span class="text-[10px] text-slate-400 dark:text-slate-400">{{ t('stock.dashboard.today') }}</span>
          </div>
        </div>

        <!-- Margin/Equity Ratio or Total Cost -->
        <div class="stats-card">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-dt-text-muted">{{ t('stock.dashboard.totalInvested') }}</span>
            <Icon name="heroicons:credit-card" class="h-5 w-5 text-dt-info opacity-50" />
          </div>
          <div class="font-data text-2xl font-bold tabular-nums text-dt-text">
            {{ formatCurrency(totalCost) }}
          </div>
          <div class="flex items-center gap-1.5 mt-1">
            <span class="text-xs font-medium text-dt-text-muted">
              {{ totalHoldings }} {{ t('stock.dashboard.positions') }}
            </span>
            <span class="text-[10px] text-slate-400 dark:text-slate-400">{{ t('stock.dashboard.active') }}</span>
          </div>
        </div>

        <!-- Unrealized P/L % -->
        <div class="stats-card">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-dt-text-muted">{{ t('stock.dashboard.unrealizedPLPercent') }}</span>
            <Icon name="heroicons:arrow-trending-up" class="h-5 w-5 text-dt-success opacity-50" />
          </div>
          <div class="text-2xl font-bold tabular-nums" :class="totalUnrealizedPct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
            {{ totalUnrealizedPct >= 0 ? '+' : '' }}{{ totalUnrealizedPct.toFixed(2) }}%
          </div>
          <div class="flex items-center gap-1.5 mt-1">
            <div class="w-full bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
              <div 
                class="h-full" 
                :class="totalUnrealizedPct >= 0 ? 'bg-green-500' : 'bg-red-500'"
                :style="{ width: Math.min(Math.abs(totalUnrealizedPct) * 2, 100) + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <section class="panel-dashboard p-6 mb-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="font-bold text-dt-text flex items-center gap-2 text-base">
              <Icon name="heroicons:shield-exclamation" class="text-amber-500" />
              {{ t('stock.riskSummary.title') }}
            </h2>
            <p class="mt-1 text-xs text-dt-text-muted">
              {{ t('stock.riskSummary.description') }}
            </p>
          </div>
          <span
            class="rounded-full px-3 py-1 text-xs font-bold"
            :class="concentrationWarning ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'"
          >
            {{ concentrationWarning ? t('stock.riskSummary.warning') : t('stock.riskSummary.balanced') }}
          </span>
        </div>

        <div class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div class="risk-metric">
            <span>{{ t('stock.riskSummary.largestPosition') }}</span>
            <strong>{{ largestPositionPct.toFixed(1) }}%</strong>
            <small>{{ largestPositionSymbol || t('stock.riskSummary.noPosition') }}</small>
          </div>
          <div class="risk-metric">
            <span>{{ t('stock.riskSummary.top3Concentration') }}</span>
            <strong>{{ top3ConcentrationPct.toFixed(1) }}%</strong>
            <small>{{ t('stock.riskSummary.byValue') }}</small>
          </div>
          <div class="risk-metric">
            <span>{{ t('stock.riskSummary.activePositionCount') }}</span>
            <strong>{{ activePositionCount }}</strong>
            <small>{{ t('stock.dashboard.positions') }}</small>
          </div>
          <div class="risk-metric">
            <span>{{ t('stock.riskSummary.unrealizedPnl') }}</span>
            <strong :class="unrealizedAmount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
              {{ unrealizedAmount >= 0 ? '+' : '' }}{{ formatCurrency(unrealizedAmount) }}
            </strong>
            <small>{{ totalUnrealizedPct >= 0 ? '+' : '' }}{{ totalUnrealizedPct.toFixed(2) }}%</small>
          </div>
          <div class="risk-metric">
            <span>{{ t('stock.riskSummary.priceBasis') }}</span>
            <strong>{{ t('stock.riskSummary.costFallback') }}</strong>
            <small>{{ t('stock.riskSummary.costFallbackHint') }}</small>
          </div>
        </div>
      </section>

      <!-- ── Portfolio Exposure vs Suggested Allocation (T7) ── -->
      <section class="mb-6">
        <PortfolioExposurePanel
          :exposure="portfolioExposure"
          :gaps="portfolioExposureGaps"
          :beta-allocation="portfolioBetaAllocation"
          :market-state="portfolioExposureMarketState"
          :last-updated="portfolioExposureLastUpdated"
          :pending="portfolioExposurePending"
        />
      </section>

      <!-- Main Layout Grid: Holdings Table (Left) + Portfolio Analysis (Right) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Holdings Table Section -->
        <div class="lg:col-span-8 space-y-6">
          <div class="panel-dashboard overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <h3 class="font-bold text-dt-text flex items-center gap-2 text-base">
                <Icon name="heroicons:list-bullet" class="text-blue-500" />
                {{ t('stock.dashboard.activePositions') }}
              </h3>
              <div class="flex items-center gap-2">
                <div class="relative">
                  <Icon name="heroicons:magnifying-glass" class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
                  <input
                    v-model="searchQuery"
                    type="text"
                    :placeholder="t('stock.dashboard.searchPlaceholder')"
                    class="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-dt-text placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                </div>
              </div>
            </div>

            <div v-if="pending" class="py-12">
              <AppSkeleton variant="table-row" :count="5" />
            </div>

            <div v-else class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                    <th class="px-6 py-3 cursor-pointer hover:text-blue-500 transition-colors" @click="sortBy('symbol')">{{ t('stock.symbol') }}</th>
                    <th class="px-6 py-3 text-right">{{ t('stock.dashboard.price') }} / Day %</th>
                    <th class="px-6 py-3 text-right">{{ t('stock.dashboard.marketValue') }}</th>
                    <th class="px-6 py-3 text-right">{{ t('stock.avgPrice') }}</th>
                    <th class="px-6 py-3 text-right">{{ t('stock.dashboard.unrealizedPL') }}</th>
                    <th class="px-6 py-3 text-right">{{ t('stock.dashboard.portfolioPercent') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800/50">
                  <tr
                    v-for="holding in sortedHoldings"
                    :key="holding.symbol"
                    v-memo="[
                      holding.symbol,
                      holding.price,
                      holding.dayChangePercent,
                      holding.marketValue,
                      holding.unrealizedAmount,
                      holding.unrealizedPct
                    ]"
                    class="group hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                  >
                    <td class="px-6 py-4">
                      <div class="flex flex-col">
                        <span class="text-sm font-bold text-blue-600 dark:text-blue-400">{{ holding.symbol }}</span>
                        <span class="text-[10px] text-slate-400 dark:text-slate-400">{{ formatQuantity(holding.quantity) }} {{ t('stock.dashboard.shares') }}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <div class="flex flex-col items-end">
                        <span class="text-sm font-semibold tabular-nums text-dt-text">
                          {{ holding.price ? formatCurrency(holding.price) : '—' }}
                        </span>
                        <span v-if="holding.dayChangePercent !== undefined" class="text-[10px] font-bold tabular-nums" :class="holding.dayChangePercent >= 0 ? 'text-green-500' : 'text-red-500'">
                          {{ holding.dayChangePercent >= 0 ? '▲' : '▼' }} {{ Math.abs(holding.dayChangePercent).toFixed(2) }}%
                        </span>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <div class="text-sm font-medium tabular-nums text-dt-text">
                        {{ holding.marketValue ? formatCurrency(holding.marketValue) : formatCurrency(holding.totalCost) }}
                      </div>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <div class="text-xs text-dt-text-muted tabular-nums">
                        {{ formatCurrency(holding.avgCost) }}
                      </div>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <div class="flex flex-col items-end">
                        <span class="text-sm font-bold tabular-nums" :class="(holding.unrealizedAmount || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                          {{ (holding.unrealizedAmount || 0) >= 0 ? '+' : '' }}{{ formatCurrency(holding.unrealizedAmount || 0) }}
                        </span>
                        <span v-if="holding.unrealizedPct !== null" class="text-[10px] font-medium opacity-80" :class="holding.unrealizedPct >= 0 ? 'text-green-500' : 'text-red-500'">
                          {{ holding.unrealizedPct >= 0 ? '+' : '' }}{{ holding.unrealizedPct.toFixed(2) }}%
                        </span>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <div class="flex items-center justify-end gap-3">
                        <span class="text-xs font-semibold text-dt-text-muted">
                          {{ formatPercentage(holding.totalCost) }}
                        </span>
                        <div class="w-12 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden hidden sm:block">
                          <div class="bg-blue-500 h-full" :style="{ width: formatPercentage(holding.totalCost) }"></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Right Side: Analysis & Charts -->
        <div class="lg:col-span-4 space-y-6">
          <!-- Allocation Card -->
          <div class="panel-dashboard p-6">
            <h3 class="font-bold text-dt-text flex items-center gap-2 mb-6 text-base">
              <Icon name="heroicons:chart-pie" class="text-indigo-500" />
              {{ t('stock.dashboard.assetAllocation') }}
            </h3>

            <div class="flex justify-center mb-6">
              <div class="relative w-48 h-48">
                <svg viewBox="0 0 100 100" class="w-full h-full transform -rotate-90">
                  <circle
                    v-for="(slice, index) in donutSlices"
                    :key="index"
                    cx="50"
                    cy="50"
                    :r="slice.radius"
                    fill="transparent"
                    :stroke="slice.color"
                    :stroke-width="slice.strokeWidth"
                    :stroke-dasharray="slice.dashArray"
                    :stroke-dashoffset="slice.dashOffset"
                    class="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span class="text-2xl font-black text-dt-text">{{ totalHoldings }}</span>
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ t('stock.dashboard.assets') }}</span>
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <div v-for="(slice, index) in pieSlices.slice(0, 5)" :key="index" class="flex items-center justify-between group">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full" :style="{ backgroundColor: slice.color }"></div>
                  <span class="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-500 transition-colors">{{ slice.label }}</span>
                </div>
                <span class="text-xs font-medium text-slate-500">{{ slice.percentage }}</span>
              </div>
              <div v-if="pieSlices.length > 5" class="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ t('stock.dashboard.moreAssets', { count: pieSlices.length - 5 }) }}</span>
              </div>
            </div>
          </div>

          <!-- Quick Trade Shortcut -->
          <div class="panel-dashboard p-6 bg-blue-600/5 dark:bg-blue-400/5 border-blue-200 dark:border-blue-900/50">
            <h3 class="font-bold text-dt-text flex items-center gap-2 mb-4 text-base">
              <Icon name="heroicons:plus-circle" class="text-blue-500" />
              {{ t('stock.dashboard.quickTransaction') }}
            </h3>
            <p class="text-xs text-dt-text-muted mb-4">{{ t('stock.dashboard.quickTransactionDesc') }}</p>
            <NuxtLink to="/diaries/new" class="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-500/20 active:scale-95">
              <Icon name="heroicons:pencil-square" class="w-4 h-4" />
              {{ t('stock.dashboard.logNewTrade') }}
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- ── 績效儀表板 ── -->
      <section class="mt-8">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-dt-text flex items-center gap-2">
            <Icon name="heroicons:chart-bar-square" class="text-indigo-500" />
            已實現績效
          </h2>
          <div class="flex items-center gap-2">
            <!-- 匯出按鈕 -->
            <button
              v-if="perfData && perfData.summary.totalClosedTrades > 0"
              @click="exportTrades"
              :disabled="isExporting"
              class="action-btn-muted-dashboard text-xs gap-1.5"
            >
              <Icon
                :name="isExporting ? 'heroicons:arrow-path' : 'heroicons:arrow-down-tray'"
                class="w-4 h-4"
                :class="{ 'animate-spin': isExporting }"
              />
              {{ isExporting ? '匯出中...' : '匯出 CSV' }}
            </button>
            <!-- 時間範圍切換 -->
            <div class="flex items-center gap-1 rounded-dt-sm border border-dt-border bg-dt-surface-strong p-1">
              <button
                v-for="opt in periodOptions"
                :key="opt.value"
                type="button"
                @click="selectedPeriod = opt.value"
                class="min-h-11 min-w-11 rounded-dt-sm px-3 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-dt-primary/30"
                :class="selectedPeriod === opt.value
                  ? 'bg-dt-primary text-white shadow-sm'
                  : 'text-dt-text-muted hover:bg-dt-surface hover:text-dt-text'"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- 績效統計卡片 -->
        <div v-if="perfPending" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div v-for="i in 4" :key="i" class="stats-card animate-pulse">
            <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20 mb-3"></div>
            <div class="h-7 bg-slate-200 dark:bg-slate-700 rounded w-28"></div>
          </div>
        </div>

        <div v-else-if="perfData" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <!-- 勝率 -->
          <div class="stats-card">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-semibold text-dt-text-muted uppercase tracking-wider">勝率</span>
              <Icon name="heroicons:trophy" class="w-5 h-5 text-amber-500 opacity-50" />
            </div>
            <div class="text-2xl font-bold tabular-nums"
              :class="perfData.summary.winRate >= 50 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
              {{ perfData.summary.totalClosedTrades > 0 ? perfData.summary.winRate.toFixed(1) + '%' : 'N/A' }}
            </div>
            <div class="text-[10px] text-slate-400 mt-1">
              {{ perfData.summary.wins }}W / {{ perfData.summary.losses }}L
              · {{ perfData.summary.totalClosedTrades }} 筆
            </div>
          </div>

          <!-- 已實現損益 -->
          <div class="stats-card">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-semibold text-dt-text-muted uppercase tracking-wider">已實現損益</span>
              <Icon name="heroicons:currency-dollar" class="w-5 h-5 text-emerald-500 opacity-50" />
            </div>
            <div class="text-2xl font-bold tabular-nums"
              :class="perfData.summary.totalRealizedPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
              {{ perfData.summary.totalRealizedPnL >= 0 ? '+' : '' }}{{ formatCurrency(perfData.summary.totalRealizedPnL) }}
            </div>
            <div class="text-[10px] text-slate-400 mt-1">累積已關閉部位</div>
          </div>

          <!-- 最大回撤 -->
          <div class="stats-card">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-semibold text-dt-text-muted uppercase tracking-wider">最大回撤</span>
              <Icon name="heroicons:arrow-trending-down" class="w-5 h-5 text-red-500 opacity-50" />
            </div>
            <div class="text-2xl font-bold tabular-nums"
              :class="perfData.summary.maxDrawdownPct > 20 ? 'text-red-600 dark:text-red-400' : 'text-dt-text'">
              {{ perfData.summary.totalClosedTrades > 0 ? '-' + perfData.summary.maxDrawdownPct.toFixed(1) + '%' : 'N/A' }}
            </div>
            <div class="text-[10px] text-slate-400 mt-1">損益曲線最大跌幅</div>
          </div>

          <!-- 夏普比率 -->
          <div class="stats-card">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-semibold text-dt-text-muted uppercase tracking-wider">夏普比率</span>
              <Icon name="heroicons:scale" class="w-5 h-5 text-purple-500 opacity-50" />
            </div>
            <div class="text-2xl font-bold tabular-nums"
              :class="perfData.summary.sharpe === null ? 'text-slate-400' :
                perfData.summary.sharpe >= 1 ? 'text-green-600 dark:text-green-400' :
                perfData.summary.sharpe >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'">
              {{ perfData.summary.sharpe !== null ? perfData.summary.sharpe.toFixed(2) : 'N/A' }}
            </div>
            <div class="text-[10px] text-slate-400 mt-1">月度風險調整後收益</div>
          </div>
        </div>

        <!-- 損益趨勢圖 -->
        <div v-if="perfData && perfData.periodStats.length > 0" class="panel-dashboard p-6 mb-6">
          <h3 class="font-bold text-dt-text flex items-center gap-2 mb-6 text-sm">
            <Icon name="heroicons:chart-bar" class="text-indigo-400" />
            損益走勢（{{ periodLabel }}）
          </h3>
          <div class="h-56">
            <Bar :data="barChartData" :options="barChartOptions" />
          </div>
        </div>

        <!-- 空狀態 -->
        <div v-else-if="!perfPending && (!perfData || perfData.summary.totalClosedTrades === 0)"
          class="panel-dashboard p-10 text-center">
          <Icon name="heroicons:chart-bar-square" class="w-12 h-12 text-slate-300 dark:text-slate-300 mx-auto mb-3" />
          <p class="text-sm font-medium text-dt-text-muted">尚無已實現交易</p>
          <p class="text-xs text-slate-400 dark:text-slate-400 mt-1">完成第一筆買入並賣出後，績效指標將會出現</p>
        </div>

        <!-- 資金曲線（折線圖） -->
        <div v-if="perfData && perfData.equityCurve && perfData.equityCurve.length > 1" class="panel-dashboard p-6 mb-6">
          <h3 class="font-bold text-dt-text flex items-center gap-2 mb-6 text-sm">
            <Icon name="heroicons:chart-bar" class="text-indigo-400" />
            資金曲線（累積損益）
          </h3>
          <div class="h-48">
            <Line :data="equityCurveData" :options="equityCurveOptions" />
          </div>
        </div>

        <!-- 各股票損益分析（橫條圖） -->
        <div v-if="perfData && perfData.symbolBreakdown && perfData.symbolBreakdown.length > 0" class="panel-dashboard p-6 mb-6">
          <h3 class="font-bold text-dt-text flex items-center gap-2 mb-6 text-sm">
            <Icon name="heroicons:chart-bar" class="text-emerald-400" />
            各股票損益（前 10）
          </h3>
          <div :style="{ height: Math.min(perfData.symbolBreakdown.length, 10) * 36 + 24 + 'px' }">
            <Bar :data="symbolBarData" :options="symbolBarOptions" />
          </div>
        </div>

        <!-- 最佳 / 最差交易 -->
        <div v-if="perfData && (perfData.topWins.length > 0 || perfData.topLosses.length > 0)"
          class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Top Wins -->
          <div class="panel-dashboard overflow-hidden">
            <div class="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-950/20">
              <h3 class="text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <Icon name="heroicons:arrow-trending-up" class="w-4 h-4" />
                最佳交易
              </h3>
            </div>
            <div class="divide-y divide-slate-100 dark:divide-slate-800">
              <div v-for="t in perfData.topWins" :key="t.id" class="px-5 py-3 flex items-center justify-between">
                <div>
                  <span class="text-sm font-bold text-dt-text">{{ t.symbol }}</span>
                  <span class="ml-2 text-xs text-slate-400">{{ formatTradeDate(t.sellDate) }}</span>
                </div>
                <div class="text-right">
                  <div class="text-sm font-bold text-green-600 dark:text-green-400 tabular-nums">
                    +{{ formatCurrency(t.realizedPnL) }}
                  </div>
                  <div class="text-[10px] text-green-500 tabular-nums">+{{ t.realizedPnLPct.toFixed(1) }}%</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Top Losses -->
          <div class="panel-dashboard overflow-hidden">
            <div class="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-red-50/50 dark:bg-red-950/20">
              <h3 class="text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                <Icon name="heroicons:arrow-trending-down" class="w-4 h-4" />
                最差交易
              </h3>
            </div>
            <div class="divide-y divide-slate-100 dark:divide-slate-800">
              <div v-for="t in perfData.topLosses" :key="t.id" class="px-5 py-3 flex items-center justify-between">
                <div>
                  <span class="text-sm font-bold text-dt-text">{{ t.symbol }}</span>
                  <span class="ml-2 text-xs text-slate-400">{{ formatTradeDate(t.sellDate) }}</span>
                </div>
                <div class="text-right">
                  <div class="text-sm font-bold text-red-600 dark:text-red-400 tabular-nums">
                    {{ formatCurrency(t.realizedPnL) }}
                  </div>
                  <div class="text-[10px] text-red-500 tabular-nums">{{ t.realizedPnLPct.toFixed(1) }}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Bar, Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  type ChartData,
  type ChartOptions,
  BarElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  Filler,
} from 'chart.js'
import type { QuoteResponse } from '~/lib/market-data/yahoo'
import { formatCurrency } from '~/lib/format'
import { watchDebounced } from '@vueuse/core'
import { usePortfolioExposure } from '~/composables/usePortfolioExposure'

ChartJS.register(BarElement, LinearScale, CategoryScale, Tooltip, Legend, LineElement, PointElement, Filler)

// Track cooldown timer for cleanup
let cooldownTimer: ReturnType<typeof setInterval> | null = null
import {
  buildHoldingChartSegments,
  formatHoldingQuantity,
  formatHoldingShare,
} from '~/lib/stocks-analytics'
import {
  applyStocksView,
  computePortfolioAggregations,
  type ConcentrationFilter,
  type HoldingView,
  type HoldingViewInput,
  type ProfitStatusFilter,
  type SortDirection,
  type StocksSortKey
} from '~/lib/stocks-view'

const { t } = useI18n()

definePageMeta({
  middleware: 'auth'
})

// Fetch holdings from API
const { data: holdings, pending } = await useLazyFetch<HoldingViewInput[]>(
  '/api/stocks/holdings',
  {
    server: false,
    default: () => []
  }
)

const searchQuery = ref('')
const debouncedSearchQuery = ref('')
const profitStatusFilter = ref<ProfitStatusFilter>('all')
const concentrationFilter = ref<ConcentrationFilter>('all')
const sortColumn = ref<StocksSortKey>('totalCost')
const sortDirection = ref<SortDirection>('desc')
const marketState = ref<string | null>(null)

// Debounce search to avoid excessive re-renders (300ms)
watchDebounced(
  searchQuery,
  (value: string) => {
    debouncedSearchQuery.value = value
  },
  { debounce: 300, maxWait: 1000 }
)

// Sorting logic
const sortBy = (key: StocksSortKey) => {
  if (sortColumn.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = key
    sortDirection.value = 'desc'
  }
}

const baseHoldings = computed(() => holdings.value ?? [])

const sortedHoldings = computed<HoldingView[]>(() => {
  return applyStocksView(baseHoldings.value, {
    search: debouncedSearchQuery.value,
    profitStatus: profitStatusFilter.value,
    concentration: concentrationFilter.value,
    sortKey: sortColumn.value,
    sortDir: sortDirection.value
  })
})

// Stats calculations - use shared aggregation logic (optimized: single computed)
const stats = computed(() => computePortfolioAggregations(baseHoldings.value))
const totalHoldings = computed(() => stats.value.totalHoldings)
const totalCost = computed(() => stats.value.totalCost)
const currentMarketValue = computed(() => stats.value.currentMarketValue)
const unrealizedAmount = computed(() => stats.value.unrealizedAmount)
const totalUnrealizedPct = computed(() => stats.value.unrealizedPct)
const totalDayChange = computed(() => stats.value.totalDayChange)
const totalDayChangePercent = computed(() => stats.value.totalDayChangePercent)
const largestPositionPct = computed(() => stats.value.largestPositionPct)
const top3ConcentrationPct = computed(() => stats.value.top3ConcentrationPct)
const activePositionCount = computed(() => stats.value.activePositionCount)
const concentrationWarning = computed(() => stats.value.concentrationWarning)
const largestPositionSymbol = computed(() => stats.value.largestPositionSymbol)

// ── Portfolio Exposure panel (T7) ──────────────────────────────────
const {
  exposure: portfolioExposure,
  gaps: portfolioExposureGaps,
  betaAllocation: portfolioBetaAllocation,
  marketState: portfolioExposureMarketState,
  lastUpdated: portfolioExposureLastUpdated,
  pending: portfolioExposurePending,
} = usePortfolioExposure()

// Formatting
const formatQuantity = (qty: number) => formatHoldingQuantity(qty)
const formatPercentage = (cost: number) => formatHoldingShare(cost, totalCost.value)

// Chart data
const donutSlices = computed(() => buildHoldingChartSegments(baseHoldings.value, {
  radius: 38,
  strokeWidth: 12,
}))

const pieSlices = computed(() => donutSlices.value.map(slice => ({
  label: slice.label,
  percentage: slice.percentage,
  color: slice.color,
})))

// Price fetching
const isFetchingPrices = ref(false)
const cooldownRemaining = ref(0)
const COOLDOWN_SECONDS = 30

const fetchStockPrices = async () => {
  if (isFetchingPrices.value || cooldownRemaining.value > 0) return

  const toast = useToast()
  try {
    // Don't show warning if data is still loading or if truly no holdings
    if (!baseHoldings.value.length && !pending.value) {
      toast.warning(t('stock.noHoldingsData'))
      return
    }

    // Wait for initial data to load before fetching prices
    if (pending.value) {
      toast.info(t('stock.dashboard.synchronizing'))
      return
    }

    if (!baseHoldings.value.length) {
      return
    }

    isFetchingPrices.value = true
    const symbols = baseHoldings.value.map(h => h.symbol)

    const pricesData = await $fetch<Record<string, QuoteResponse>>('/api/stocks/prices', {
      method: 'POST',
      body: { symbols }
    })

    // Update holdings with rich data from QuoteResponse
    holdings.value = baseHoldings.value.map(h => {
      const quote = pricesData[h.symbol]
      if (!quote) return h
      
      // Update market state from the first quote
      if (!marketState.value) marketState.value = quote.marketState

      return {
        ...h,
        price: quote.regularMarketPrice,
        dayChange: quote.change,
        dayChangePercent: quote.changePercent
      }
    })

    toast.success(t('stock.dashboard.portfolioUpdated'))

    // Cooldown logic with cleanup
    cooldownRemaining.value = COOLDOWN_SECONDS
    cooldownTimer = setInterval(() => {
      cooldownRemaining.value--
      if (cooldownRemaining.value <= 0 && cooldownTimer) {
        clearInterval(cooldownTimer)
        cooldownTimer = null
      }
    }, 1000)
  } catch {
    toast.error(t('stock.dashboard.couldNotRefresh'))
  } finally {
    isFetchingPrices.value = false
  }
}

// Initial fetch - wait for data to load before fetching prices
watch(
  () => [pending.value, baseHoldings.value.length] as const,
  ([isPending, holdingsCount]) => {
    // Only fetch prices when initial data load completes and we have holdings
    if (!isPending && holdingsCount > 0 && !marketState.value) {
      fetchStockPrices()
    }
  },
  { immediate: true }
)

// Cleanup cooldown timer on component unmount
onScopeDispose(() => {
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
    cooldownTimer = null
  }
})

// ─── 績效儀表板 ───────────────────────────────────────────────────────────────

type PerfPeriod = 'month' | 'quarter' | 'year'

interface PerfSummary {
  totalClosedTrades: number
  totalRealizedPnL: number
  winRate: number
  wins: number
  losses: number
  maxDrawdownPct: number
  sharpe: number | null
}

interface PerfTrade {
  id: string
  symbol: string
  sellDate: string | Date
  sellQuantity: number
  sellPrice: number
  avgCostBasis: number
  realizedPnL: number
  realizedPnLPct: number
}

interface PerfPeriodStat {
  period: string
  realizedPnL: number
  tradeCount: number
  winCount: number
  winRate: number
}

interface SymbolBreakdown {
  symbol: string
  tradeCount: number
  realizedPnL: number
  winRate: number
}

interface PerformanceResult {
  summary: PerfSummary
  periodStats: PerfPeriodStat[]
  equityCurve: { date: string; cumPnL: number }[]
  topWins: PerfTrade[]
  topLosses: PerfTrade[]
  symbolBreakdown: SymbolBreakdown[]
}

const periodOptions: { value: PerfPeriod; label: string }[] = [
  { value: 'month', label: '月' },
  { value: 'quarter', label: '季' },
  { value: 'year', label: '年' },
]

const selectedPeriod = ref<PerfPeriod>('month')

const periodLabel = computed(() => {
  const map: Record<PerfPeriod, string> = { month: '月度', quarter: '季度', year: '年度' }
  return map[selectedPeriod.value]
})

const { data: perfData, pending: perfPending, refresh: refreshPerf } = await useLazyFetch<PerformanceResult | null>(
  () => `/api/stats/performance?period=${selectedPeriod.value}`,
  { server: false, default: () => null }
)

// 切換時間段時重新拉資料
watch(selectedPeriod, () => refreshPerf())

function formatTradeDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })
}

// Chart.js Bar Chart 資料
const barChartData = computed<ChartData<'bar'>>(() => {
  const stats = perfData.value?.periodStats ?? []
  return {
    labels: stats.map((s: any) => s.period),
    datasets: [
      {
        label: '已實現損益',
        data: stats.map((s: any) => s.realizedPnL),
        backgroundColor: stats.map((s: any) =>
          s.realizedPnL >= 0 ? 'rgba(22, 163, 74, 0.75)' : 'rgba(220, 38, 38, 0.75)'
        ),
        borderColor: stats.map((s: any) =>
          s.realizedPnL >= 0 ? 'rgba(22, 163, 74, 1)' : 'rgba(220, 38, 38, 1)'
        ),
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  }
})

const barChartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => {
          const v = ctx.raw as number
          return ` ${v >= 0 ? '+' : ''}${v.toFixed(2)}`
        },
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 11 } },
    },
    y: {
      grid: { color: 'rgba(148, 163, 184, 0.1)' },
      ticks: {
        font: { size: 11 },
        callback: (v) => (Number(v) >= 0 ? `+${v}` : String(v)),
      },
    },
  },
}

// ─── 資金曲線（折線圖） ───────────────────────────────────────────────────────

const equityCurveData = computed<ChartData<'line'>>(() => {
  const curve = perfData.value?.equityCurve ?? []
  return {
    labels: curve.map((p) => p.date),
    datasets: [
      {
        label: '累積損益',
        data: curve.map((p) => p.cumPnL),
        borderColor: 'rgba(99, 102, 241, 0.9)',
        backgroundColor: 'rgba(99, 102, 241, 0.08)',
        borderWidth: 2,
        pointRadius: curve.length <= 30 ? 3 : 0,
        pointHoverRadius: 5,
        fill: true,
        tension: 0.3,
      },
    ],
  }
})

const equityCurveOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => {
          const v = ctx.raw as number
          return ` ${v >= 0 ? '+' : ''}${v.toFixed(2)}`
        },
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 10 }, maxTicksLimit: 8 },
    },
    y: {
      grid: { color: 'rgba(148, 163, 184, 0.1)' },
      ticks: {
        font: { size: 11 },
        callback: (v) => (Number(v) >= 0 ? `+${v}` : String(v)),
      },
    },
  },
}

// ─── 各股票損益橫條圖 ─────────────────────────────────────────────────────────

const symbolBarData = computed<ChartData<'bar'>>(() => {
  const breakdown = (perfData.value?.symbolBreakdown ?? []).slice(0, 10)
  return {
    labels: breakdown.map((s) => s.symbol),
    datasets: [
      {
        label: '已實現損益',
        data: breakdown.map((s) => Math.round(s.realizedPnL * 100) / 100),
        backgroundColor: breakdown.map((s) =>
          s.realizedPnL >= 0 ? 'rgba(22, 163, 74, 0.75)' : 'rgba(220, 38, 38, 0.75)'
        ),
        borderColor: breakdown.map((s) =>
          s.realizedPnL >= 0 ? 'rgba(22, 163, 74, 1)' : 'rgba(220, 38, 38, 1)'
        ),
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  }
})

const symbolBarOptions: ChartOptions<'bar'> = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => {
          const v = ctx.raw as number
          return ` ${v >= 0 ? '+' : ''}${v.toFixed(2)}`
        },
      },
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(148, 163, 184, 0.1)' },
      ticks: {
        font: { size: 11 },
        callback: (v) => (Number(v) >= 0 ? `+${v}` : String(v)),
      },
    },
    y: {
      grid: { display: false },
      ticks: { font: { size: 12, weight: 'bold' } },
    },
  },
}

// ─── CSV 匯出 ─────────────────────────────────────────────────────────────────

const isExporting = ref(false)

async function exportTrades() {
  if (isExporting.value) return
  const toast = useToast()
  isExporting.value = true
  try {
    const response = await $fetch<string>('/api/stats/export-trades', {
      responseType: 'text',
    })
    const blob = new Blob([response], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trades-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('已匯出 CSV')
  } catch {
    toast.error('匯出失敗，請稍後再試')
  } finally {
    isExporting.value = false
  }
}

useHead({
  title: `${t('stock.dashboard.title')} - Investment Diary`
})
</script>

<style scoped>
.stocks-page {
  background: 
    radial-gradient(at 0% 0%, color-mix(in srgb, var(--color-primary) 10%, transparent) 0px, transparent 50%),
    radial-gradient(at 100% 0%, color-mix(in srgb, var(--color-secondary) 10%, transparent) 0px, transparent 50%),
    var(--color-background);
}

:global(.dark .stocks-page),
:global(.dark-mode .stocks-page) {
  background: 
    radial-gradient(at 0% 0%, color-mix(in srgb, var(--color-primary) 20%, transparent) 0px, transparent 50%),
    radial-gradient(at 100% 0%, color-mix(in srgb, var(--color-secondary) 16%, transparent) 0px, transparent 50%),
    var(--color-background);
}

.panel-dashboard {
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.stats-card {
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  padding: 1.25rem;
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  transition: border-color var(--motion-fast) ease, box-shadow var(--motion-fast) ease;
}

.stats-card:hover {
  border-color: var(--color-border-strong);
}

.risk-metric {
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  background: color-mix(in srgb, var(--color-surface-strong) 70%, transparent);
  padding: 1rem;
}

.risk-metric span {
  display: block;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-soft);
}

.risk-metric strong {
  display: block;
  margin-top: 0.45rem;
  overflow-wrap: anywhere;
  font-family: var(--font-data);
  font-size: 1.35rem;
  line-height: 1.2;
  color: var(--color-text);
}

.risk-metric small {
  display: block;
  margin-top: 0.35rem;
  color: var(--color-text-muted);
}

.action-btn-dashboard {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  border: 1px solid var(--color-primary);
  background: var(--color-primary);
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: #fff;
  transition: opacity var(--motion-fast) ease;
}

.action-btn-dashboard:hover {
  opacity: 0.92;
}

.action-btn-dashboard:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.action-btn-muted-dashboard {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
  background: var(--color-surface-strong);
  color: var(--color-text-muted);
  font-size: 0.875rem;
  font-weight: 700;
  transition: background-color var(--motion-fast) ease, color var(--motion-fast) ease, border-color var(--motion-fast) ease;
}

.action-btn-muted-dashboard:hover {
  background: color-mix(in srgb, var(--color-surface-strong) 92%, transparent);
  color: var(--color-text);
  border-color: var(--color-border-strong);
}

/* Custom scrollbar for table */
.overflow-x-auto::-webkit-scrollbar {
  height: 6px;
}
.overflow-x-auto::-webkit-scrollbar-track {
  background: transparent;
}
.overflow-x-auto::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--color-border) 88%, transparent);
  border-radius: 999px;
}
</style>
