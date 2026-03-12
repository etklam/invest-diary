# Blog & Blog Admin 性能與 UI 改善方案
**日期**: 2026-03-12
**範圍**: 前台 Blog (`/articles`) + 後台 Blog Admin (`/admin/blog`)

---

## 📊 當前狀態分析

### ✅ 優點
- **設計美觀**: Fintech 風格的 glassmorphism 設計，視覺效果出色
- **功能完整**: 搜尋、分類、標籤、分頁、Markdown 支援
- **SEO 友好**: 完整的 meta tags、canonical URLs、sitemap 整合
- **響應式設計**: 支援桌面和移動端
- **i18n 支援**: 多語言切換 (EN/ZH-TW/ZH-CN)

### ⚠️ 待改進
- **性能**: 缺少緩存、圖片優化不足、無虛擬滾動
- **UX**: 編輯器功能基礎、缺少自動儲存、預覽體驗可提升
- **Admin**: 批量操作缺失、篩選功能有限、無拖拽排序

---

## 🚀 性能優化方案

### 1. API 響應緩存 (P0 - 立即實施)

**問題**: 每次請求都查詢數據庫，已發布文章內容不常變動

**方案**: 使用 Nitro `cachedEventHandler`

```typescript
// server/api/blog/index.get.ts
export default cachedEventHandler(async (event) => {
  // ... existing logic
}, {
  maxAge: 60 * 5, // 5 分鐘緩存
  getKey: (event) => {
    const query = getQuery(event)
    return `blog:list:${query.page}:${query.category}:${query.search}`
  },
  swr: true, // Stale-While-Revalidate
  varies: ['cookie'] // 根據用戶狀態變化
})

// server/api/blog/[slug].get.ts
export default cachedEventHandler(async (event) => {
  // ... existing logic
}, {
  maxAge: 60 * 10, // 10 分鐘緩存
  getKey: (event) => `blog:post:${getRouterParam(event, 'slug')}`,
  swr: true
})
```

**預期效果**:
- 響應時間從 ~200ms 降至 ~20ms (緩存命中)
- 數據庫負載減少 80%+
- 支援 SWR，用戶看到舊內容時後台更新

---

### 2. 圖片優化 (P0)

**問題**:
- Cover images 未經優化，可能數 MB
- 無 lazy loading
- 無 responsive images

**方案**: 使用 Nuxt Image + CDN

```vue
<!-- components/BlogCard.vue -->
<template>
  <article class="blog-card">
    <NuxtImg
      v-if="post.coverImage"
      :src="post.coverImage"
      :alt="post.title"
      width="400"
      height="225"
      format="webp"
      quality="80"
      loading="lazy"
      sizes="sm:400px md:350px lg:400px"
      :placeholder="[40, 23, 75, 5]"
      class="cover-image"
    />
    <!-- ... -->
  </article>
</template>
```

**配置 Image CDN**:
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  image: {
    provider: 'cloudinary', // 或 imgix, imagekit
    cloudinary: {
      baseURL: 'https://res.cloudinary.com/your-cloud/image/upload/'
    },
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280
    },
    presets: {
      blogCover: {
        modifiers: {
          format: 'webp',
          quality: 80,
          width: 800,
          height: 450
        }
      }
    }
  }
})
```

**預期效果**:
- 圖片大小減少 60-80% (WebP + 壓縮)
- LCP (Largest Contentful Paint) 改善 40%+
- 自動生成 responsive images

---

### 3. 虛擬滾動 / 無限滾動 (P1)

**問題**: 分頁體驗不流暢，用戶需要點擊翻頁

**方案 A**: 無限滾動 (推薦)

```vue
<!-- pages/articles/index.vue -->
<script setup>
import { useInfiniteScroll } from '@vueuse/core'

const posts = ref([])
const page = ref(1)
const hasMore = ref(true)
const loading = ref(false)

const loadMore = async () => {
  if (loading.value || !hasMore.value) return

  loading.value = true
  try {
    const response = await $fetch('/api/blog', {
      params: { page: page.value, limit: 9 }
    })

    posts.value.push(...response.data)
    hasMore.value = page.value < response.pagination.totalPages
    page.value++
  } finally {
    loading.value = false
  }
}

const el = ref(null)
useInfiniteScroll(el, loadMore, { distance: 300 })

onMounted(() => loadMore())
</script>

<template>
  <div ref="el" class="posts-container">
    <BlogCard v-for="post in posts" :key="post.id" :post="post" />
    <div v-if="loading" class="loading-spinner">載入中...</div>
  </div>
</template>
```

**方案 B**: 虛擬滾動 (大量文章時)

```bash
npm install vue-virtual-scroller
```

```vue
<template>
  <RecycleScroller
    :items="posts"
    :item-size="400"
    key-field="id"
    class="scroller"
  >
    <template #default="{ item }">
      <BlogCard :post="item" />
    </template>
  </RecycleScroller>
</template>
```

**預期效果**:
- 更流暢的瀏覽體驗
- 減少頁面跳轉
- 支援 100+ 文章無性能問題

---

### 4. 預加載與預取 (P1)

**方案**: 智能預加載下一頁和文章詳情

```vue
<!-- pages/articles/index.vue -->
<script setup>
// 預取下一頁
watch(() => pagination.value?.page, (page) => {
  if (page && page < pagination.value.totalPages) {
    prefetchComponents('/api/blog', {
      params: { page: page + 1, limit: 9 }
    })
  }
})

// 預取文章詳情 (hover 時)
const prefetchPost = (slug: string) => {
  prefetchComponents(`/api/blog/${slug}`)
}
</script>

<template>
  <BlogCard
    v-for="post in posts"
    :key="post.id"
    :post="post"
    @mouseenter="prefetchPost(post.slug)"
  />
</template>
```

**預期效果**:
- 點擊文章時即時載入 (已預取)
- 翻頁體驗更流暢

---

### 5. 數據庫查詢優化 (P0)

**當前問題**: `server/api/blog/index.get.ts:56` 使用 `contains` 搜尋

```typescript
// ❌ 當前 (慢)
if (search) {
  where.OR = [
    { title: { contains: search } },
    { excerpt: { contains: search } },
    { content: { contains: search } } // 全文搜尋很慢
  ]
}
```

**方案**: 使用全文索引

```prisma
// prisma/schema.prisma
model Post {
  // ...
  @@index([title, excerpt], type: Fulltext)
}
```

```typescript
// ✅ 改進 (快)
if (search) {
  where.OR = [
    { title: { search } },
    { excerpt: { search } }
  ]
  // 移除 content 搜尋，或使用專門的搜尋引擎
}
```

**進階方案**: 整合 Algolia / Meilisearch

```typescript
// lib/search.ts
import { MeiliSearch } from 'meilisearch'

const client = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST,
  apiKey: process.env.MEILISEARCH_KEY
})

export async function searchPosts(query: string) {
  const index = client.index('posts')
  return await index.search(query, {
    attributesToHighlight: ['title', 'excerpt'],
    limit: 20
  })
}
```

**預期效果**:
- 搜尋速度從 ~500ms 降至 ~50ms
- 支援模糊搜尋、高亮、排序

---

## 🎨 UI/UX 改善方案

### 6. 富文本編輯器升級 (P1)

**問題**: 當前 `BlogEditor.vue` 只是純文本框，缺少 Markdown 輔助

**方案**: 整合 Toast UI Editor 或 Milkdown

```bash
npm install @toast-ui/vue-editor
```

```vue
<!-- components/BlogEditor.vue -->
<template>
  <div class="editor-container">
    <Editor
      :initial-value="localContent"
      :options="editorOptions"
      height="600px"
      initial-edit-type="markdown"
      preview-style="vertical"
      @change="handleChange"
    />
  </div>
</template>

<script setup>
import { Editor } from '@toast-ui/vue-editor'
import '@toast-ui/editor/dist/toastui-editor.css'

const editorOptions = {
  minHeight: '600px',
  language: 'zh-TW',
  useCommandShortcut: true,
  usageStatistics: false,
  toolbarItems: [
    ['heading', 'bold', 'italic', 'strike'],
    ['hr', 'quote'],
    ['ul', 'ol', 'task', 'indent', 'outdent'],
    ['table', 'image', 'link'],
    ['code', 'codeblock']
  ],
  hooks: {
    addImageBlobHook: async (blob, callback) => {
      // 上傳圖片到 CDN
      const url = await uploadImage(blob)
      callback(url, 'image')
    }
  }
}

const handleChange = () => {
  const markdown = editorInstance.value.getMarkdown()
  emit('update:content', markdown)
}
</script>
```

**功能增強**:
- ✅ 所見即所得預覽
- ✅ 工具欄快捷操作
- ✅ 圖片拖拽上傳
- ✅ 語法高亮
- ✅ 快捷鍵支援 (Ctrl+B, Ctrl+I)

---

### 7. 自動儲存草稿 (P1)

**方案**: 使用 LocalStorage + 定時儲存

```vue
<!-- pages/admin/blog/new.vue -->
<script setup>
import { useDebounceFn, useLocalStorage } from '@vueuse/core'

const draftKey = computed(() => `blog-draft-${route.params.id || 'new'}`)
const draft = useLocalStorage(draftKey.value, {
  title: '',
  content: '',
  category: '',
  tags: ''
})

// 自動儲存 (3 秒防抖)
const autoSave = useDebounceFn(() => {
  draft.value = {
    title: form.title,
    content: form.content,
    category: form.category,
    tags: form.tags
  }
  toast.info('草稿已自動儲存', { duration: 1000 })
}, 3000)

watch([() => form.title, () => form.content], autoSave)

// 載入草稿
onMounted(() => {
  if (draft.value.title) {
    const shouldRestore = confirm('發現未儲存的草稿，是否恢復？')
    if (shouldRestore) {
      Object.assign(form, draft.value)
    }
  }
})

// 發布後清除草稿
const publishPost = async () => {
  await $fetch('/api/blog', { method: 'POST', body: form })
  localStorage.removeItem(draftKey.value)
  toast.success('發布成功')
}
</script>
```

**預期效果**:
- 防止意外關閉頁面導致內容丟失
- 提升用戶信心

---

### 8. 批量操作 (P1)

**方案**: 添加多選和批量操作

```vue
<!-- pages/admin/blog/index.vue -->
<script setup>
const selectedPosts = ref<Set<string>>(new Set())
const selectAll = ref(false)

const toggleSelectAll = () => {
  if (selectAll.value) {
    selectedPosts.value = new Set(posts.value.map(p => p.id))
  } else {
    selectedPosts.value.clear()
  }
}

const bulkPublish = async () => {
  const ids = Array.from(selectedPosts.value)
  await $fetch('/api/blog/admin/bulk-publish', {
    method: 'POST',
    body: { ids }
  })
  toast.success(`已發布 ${ids.length} 篇文章`)
  await fetchPosts()
}

const bulkDelete = async () => {
  const ids = Array.from(selectedPosts.value)
  if (!confirm(`確定要刪除 ${ids.length} 篇文章？`)) return

  await $fetch('/api/blog/admin/bulk-delete', {
    method: 'POST',
    body: { ids }
  })
  toast.success(`已刪除 ${ids.length} 篇文章`)
  await fetchPosts()
}
</script>

<template>
  <div class="bulk-actions" v-if="selectedPosts.size > 0">
    <span>已選擇 {{ selectedPosts.size }} 篇</span>
    <button @click="bulkPublish">批量發布</button>
    <button @click="bulkDelete">批量刪除</button>
  </div>

  <table>
    <thead>
      <tr>
        <th>
          <input
            type="checkbox"
            v-model="selectAll"
            @change="toggleSelectAll"
          />
        </th>
        <th>標題</th>
        <!-- ... -->
      </tr>
    </thead>
    <tbody>
      <tr v-for="post in posts" :key="post.id">
        <td>
          <input
            type="checkbox"
            :checked="selectedPosts.has(post.id)"
            @change="toggleSelect(post.id)"
          />
        </td>
        <!-- ... -->
      </tr>
    </tbody>
  </table>
</template>
```

**新增 API**:
```typescript
// server/api/blog/admin/bulk-publish.post.ts
export default defineEventHandler(async (event) => {
  const { ids } = await readBody(event)

  await prisma.post.updateMany({
    where: { id: { in: ids.map(id => BigInt(id)) } },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date()
    }
  })

  return { success: true, count: ids.length }
})
```

---

### 9. 拖拽排序 (P2)

**方案**: 使用 VueDraggable

```bash
npm install vuedraggable@next
```

```vue
<!-- pages/admin/blog/index.vue -->
<script setup>
import draggable from 'vuedraggable'

const drag = ref(false)

const updateOrder = async () => {
  const orderMap = posts.value.map((post, index) => ({
    id: post.id,
    order: index
  }))

  await $fetch('/api/blog/admin/reorder', {
    method: 'POST',
    body: { orders: orderMap }
  })
}
</script>

<template>
  <draggable
    v-model="posts"
    @start="drag = true"
    @end="drag = false; updateOrder()"
    item-key="id"
    handle=".drag-handle"
  >
    <template #item="{ element: post }">
      <tr>
        <td class="drag-handle">
          <Icon name="heroicons:bars-3" class="cursor-move" />
        </td>
        <td>{{ post.title }}</td>
        <!-- ... -->
      </tr>
    </template>
  </draggable>
</template>
```

---

### 10. 進階篩選與排序 (P1)

**方案**: 添加更多篩選選項

```vue
<!-- pages/admin/blog/index.vue -->
<template>
  <div class="filters">
    <!-- 現有篩選 -->
    <select v-model="filters.status">...</select>
    <select v-model="filters.category">...</select>
    <input v-model="filters.search" />

    <!-- 新增篩選 -->
    <select v-model="filters.author">
      <option value="">所有作者</option>
      <option v-for="author in authors" :value="author.id">
        {{ author.name }}
      </option>
    </select>

    <select v-model="filters.sortBy">
      <option value="publishedAt:desc">發布時間 (新到舊)</option>
      <option value="publishedAt:asc">發布時間 (舊到新)</option>
      <option value="createdAt:desc">建立時間 (新到舊)</option>
      <option value="title:asc">標題 (A-Z)</option>
    </select>

    <input
      type="date"
      v-model="filters.dateFrom"
      placeholder="開始日期"
    />
    <input
      type="date"
      v-model="filters.dateTo"
      placeholder="結束日期"
    />
  </div>
</template>
```

---

### 11. 即時預覽改進 (P1)

**問題**: 當前預覽在編輯器下方，需要滾動查看

**方案**: 分屏預覽

```vue
<!-- components/BlogEditor.vue -->
<template>
  <div class="editor-layout">
    <div class="editor-pane">
      <textarea v-model="localContent" />
    </div>

    <div class="preview-pane">
      <div class="preview-toolbar">
        <button @click="syncScroll = !syncScroll">
          {{ syncScroll ? '🔗 同步滾動' : '🔓 獨立滾動' }}
        </button>
      </div>
      <div
        ref="previewEl"
        class="preview-content"
        @scroll="handlePreviewScroll"
      >
        <MDC :value="localContent" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  height: 600px;
}

.editor-pane,
.preview-pane {
  overflow-y: auto;
}

@media (max-width: 768px) {
  .editor-layout {
    grid-template-columns: 1fr;
  }
}
</style>
```

---

### 12. 文章統計儀表板 (P2)

**方案**: 添加統計頁面

```vue
<!-- pages/admin/blog/stats.vue -->
<template>
  <div class="stats-dashboard">
    <div class="stat-card">
      <h3>總文章數</h3>
      <p class="stat-value">{{ stats.total }}</p>
    </div>

    <div class="stat-card">
      <h3>已發布</h3>
      <p class="stat-value">{{ stats.published }}</p>
    </div>

    <div class="stat-card">
      <h3>草稿</h3>
      <p class="stat-value">{{ stats.drafts }}</p>
    </div>

    <div class="stat-card">
      <h3>本月新增</h3>
      <p class="stat-value">{{ stats.thisMonth }}</p>
    </div>

    <!-- 分類分佈圖表 -->
    <div class="chart-card">
      <h3>分類分佈</h3>
      <canvas ref="categoryChart"></canvas>
    </div>

    <!-- 發布趨勢圖表 -->
    <div class="chart-card">
      <h3>發布趨勢</h3>
      <canvas ref="trendChart"></canvas>
    </div>
  </div>
</template>

<script setup>
import Chart from 'chart.js/auto'

const stats = ref({
  total: 0,
  published: 0,
  drafts: 0,
  thisMonth: 0,
  categoryDistribution: {},
  publishTrend: []
})

onMounted(async () => {
  stats.value = await $fetch('/api/blog/admin/stats')
  renderCharts()
})
</script>
```

---

## 🔍 SEO 與可訪問性改善

### 13. 結構化數據 (P1)

**方案**: 添加 JSON-LD

```vue
<!-- pages/articles/[slug].vue -->
<script setup>
useHead(() => ({
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.value?.title,
        image: post.value?.coverImage,
        datePublished: post.value?.publishedAt,
        dateModified: post.value?.updatedAt,
        author: {
          '@type': 'Person',
          name: post.value?.author.name
        },
        publisher: {
          '@type': 'Organization',
          name: 'Trade Basic',
          logo: {
            '@type': 'ImageObject',
            url: `${siteUrl}/icon-512x512.png`
          }
        },
        description: post.value?.excerpt
      })
    }
  ]
}))
</script>
```

---

### 14. 閱讀進度條 (P2)

**方案**: 添加頂部進度條

```vue
<!-- pages/articles/[slug].vue -->
<script setup>
import { useScroll } from '@vueuse/core'

const { y } = useScroll(window)
const progress = computed(() => {
  const height = document.documentElement.scrollHeight - window.innerHeight
  return (y.value / height) * 100
})
</script>

<template>
  <div class="reading-progress" :style="{ width: `${progress}%` }" />
  <article>...</article>
</template>

<style scoped>
.reading-progress {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(90deg, #0ea5e9, #f59e0b);
  z-index: 9999;
  transition: width 0.1s ease;
}
</style>
```

---

### 15. 鍵盤導航 (P2)

**方案**: 添加快捷鍵

```vue
<!-- pages/articles/index.vue -->
<script setup>
import { useMagicKeys } from '@vueuse/core'

const { ctrl_k, escape } = useMagicKeys()

watch(ctrl_k, (pressed) => {
  if (pressed) {
    // 聚焦搜尋框
    document.getElementById('search')?.focus()
  }
})

watch(escape, (pressed) => {
  if (pressed) {
    // 清除搜尋
    searchQuery.value = ''
  }
})
</script>

<template>
  <div class="keyboard-hint">
    按 <kbd>Ctrl</kbd> + <kbd>K</kbd> 搜尋
  </div>
</template>
```

---

## 📱 移動端優化

### 16. 底部導航優化 (P1)

**方案**: 移動端顯示浮動操作按鈕

```vue
<!-- pages/articles/index.vue -->
<template>
  <div class="mobile-fab" v-if="isMobile">
    <button @click="scrollToTop" class="fab-button">
      <Icon name="heroicons:arrow-up" />
    </button>
    <button @click="toggleFilters" class="fab-button">
      <Icon name="heroicons:funnel" />
    </button>
  </div>
</template>

<style scoped>
.mobile-fab {
  position: fixed;
  bottom: 80px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 100;
}

.fab-button {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #0ea5e9;
  color: white;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
</style>
```

---

## 🎯 優先級總結

### 🔥 P0 - 立即實施 (性能關鍵)
1. ✅ API 響應緩存
2. ✅ 圖片優化 (WebP + CDN)
3. ✅ 數據庫查詢優化 (全文索引)

### ⚡ P1 - 近期實施 (UX 提升)
4. 無限滾動 / 虛擬滾動
5. 預加載與預取
6. 富文本編輯器升級
7. 自動儲存草稿
8. 批量操作
9. 進階篩選與排序
10. 即時預覽改進
11. 結構化數據 (SEO)
12. 移動端優化

### 🌟 P2 - 長期優化 (錦上添花)
13. 拖拽排序
14. 文章統計儀表板
15. 閱讀進度條
16. 鍵盤導航

---

## 📈 預期效果

### 性能指標
| 指標 | 當前 | 目標 | 改善 |
|------|------|------|------|
| 首頁 LCP | ~2.5s | <1.5s | ⬇️ 40% |
| 文章頁 LCP | ~3.0s | <2.0s | ⬇️ 33% |
| API 響應時間 | ~200ms | ~20ms | ⬇️ 90% |
| 圖片大小 | ~2MB | ~400KB | ⬇️ 80% |
| 搜尋速度 | ~500ms | ~50ms | ⬇️ 90% |

### UX 指標
- ✅ 編輯器體驗提升 (WYSIWYG)
- ✅ 草稿自動儲存 (防止數據丟失)
- ✅ 批量操作 (管理效率提升 3x)
- ✅ 無限滾動 (減少點擊次數)
- ✅ 移動端體驗改善

---

## 🛠️ 實施建議

### 階段 1 (Week 1-2): 性能優化
- 實施 API 緩存
- 整合 Nuxt Image
- 優化數據庫查詢

### 階段 2 (Week 3-4): 編輯器升級
- 整合 Toast UI Editor
- 實施自動儲存
- 改進預覽體驗

### 階段 3 (Week 5-6): Admin 功能增強
- 批量操作
- 進階篩選
- 統計儀表板

### 階段 4 (Week 7-8): 前台體驗優化
- 無限滾動
- 閱讀進度條
- 移動端優化

---

**總結**: 通過以上改善，Blog 系統的性能和用戶體驗將得到顯著提升，特別是在響應速度、編輯體驗和管理效率方面。建議優先實施 P0 級別的性能優化，然後逐步推進 UX 改善。
