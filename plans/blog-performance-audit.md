# 部落格頁面性能審計與落地修正版計劃

> 本文件為 **依據現有 Nuxt 3 + Prisma + Nitro 架構**
> **最後更新**: 2026-02-18 | **狀態**: 已實施關鍵修復

---

## 概述

本計劃針對部落格列表頁與文章詳情頁進行性能優化，重點放在 **首屏體驗（LCP / FCP）**、**資料載入策略** 與 **可觀測性**，並遵循「最小風險、可漸進上線」原則。

**已實施**: PWA 快取衝突修復、API 投影優化、Web Vitals 監控

---

## 🔍 現況與問題確認（已與代碼庫對齊）

### ⚠️ **CRITICAL**: PWA 快取衝突（已修復 ✅）

- **問題**：
  - Nitro routeRules 設定 `/api/**` 為 `no-store`
  - 但 PWA Workbox 仍然快取 API 路由 5 分鐘
  - 這可能導致 400 slug 錯誤再次發生

- **影響**：
  - Service Worker 可能回傳舊的 API 回應
  - 動態路由 slug 解析失敗
  - 與 CLAUDE.md 記錄的已知問題衝突

- **修復方案**（已實施）：
  - 從 PWA workbox runtimeCaching 中移除 API 路由快取
  - 保持 Nitro 的 `Cache-Control: no-store` 設定
  - 見 `nuxt.config.ts:95-120`

---

### 1. 單一 API 回傳完整內容（✅ 已確認 & 部分修復）

- 現況：
  - [`server/api/blog/[slug].get.ts`](server/api/blog/[slug].get.ts) 每次請求皆回傳 `content`
  - [`pages/blog/[slug].vue`](pages/blog/[slug].vue) 首屏即渲染完整 Markdown
  - **發現**: [`server/api/blog/index.get.ts`](server/api/blog/index.get.ts) 也回傳完整 `content` 字段

- 問題：
  - Blog 列表頁載入 9 篇文章，每篇約 5KB Markdown = 45KB 不必要傳輸
  - LCP 與 hydration 時間過長

- **修復方案**（已實施）：
  - Blog list API 已加入 `select` projection，排除 `content` 字段
  - 詳情頁 API 將加入 `?view=meta` 查詢參數支援

---

### 2. Markdown 於 Client 端即時解析（✅ 已確認）

- 使用 `@nuxtjs/mdc` 動態解析
- 無 server / ISR 預處理

---

### 3. 重複計算（✅ 已確認）

- 閱讀時間、標籤解析為 render-time 計算
- 發生於 [`lib/blog.ts`](lib/blog.ts) 與 [`components/BlogCard.vue`](components/BlogCard.vue)

---

## 🚀 修正版優化策略（與現況完全相容）

## ✅ 高優先級（立即落地）

### 1️⃣ 單一 API + Projection 分層（已部分實施 ✅）

**不新增 `/meta` API**，避免資料分裂。

- **Blog List API**（已完成）：移除 `content` 字段
  ```ts
  // server/api/blog/index.get.ts:42-57
  select: {
    id: true, title: true, slug: true, excerpt: true,
    coverImage: true, category: true, tags: true, publishedAt: true,
    // ❌ Excluding 'content' field - reduces payload by ~45KB
  }
  ```

- **Blog Detail API**（待實施）：加入 `?view=meta` 查詢參數
  ```ts
  // server/api/blog/[slug].get.ts
  const view = getQuery(event).view ?? 'full'

  const select = view === 'meta'
    ? { id: true, title: true, slug: true, excerpt: true, coverImage: true, publishedAt: true }
    : undefined
  ```

✅ 好處：
- 共用 middleware / auth / cache
- 不產生 schema 漂移
- 向後相容（預設為 `view=full`）

---

### 2️⃣ 圖片優化（已安裝 @nuxt/image ✅）

- **已安裝**: `@nuxt/image` 已加入 package.json
- **待實施**:
  ```vue
  <!-- Replace img tags with NuxtImage -->
  <NuxtImg
    :src="post.coverImage"
    :alt="post.title"
    loading="lazy"
    width="800"
    height="500"
    format="webp"
    class="w-full object-cover"
  />
  ```

- 使用原生 `loading="lazy"`
- 支援 WebP 格式轉換
- 自動響應式尺寸

❌ 移除：`vue-lazyload`（如果存在）

---

### 3️⃣ Web Vitals 監控（已實施 ✅）

- **已建立**: `composables/usePerformance.ts`
- **追蹤指標**:
  - LCP (Largest Contentful Paint) - 目標: < 2.5s
  - FCP (First Contentful Paint) - 目標: < 1.8s
  - CLS (Cumulative Layout Shift) - 目標: < 0.1
  - INP (Interaction to Next Paint) - 目標: < 200ms
  - TTFB (Time to First Byte) - 目標: < 800ms

- **待實施**:
  1. 安裝依賴：`npm install`
  2. 在 blog 頁面加入監控：
     ```ts
     // pages/blog/[slug].vue
     const { metrics, areCoreVitalsGood } = usePerformance()
     ```
  3. 連接分析服務（GA4、Plausible 等）

---

### 4️⃣ Skeleton UI（低風險）

- 使用 Tailwind `animate-pulse`
- 不影響 data flow
- 為 blog cards 和 detail 頁面加入骨架屏

---

## ⚠️ 中優先級（需小幅調整後實施）

### 5️⃣ Markdown Server 預處理（不污染 Prisma Model）

⚠️ **風險評估**：需實測性能收益，可能不必要

```ts
// server/api/blog/[slug].get.ts
import { Markdown } from '@nuxtjs/mdc'

const post = await prisma.post.findFirst({ ... })

// 僅在 view=full 時預處理
if (view === 'full') {
  const renderedContent = await Markdown.parse(post.content)
  return {
    ...post,
    renderedContent, // 前端直接使用，不再解析
    content: post.content // 保留原始內容供編輯
  }
}
```

✅ 好處：
- 減少客戶端 JS 執行時間
- 預處理結果可快取

❌ 風險：
- 增加伺服器負載
- @nuxtjs/mdc 的 server-side API 需確認
- 可能影響 i18n 動態切換

---

### 6️⃣ 計算結果下推（Server-only）

將重複計算移至伺服器端：

```ts
// server/api/blog/[slug].get.ts
import { calculateReadingTime, parseTags } from '~/lib/blog'

const post = await prisma.post.findFirst({ ... })

// 計算一次，存入回應
return {
  ...post,
  readingTime: calculateReadingTime(post.content),
  tagList: parseTags(post.tags)
}
```

✅ 好處：
- 減少客戶端計算
- 所有用戶獲得一致結果

---

## 🧠 低優先級（後期）

### 7️⃣ Prefetch（互動觸發）

- 使用 `NuxtLink` 自動 prefetch 或手動觸發
- 僅 prefetch `view=full` 內容
- 考慮預取上一篇/下一篇文章

---

### 8️⃣ 進階快取（延後）

❌ 暫不導入：
- Service Worker API 快取（已移除）
- Edge cache（需額外基礎設施）

✅ 前置條件：
- Web Vitals RUM 已上線
- 基線指標已建立

---

## 🧱 Static / Hybrid 預先生成策略

### 結論摘要

- ✅ Blog 技術上可進行 Static 生成
- ⚠️ 不建議全量 SSG（nuxt generate）
- ✅ 最佳解為 Hybrid：SSG + ISR（Incremental Static Regeneration）

---

### 為何不採用全量 SSG

- 文章來源為 Database（Prisma），非檔案
- 新增 / 更新文章需 rebuild & redeploy
- 存在 `DRAFT / PUBLISHED` 狀態與 preview 需求
- 已啟用 PWA / Service Worker，容易造成舊內容 cache
- **i18n 多語言**: 3 locales × N posts = 3× 快取空間

---

### 適合 Static 化的頁面

| 頁面 | 建議 | 說明 |
|---|---|---|
| Blog index | ✅ SSG / prerender | SEO 入口、低變動 |
| 熱門文章 | ✅ SSG | 可定期更新 |
| About | ✅ SSG | 純靜態 |

---

### Blog 詳情頁的推薦方案：ISR

```ts
// nuxt.config.ts
nitro: {
  routeRules: {
    '/blog': { prerender: true },  // 靜態化列表頁
    '/blog/**': { isr: 60 * 60 }   // ISR 每小時重新生成
  }
}
```

✅ 特性：
- 首次請求後即轉為 static
- 自動過期，不需 rebuild
- 與 DB / Prisma 完全相容

⚠️ **注意**：
- ISR 在 dev 模式行為不同，需用 `npm run build && npm run preview` 測試
- 考慮 i18n locale 對快取的影響

---

### 實施時機建議

- **Phase 1**: Web Vitals 監控上線，建立基線
- **Phase 2**: Blog index SSG + Blog detail ISR
- **Phase 3**: 文章 publish 時觸發 on-demand revalidate
- **Phase 4**: 測量性能，決定是否需要 server-side markdown 預處理

---

## 🔍 遺留問題與後續調查

### A. 資料庫索引

需檢查 `prisma/schema.prisma` 是否有適當索引：

```prisma
model Post {
  id          String @id @default(cuid())
  slug        String
  status      String
  publishedAt DateTime?

  // 建議加入的索引
  @@index([slug, status])  // 加快 slug 查詢
  @@index([status, publishedAt])  // 加快列表頁查詢
}
```

---

### B. SEO 優化（未包含於本計劃）

- JSON-LD 結構化數據（Article schema）
- Open Graph 擴展（article:published_time, article:tag）
- Canonical URL 設定
- Sitemap 自動生成

---

### C. TypeScript 錯誤修復

`nuxt.config.ts:44` 有 TS 錯誤：`lazy` 不存在於 i18n 選項。需修正為：
```ts
i18n: {
  // 移除 lazy: true，改為 load
  // 或更新至最新版 @nuxtjs/i18n 語法
}
```

---

## 📈 預期成果（現實修正版）

基於已實施的修復：
- **Blog list payload**: ↓ ~45KB（移除 content 字段）
- **PWA 快取衝突**: 解決，防止 400 錯誤
- **LCP**: 預期 ↓ 20-30%（需基線測量）
- **Hydration time**: 預期顯著下降

完整實施後：
- LCP ↓ 40–60%
- 首次 payload ↓ 50%+
- hydration 時間顯著下降

---

## ✅ 成功標準（可驗證）

### 技術指標
- Lighthouse Performance ≥ 90
- Blog 詳情頁 LCP < 2.5s
- Blog 列表頁 FCP < 1.8s
- CLS < 0.1

### 程式碼品質
- 無新增高風險 dependency
- 所有變更向後相容
- 測試覆蓋率未下降

### 運作穩定性
- PWA 快取無衝突
- ISR 於 production 正常運作
- Web Vitals 無異常值

---

## 📝 實施檢查清單

### ✅ 已完成
- [x] 修復 PWA API 快取衝突
- [x] Blog list API 移除 content 字段
- [x] 加入 @nuxt/image 依賴
- [x] 建立 Web Vitals 監控 composable

### 🔄 進行中
- [ ] 安裝新依賴（`npm install`）
- [ ] Blog detail API 加入 view=meta 參數
- [ ] 使用 NuxtImg 替換 img 標籤
- [ ] 為 blog 頁面加入骨架屏

### 📋 待辦
- [ ] 建立性能基線（Lighthouse 測試）
- [ ] 檢查並加入資料庫索引
- [ ] 整合 Web Vitals 到分析服務
- [ ] 實施 ISR（Phase 2）
- [ ] Server-side markdown 預處理（需實測決定）
- [ ] SEO 優化（獨立計劃）

---

## 🔗 相關檔案

- `nuxt.config.ts` - PWA 和模組配置
- `server/api/blog/index.get.ts` - Blog list API（已優化）
- `server/api/blog/[slug].get.ts` - Blog detail API（待優化）
- `pages/blog/index.vue` - Blog 列表頁
- `pages/blog/[slug].vue` - Blog 詳情頁
- `composables/usePerformance.ts` - Web Vitals 監控
- `lib/blog.ts` - Blog 輔助函式
- `CLAUDE.md` - 專案架構與已知問題

---

**最後更新**: 2026-02-18
**下次審查**: 完成 Phase 1 優化後
