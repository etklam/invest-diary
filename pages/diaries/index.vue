<template>
  <div class="diary-page space-y-6">
    <section class="ledger-hero">
      <div class="hero-copy">
        <p class="kicker">Diary Ledger</p>
        <h1 class="hero-title">日記工作台</h1>
        <p class="hero-summary">
          先看節奏，再做紀錄。提醒、交易、最新複盤都放在第一視線，唔使再喺卡片海裡面兜圈。
        </p>

        <div class="hero-stats">
          <p class="workspace-label">Ledger Snapshot</p>
          <div class="stat-list">
            <article class="stat-card">
              <span class="stat-value">{{ diaryItems.length }}</span>
              <span class="stat-label">總日記數</span>
            </article>
            <article class="stat-card">
              <span class="stat-value">{{ diariesThisWeek }}</span>
              <span class="stat-label">近 7 天紀錄</span>
            </article>
            <article class="stat-card">
              <span class="stat-value">{{ filteredAndSortedDiaries.length }}</span>
              <span class="stat-label">目前篩選結果</span>
            </article>
          </div>
        </div>
      </div>

      <div class="hero-actions">
        <button
          @click="showQuickModal = true"
          class="action-btn-success cursor-pointer"
        >
          <Icon name="heroicons:bolt" class="h-5 w-5" />
          快速日記
        </button>
        <NuxtLink
          to="/diaries/new"
          class="action-btn cursor-pointer"
        >
          <Icon name="heroicons:plus" class="h-5 w-5" />
          新增日記
        </NuxtLink>
        <NuxtLink
          to="/partners"
          class="action-btn-muted cursor-pointer"
        >
          <Icon name="heroicons:user-group" class="h-5 w-5" />
          合作夥伴
        </NuxtLink>
      </div>
    </section>

    <QuickDiaryModal
      :show="showQuickModal"
      @close="showQuickModal = false"
      @created="handleDiaryCreated"
    />

    <div class="workspace-grid">
      <section class="workspace-panel workspace-panel-primary">
        <div class="workspace-head">
          <div>
            <p class="workspace-label">Next Move</p>
            <h2 class="workspace-title">{{ focusHeadline }}</h2>
          </div>
          <span class="workspace-stamp">{{ focusStamp }}</span>
        </div>

        <p class="workspace-text">
          {{ focusDescription }}
        </p>

        <div class="task-grid">
          <article class="task-card">
            <p class="task-label">最近一篇</p>
            <template v-if="latestDiary">
              <h3 class="task-title">{{ latestDiary.title || '未命名紀錄' }}</h3>
              <p class="task-meta">{{ formatDiaryDate(latestDiary.date || latestDiary.createdAt) }}</p>
              <p class="task-text">{{ getDiaryExcerpt(latestDiary) }}</p>
            </template>
            <template v-else>
              <h3 class="task-title">還未開始</h3>
              <p class="task-text">先用一篇快速日記，把今天的判斷和情緒落地。</p>
            </template>
          </article>

          <article class="task-card">
            <p class="task-label">提醒盤點</p>
            <h3 class="task-title">{{ totalOpenAlerts }} 個待留意提醒</h3>
            <p class="task-meta">有提醒的日記 {{ diariesWithAlerts }} 篇</p>
            <p class="task-text">
              {{ totalOpenAlerts > 0 ? '先處理帶提醒的條目，別讓風險提示變成背景音。' : '目前沒有待處理提醒，節奏算穩。' }}
            </p>
          </article>

          <article class="task-card">
            <p class="task-label">交易覆盤</p>
            <h3 class="task-title">{{ totalTransactions }} 筆交易掛在日記裡</h3>
            <p class="task-meta">涉及交易的日記 {{ diariesWithTransactions }} 篇</p>
            <p class="task-text">
              {{ totalTransactions > 0 ? '有交易就該有理由，從有交易的條目開始回看。' : '還沒有交易紀錄，先把觀察和規則寫出來。' }}
            </p>
          </article>
        </div>
      </section>

      <aside class="workspace-sidebar">
        <section class="workspace-panel workspace-panel-secondary workspace-panel-compact">
          <p class="workspace-label">Desk Rules</p>
          <h3 class="desk-rules-title">先把帳對清楚，再談判斷。</h3>
          <div class="desk-rules-list">
            <article class="desk-rule">
              <span class="desk-rule-index">01</span>
              <p class="desk-rule-text">先記理由，再看結果，情緒放最後。</p>
            </article>
            <article class="desk-rule">
              <span class="desk-rule-index">02</span>
              <p class="desk-rule-text">日期、提醒、交易三條線要對得上。</p>
            </article>
            <article class="desk-rule">
              <span class="desk-rule-index">03</span>
              <p class="desk-rule-text">篩選器是拿來縮短決策，不是把自己繞暈。</p>
            </article>
          </div>
        </section>
      </aside>
    </div>

    <section class="filters-panel">
      <div class="filters-head">
        <div>
          <p class="workspace-label">Filter Desk</p>
          <h2 class="filters-title">先縮窄範圍，再讀條目</h2>
        </div>
        <button
          @click="resetFilters"
          class="action-btn-muted cursor-pointer"
          :disabled="!hasActiveFilters"
        >
          <Icon name="heroicons:x-mark" class="h-4 w-4" />
          清除篩選
        </button>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div class="sm:col-span-4">
          <label for="search" class="field-label">
            搜尋日記
          </label>
          <div class="search-field">
            <div class="search-icon">
              <Icon name="heroicons:magnifying-glass" class="h-5 w-5 text-[color:var(--color-text-soft)]" />
            </div>
            <input
              id="search"
              v-model="filters.search"
              type="text"
              placeholder="搜尋標題或內容..."
              class="field field-search"
            />
          </div>
        </div>
        <div>
          <label for="date-from" class="field-label">
            開始日期
          </label>
          <input
            id="date-from"
            v-model="filters.dateFrom"
            type="date"
            class="field"
          />
        </div>
        <div>
          <label for="date-to" class="field-label">
            結束日期
          </label>
          <input
            id="date-to"
            v-model="filters.dateTo"
            type="date"
            class="field"
          />
        </div>
        <div>
          <label for="sort-by" class="field-label">
            排序方式
          </label>
          <select
            id="sort-by"
            v-model="filters.sortBy"
            class="field"
          >
            <option value="date-desc">日期（新到舊）</option>
            <option value="date-asc">日期（舊到新）</option>
            <option value="title-asc">標題（A-Z）</option>
            <option value="title-desc">標題（Z-A）</option>
          </select>
        </div>
      </div>

      <p class="filters-summary">{{ filterSummary }}</p>
    </section>

    <section v-if="pending" class="state-panel">
      <Icon name="svg-spinners:180-ring-with-bg" class="h-8 w-8 text-[color:var(--color-primary)]" />
      <p>正在整理你的日記桌面...</p>
    </section>

    <section v-else-if="error" class="state-panel state-panel-error">
      <Icon name="heroicons:x-circle" class="h-5 w-5" />
      <div>
        <h3 class="state-title">載入失敗</h3>
        <p class="state-text">{{ error.message }}</p>
      </div>
    </section>

    <section v-else-if="diaryItems.length === 0" class="state-panel">
      <Icon name="heroicons:document-text" class="h-10 w-10 text-[color:var(--color-text-soft)]" />
      <div>
        <h3 class="state-title">尚無日記</h3>
        <p class="state-text">先記下第一篇投資日記，之後提醒、交易和複盤節奏才有地方可落。</p>
      </div>
      <NuxtLink
        to="/diaries/new"
        class="action-btn cursor-pointer"
      >
        <Icon name="heroicons:plus" class="h-5 w-5" />
        新增日記
      </NuxtLink>
    </section>

    <section v-else-if="filteredAndSortedDiaries.length === 0" class="state-panel">
      <Icon name="heroicons:funnel" class="h-10 w-10 text-[color:var(--color-text-soft)]" />
      <div>
        <h3 class="state-title">沒有符合條件的日記</h3>
        <p class="state-text">篩選收太窄了，放寬日期或關鍵字，別把自己困在空結果裡。</p>
      </div>
    </section>

    <section v-else class="ledger-list">
      <header class="ledger-list-head">
        <div>
          <p class="workspace-label">Entries</p>
          <h2 class="filters-title">依時間線讀你的判斷痕跡</h2>
        </div>
        <p class="ledger-list-note">點進條目繼續寫、補交易、處理提醒。</p>
      </header>

      <NuxtLink
        v-for="diary in filteredAndSortedDiaries"
        :key="diary.id"
        :to="`/diaries/${diary.id}`"
        class="ledger-row group cursor-pointer"
      >
        <div class="ledger-row-main">
          <div class="ledger-row-head">
            <p class="ledger-date">{{ formatDiaryDate(diary.date || diary.createdAt) }}</p>
            <h3 class="ledger-title">
              {{ diary.title || '未命名紀錄' }}
            </h3>
          </div>
          <p class="ledger-excerpt">
            {{ getDiaryExcerpt(diary) }}
          </p>
        </div>

        <div class="ledger-row-side">
          <div class="ledger-badges">
            <span v-if="diary.transactions?.length" class="ledger-badge ledger-badge-positive">
              <Icon name="heroicons:currency-dollar" class="h-4 w-4" />
              {{ diary.transactions.length }} 筆交易
            </span>
            <span v-if="diary.alerts?.length" class="ledger-badge ledger-badge-warning">
              <Icon name="heroicons:bell" class="h-4 w-4" />
              {{ diary.alerts.length }} 個提醒
            </span>
            <span v-if="!diary.transactions?.length && !diary.alerts?.length" class="ledger-badge">
              純文字複盤
            </span>
          </div>
          <span class="ledger-link">
            打開條目
            <Icon name="heroicons:arrow-right-20-solid" class="h-4 w-4" />
          </span>
        </div>
      </NuxtLink>
    </section>
  </div>
</template>

<script setup lang="ts">
import { formatYmdInTimezone } from '~/lib/diary-date'

definePageMeta({
  middleware: 'auth'
})
const { formatLocaleDate, getTimezone } = useTimezone()

// Quick diary modal state
const showQuickModal = ref(false)

const handleDiaryCreated = () => {
  refresh()
}

// Use lazy fetch to avoid calling API during SSR before auth check
// API returns { data, pagination }, so transform to diary array
const { data: diaries, pending, error, refresh } = await useLazyFetch('/api/diaries', {
  transform: (res: any) => res?.data ?? []
})

const filters = reactive({
  search: '',
  dateFrom: '',
  dateTo: '',
  sortBy: 'date-desc'
})

const diaryItems = computed<any[]>(() => diaries.value ?? [])

const latestDiary = computed<any | null>(() => diaryItems.value[0] ?? null)

const totalOpenAlerts = computed(() =>
  diaryItems.value.reduce((sum, diary) => sum + (diary.alerts?.length ?? 0), 0)
)

const totalTransactions = computed(() =>
  diaryItems.value.reduce((sum, diary) => sum + (diary.transactions?.length ?? 0), 0)
)

const diariesWithAlerts = computed(() =>
  diaryItems.value.filter(diary => (diary.alerts?.length ?? 0) > 0).length
)

const diariesWithTransactions = computed(() =>
  diaryItems.value.filter(diary => (diary.transactions?.length ?? 0) > 0).length
)

const diariesThisWeek = computed(() => {
  const now = Date.now()
  const sevenDays = 7 * 24 * 60 * 60 * 1000

  return diaryItems.value.filter((diary) => {
    const diaryTime = new Date(diary.date || diary.createdAt).getTime()
    return Number.isFinite(diaryTime) && now - diaryTime <= sevenDays
  }).length
})

const hasActiveFilters = computed(() =>
  Boolean(filters.search || filters.dateFrom || filters.dateTo || filters.sortBy !== 'date-desc')
)

const focusHeadline = computed(() => {
  if (!diaryItems.value.length) {
    return '今天先寫下第一篇判斷紀錄'
  }

  if (totalOpenAlerts.value > 0) {
    return `先處理 ${totalOpenAlerts.value} 個提醒，別讓風險訊號失焦`
  }

  if (latestDiary.value) {
    return `從 ${formatDiaryDate(latestDiary.value.date || latestDiary.value.createdAt)} 的最近一篇開始複盤`
  }

  return '先把今天的交易節奏寫清楚'
})

const focusStamp = computed(() => {
  if (!diaryItems.value.length) return 'Start'
  if (totalOpenAlerts.value > 0) return 'Risk Check'
  if (totalTransactions.value > 0) return 'Review'
  return 'Writing'
})

const focusDescription = computed(() => {
  if (!diaryItems.value.length) {
    return '這個頁面現在不是展示牆，是工作桌。第一步很簡單，先把今天的理由記下來。'
  }

  if (totalOpenAlerts.value > 0) {
    return '你的工作桌上還有未消化的提醒。先進相關條目檢查條件、更新判斷，再決定下一步。'
  }

  if (totalTransactions.value > 0) {
    return '交易和文字已經開始累積，接下來要做的不是再開更多卡片，而是把理由、結果、修正對齊。'
  }

  return '目前節奏偏輕，適合補全條目細節，讓之後的複盤有完整上下文。'
})

const filterSummary = computed(() => {
  if (pending.value) return '正在讀取條目...'
  if (!diaryItems.value.length) return '還沒有資料可供篩選。'
  if (hasActiveFilters.value) return `目前保留 ${filteredAndSortedDiaries.value.length} 篇條目。`
  return `共 ${diaryItems.value.length} 篇日記，按時間由新到舊排列。`
})

// Reset filters
const resetFilters = () => {
  filters.search = ''
  filters.dateFrom = ''
  filters.dateTo = ''
  filters.sortBy = 'date-desc'
}

// Filter diaries by search and date range
const filteredDiaries = computed(() => {
  if (!diaries.value) return []

  let result = [...diaries.value]

  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    result = result.filter(d =>
      d.title.toLowerCase().includes(searchLower) ||
      (d.content && d.content.toLowerCase().includes(searchLower))
    )
  }

  // Date from filter
  if (filters.dateFrom) {
    result = result.filter(d => {
      const diaryYmd = formatYmdInTimezone(d.date || d.createdAt, getTimezone())
      return diaryYmd >= filters.dateFrom
    })
  }

  // Date to filter
  if (filters.dateTo) {
    result = result.filter(d => {
      const diaryYmd = formatYmdInTimezone(d.date || d.createdAt, getTimezone())
      return diaryYmd <= filters.dateTo
    })
  }

  return result
})

// Sort diaries
const filteredAndSortedDiaries = computed(() => {
  const result = [...filteredDiaries.value]

  switch (filters.sortBy) {
    case 'date-desc':
      return result.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt).getTime()
        const dateB = new Date(b.date || b.createdAt).getTime()
        return dateB - dateA
      })
    case 'date-asc':
      return result.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt).getTime()
        const dateB = new Date(b.date || b.createdAt).getTime()
        return dateA - dateB
      })
    case 'title-asc':
      return result.sort((a, b) => a.title.localeCompare(b.title, 'zh-TW'))
    case 'title-desc':
      return result.sort((a, b) => b.title.localeCompare(a.title, 'zh-TW'))
    default:
      return result
  }
})

watch(error, (error) => {
  if (error) {
    console.error('Error fetching diaries:', error)
  }
})

const formatDiaryDate = (date: string | Date) => {
  return formatLocaleDate(date, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const getDiaryExcerpt = (diary: { content?: string }) => {
  const plainText = (diary.content || '').replace(/[#*`>\-\n]/g, ' ').replace(/\s+/g, ' ').trim()
  return plainText || '這篇條目還沒有摘要內容，打開把判斷補完整。'
}
</script>

<style scoped>
.diary-page {
  max-width: 1280px;
  margin: 0 auto;
}

.kicker {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--color-secondary);
  font-weight: 700;
}

.ledger-hero,
.workspace-panel,
.filters-panel,
.ledger-list,
.state-panel {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--color-secondary) 10%, transparent), transparent 34%),
    linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 92%, transparent), color-mix(in srgb, var(--color-surface-strong) 82%, transparent));
  box-shadow: var(--shadow-md);
}

.ledger-hero {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  padding: 1.5rem;
}

.hero-copy {
  flex: 1 1 42rem;
  min-width: 0;
  max-width: 42rem;
}

.hero-title,
.workspace-title,
.filters-title,
.state-title,
.ledger-title {
  font-family: var(--font-display);
  letter-spacing: -0.025em;
  color: var(--color-text);
}

.hero-title {
  margin-top: 0.45rem;
  font-size: clamp(2.2rem, 5vw, 3.2rem);
  line-height: 1.03;
}

.hero-summary,
.workspace-text,
.task-text,
.state-text,
.ledger-excerpt,
.desk-rules {
  color: var(--color-text-muted);
  line-height: 1.7;
}

.hero-summary {
  margin-top: 0.85rem;
  max-width: 38rem;
  font-size: 1.02rem;
}

.hero-stats {
  margin-top: 1.25rem;
  max-width: 46rem;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.75rem;
}

.workspace-grid {
  display: grid;
  gap: 1rem;
}

.workspace-panel {
  padding: 1.35rem;
}

.workspace-panel-compact {
  padding: 1.1rem;
}

.workspace-panel-primary {
  min-width: 0;
}

.workspace-sidebar {
  display: grid;
  gap: 1rem;
}

.workspace-head,
.filters-head,
.ledger-list-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.workspace-label,
.field-label {
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-secondary);
}

.workspace-title {
  margin-top: 0.35rem;
  font-size: 1.8rem;
  line-height: 1.1;
}

.workspace-stamp {
  display: inline-flex;
  align-items: center;
  border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  font-size: 0.78rem;
  font-family: var(--font-data);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-surface-strong) 72%, transparent);
}

.workspace-text {
  margin-top: 0.85rem;
}

.task-grid,
.stat-list {
  display: grid;
  gap: 0.9rem;
  margin-top: 1.25rem;
}

.hero-stats .stat-list {
  margin-top: 0.8rem;
}

.task-card,
.stat-card {
  border: 1px solid color-mix(in srgb, var(--color-border) 90%, transparent);
  border-radius: 1rem;
  background: color-mix(in srgb, var(--color-surface) 86%, transparent);
}

.task-card {
  padding: 1rem;
}

.task-label,
.task-meta,
.ledger-date,
.stat-label,
.ledger-list-note {
  font-family: var(--font-data);
}

.task-label,
.stat-label {
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-soft);
}

.task-title {
  margin-top: 0.45rem;
  font-size: 1.08rem;
  font-weight: 700;
  color: var(--color-text);
}

.task-meta {
  margin-top: 0.45rem;
  font-size: 0.78rem;
  color: var(--color-secondary);
}

.task-text {
  margin-top: 0.65rem;
  font-size: 0.95rem;
}

.stat-list {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.95rem 0.9rem;
}

.stat-value {
  font-size: 1.45rem;
  font-weight: 700;
  font-family: var(--font-data);
  color: var(--color-text);
}

.desk-rules-title {
  margin-top: 0.45rem;
  font-size: 1.08rem;
  font-weight: 700;
  color: var(--color-text);
}

.desk-rules-list {
  margin-top: 0.9rem;
  display: grid;
  gap: 0.7rem;
}

.desk-rule {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.7rem;
  align-items: start;
  border: 1px solid color-mix(in srgb, var(--color-border) 88%, transparent);
  border-radius: 0.9rem;
  background: color-mix(in srgb, var(--color-surface) 84%, transparent);
  padding: 0.75rem 0.8rem;
}

.desk-rule-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 2rem;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 700;
  font-family: var(--font-data);
  color: var(--color-secondary);
  background: color-mix(in srgb, var(--color-secondary) 12%, transparent);
}

.desk-rule-text {
  color: var(--color-text-muted);
  line-height: 1.6;
}

.filters-panel,
.ledger-list,
.state-panel {
  padding: 1.35rem;
}

.filters-title {
  margin-top: 0.3rem;
  font-size: 1.45rem;
}

.filters-summary {
  margin-top: 1rem;
  color: var(--color-text-muted);
  font-size: 0.95rem;
}

.search-field {
  position: relative;
}

.search-icon {
  position: absolute;
  inset: 0 auto 0 0.95rem;
  display: flex;
  align-items: center;
  pointer-events: none;
}

.field {
  display: block;
  width: 100%;
  margin-top: 0.35rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--color-surface-strong) 72%, transparent);
  color: var(--color-text);
  font-size: 0.95rem;
  padding: 0.75rem 0.8rem;
}

.field:focus-visible {
  outline: none;
  border-color: var(--color-secondary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-secondary) 18%, transparent);
}

.field-search {
  padding-left: 2.8rem;
}

.action-btn,
.action-btn-success,
.action-btn-muted {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 48px;
  border-radius: 999px;
  padding: 0.7rem 1.05rem;
  font-weight: 700;
  transition: transform var(--motion-fast) ease, background-color var(--motion-fast) ease, box-shadow var(--motion-fast) ease, border-color var(--motion-fast) ease;
}

.action-btn {
  color: white;
  background: var(--color-primary);
  box-shadow: 0 16px 28px color-mix(in srgb, var(--color-primary) 24%, transparent);
}

.action-btn:hover {
  transform: translateY(-1px);
  background: var(--color-primary-active);
}

.action-btn-success {
  color: white;
  background: var(--color-accent);
  box-shadow: 0 16px 28px color-mix(in srgb, var(--color-accent) 24%, transparent);
}

.action-btn-success:hover {
  transform: translateY(-1px);
  background: color-mix(in srgb, var(--color-accent) 84%, black);
}

.action-btn-muted {
  border: 1px solid var(--color-border);
  color: var(--color-text);
  background: color-mix(in srgb, var(--color-surface-strong) 72%, transparent);
}

.action-btn-muted:hover {
  transform: translateY(-1px);
  border-color: var(--color-border-strong);
  background: color-mix(in srgb, var(--color-surface-strong) 90%, transparent);
}

.action-btn-muted:disabled {
  opacity: 0.55;
  transform: none;
  cursor: not-allowed;
}

.state-panel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  justify-content: center;
  text-align: center;
  min-height: 220px;
}

.state-panel-error {
  border-color: color-mix(in srgb, var(--color-danger) 36%, var(--color-border));
  color: var(--color-danger);
}

.state-title {
  font-size: 1.35rem;
}

.ledger-list-head {
  margin-bottom: 1rem;
}

.ledger-list-note {
  font-size: 0.8rem;
  color: var(--color-text-soft);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.ledger-row {
  display: grid;
  gap: 1rem;
  border-top: 1px solid color-mix(in srgb, var(--color-border) 88%, transparent);
  padding: 1.15rem 0;
  transition: transform var(--motion-fast) ease;
}

.ledger-row:first-of-type {
  border-top: none;
  padding-top: 0;
}

.ledger-row:last-of-type {
  padding-bottom: 0;
}

.ledger-row:hover {
  transform: translateX(2px);
}

.ledger-row-head {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.ledger-date {
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-secondary);
}

.ledger-title {
  font-size: 1.28rem;
  transition: color var(--motion-fast) ease;
}

.group:hover .ledger-title {
  color: var(--color-primary);
}

.ledger-excerpt {
  margin-top: 0.6rem;
  font-size: 0.98rem;
}

.ledger-row-side {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
}

.ledger-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.ledger-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 0.38rem 0.7rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-muted);
  background: color-mix(in srgb, var(--color-surface-strong) 70%, transparent);
}

.ledger-badge-positive {
  color: var(--color-accent);
  border-color: color-mix(in srgb, var(--color-accent) 30%, var(--color-border));
}

.ledger-badge-warning {
  color: var(--color-warning);
  border-color: color-mix(in srgb, var(--color-warning) 34%, var(--color-border));
}

.ledger-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-primary);
}

:global(.dark .ledger-hero),
:global(.dark .workspace-panel),
:global(.dark .filters-panel),
:global(.dark .ledger-list),
:global(.dark .state-panel),
:global(.dark-mode .ledger-hero),
:global(.dark-mode .workspace-panel),
:global(.dark-mode .filters-panel),
:global(.dark-mode .ledger-list),
:global(.dark-mode .state-panel) {
  border-color: var(--color-border);
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--color-secondary) 12%, transparent), transparent 32%),
    linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 96%, transparent), color-mix(in srgb, var(--color-surface-strong) 100%, transparent));
}

:global(.dark .field),
:global(.dark .task-card),
:global(.dark .stat-card),
:global(.dark .ledger-badge),
:global(.dark-mode .field),
:global(.dark-mode .task-card),
:global(.dark-mode .stat-card),
:global(.dark-mode .ledger-badge) {
  border-color: var(--color-border);
  background: color-mix(in srgb, var(--color-surface-strong) 92%, transparent);
  color: var(--color-text);
}

:global(.dark .field):focus-visible,
:global(.dark-mode .field):focus-visible {
  border-color: var(--color-secondary);
}

:global(.dark .workspace-stamp),
:global(.dark-mode .workspace-stamp) {
  border-color: var(--color-border);
  background: color-mix(in srgb, var(--color-surface-strong) 96%, transparent);
  color: var(--color-text);
}

:global(.dark .action-btn-muted),
:global(.dark-mode .action-btn-muted) {
  border-color: var(--color-border);
  background: color-mix(in srgb, var(--color-surface-strong) 94%, transparent);
  color: var(--color-text);
}

:global(.dark .group:hover .ledger-title),
:global(.dark-mode .group:hover .ledger-title) {
  color: color-mix(in srgb, white 82%, var(--color-secondary));
}

@media (min-width: 768px) {
  .task-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .task-card:first-child {
    grid-column: 1 / -1;
  }

  .ledger-row {
    grid-template-columns: minmax(0, 1fr) minmax(180px, 220px);
    align-items: start;
  }

  .ledger-row-side {
    align-items: flex-end;
    text-align: right;
  }

  .ledger-badges {
    justify-content: flex-end;
  }
}

@media (min-width: 1024px) {
  .ledger-hero {
    display: grid;
    grid-template-columns: minmax(0, 1.7fr) minmax(220px, 240px);
    align-items: end;
  }

  .hero-copy {
    max-width: none;
  }

  .hero-actions {
    width: 100%;
    flex-direction: column;
    align-self: end;
    justify-self: end;
  }

  .hero-actions > * {
    width: 100%;
    justify-content: center;
  }

  .workspace-grid {
    grid-template-columns: minmax(0, 2fr) minmax(260px, 0.58fr);
    align-items: start;
  }

  .task-grid {
    grid-template-columns: minmax(0, 1.45fr) minmax(260px, 1fr);
    align-items: stretch;
  }

  .task-card:first-child {
    grid-column: 1;
    grid-row: 1 / span 2;
  }

  .ledger-list {
    padding-right: 1rem;
  }

  .ledger-row {
    grid-template-columns: minmax(0, 1fr) minmax(170px, 200px);
    column-gap: 1.25rem;
  }
}
</style>
