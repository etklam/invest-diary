# Optional Redis 快取策略設計

## 設計原則

### 1. 優雅降級 (Graceful Degradation)
- Redis 可用時：提供高效能快取
- Redis 不可用時：自動降級到無快取模式
- 系統持續運作，不影響核心功能

### 2. 透明快取 (Transparent Caching)
- 應用程式碼不需要知道 Redis 是否可用
- 快取層自動處理可用性檢測
- 統一的快取介面，無論底層實現

### 3. 零配置啟用
- 系統可以在沒有 Redis 的情況下正常啟動
- Redis 配置可選，不影響基本功能
- 支援運行時 Redis 連接/斷開

## 架構設計

### 快取層架構
```
┌─────────────────┐
│   應用程式層    │
├─────────────────┤
│   快取抽象層    │ ← 統一快取介面
├─────────────────┤
│  適配器層      │ ← Redis/記憶體/無快取
├─────────────────┤
│   儲存層       │ ← Redis/記憶體/直接查詢
└─────────────────┘
```

## 實作方案

### 1. 快取抽象層

#### 快取介面定義
```typescript
// lib/cache/types.ts
export interface CacheAdapter {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl?: number): Promise<void>
  del(key: string): Promise<void>
  exists(key: string): Promise<boolean>
  clear(): Promise<void>
  
  // 健康檢查
  isHealthy(): Promise<boolean>
  
  // 統計資訊
  getStats(): Promise<CacheStats>
}

export interface CacheStats {
  hits: number
  misses: number
  sets: number
  deletes: number
  errors: number
}
```

#### 快取管理器
```typescript
// lib/cache/manager.ts
export class CacheManager {
  private adapter: CacheAdapter
  private fallbackAdapter: CacheAdapter
  
  constructor(redisAdapter: CacheAdapter, fallbackAdapter: CacheAdapter) {
    this.adapter = redisAdapter
    this.fallbackAdapter = fallbackAdapter
  }
  
  async get<T>(key: string): Promise<T | null> {
    try {
      // 嘗試使用主要快取適配器
      if (await this.adapter.isHealthy()) {
        const result = await this.adapter.get<T>(key)
        if (result !== null) {
          return result
        }
      }
    } catch (error) {
      console.warn('Primary cache adapter failed, falling back:', error)
    }
    
    // 降級到備用適配器
    return this.fallbackAdapter.get<T>(key)
  }
  
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      if (await this.adapter.isHealthy()) {
        await this.adapter.set(key, value, ttl)
        return
      }
    } catch (error) {
      console.warn('Primary cache adapter failed for set, falling back:', error)
    }
    
    await this.fallbackAdapter.set(key, value, ttl)
  }
  
  async getStats(): Promise<CacheStats> {
    try {
      if (await this.adapter.isHealthy()) {
        return this.adapter.getStats()
      }
    } catch (error) {
      console.warn('Primary cache stats unavailable:', error)
    }
    
    return this.fallbackAdapter.getStats()
  }
}
```

### 2. Redis 適配器

#### Redis 實作
```typescript
// lib/cache/adapters/redis.ts
export class RedisCacheAdapter implements CacheAdapter {
  private redis: Redis | null = null
  private connectionAttempts = 0
  private maxRetries = 3
  private lastHealthCheck = 0
  private healthCheckInterval = 30000 // 30秒
  private isHealthyCache = false
  
  constructor(private redisUrl?: string) {
    this.initializeRedis()
  }
  
  private async initializeRedis() {
    if (!this.redisUrl) {
      console.log('Redis URL not configured, Redis cache disabled')
      return
    }
    
    try {
      this.redis = new Redis(this.redisUrl, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      })
      
      await this.redis.connect()
      this.isHealthyCache = true
      console.log('Redis connected successfully')
    } catch (error) {
      console.warn('Redis connection failed:', error)
      this.redis = null
      this.isHealthyCache = false
    }
  }
  
  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null
    
    try {
      const value = await this.redis.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error('Redis get error:', error)
      throw error
    }
  }
  
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.redis) return
    
    try {
      const serialized = JSON.stringify(value)
      if (ttl) {
        await this.redis.setex(key, ttl, serialized)
      } else {
        await this.redis.set(key, serialized)
      }
    } catch (error) {
      console.error('Redis set error:', error)
      throw error
    }
  }
  
  async del(key: string): Promise<void> {
    if (!this.redis) return
    
    try {
      await this.redis.del(key)
    } catch (error) {
      console.error('Redis del error:', error)
      throw error
    }
  }
  
  async exists(key: string): Promise<boolean> {
    if (!this.redis) return false
    
    try {
      const result = await this.redis.exists(key)
      return result === 1
    } catch (error) {
      console.error('Redis exists error:', error)
      return false
    }
  }
  
  async clear(): Promise<void> {
    if (!this.redis) return
    
    try {
      await this.redis.flushdb()
    } catch (error) {
      console.error('Redis clear error:', error)
      throw error
    }
  }
  
  async isHealthy(): Promise<boolean> {
    const now = Date.now()
    
    // 快取健康檢查結果，避免頻繁檢查
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return this.isHealthyCache
    }
    
    this.lastHealthCheck = now
    
    if (!this.redis) {
      this.isHealthyCache = false
      return false
    }
    
    try {
      await this.redis.ping()
      this.isHealthyCache = true
      return true
    } catch (error) {
      console.warn('Redis health check failed:', error)
      this.isHealthyCache = false
      
      // 嘗試重新連接
      if (this.connectionAttempts < this.maxRetries) {
        this.connectionAttempts++
        setTimeout(() => this.initializeRedis(), 5000)
      }
      
      return false
    }
  }
  
  async getStats(): Promise<CacheStats> {
    if (!this.redis) {
      return {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        errors: 0
      }
    }
    
    try {
      const info = await this.redis.info('stats')
      return this.parseRedisStats(info)
    } catch (error) {
      console.error('Redis stats error:', error)
      return {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        errors: 1
      }
    }
  }
  
  private parseRedisStats(info: string): CacheStats {
    const stats: CacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    }
    
    const lines = info.split('\r\n')
    for (const line of lines) {
      if (line.startsWith('keyspace_hits:')) {
        stats.hits = parseInt(line.split(':')[1]) || 0
      } else if (line.startsWith('keyspace_misses:')) {
        stats.misses = parseInt(line.split(':')[1]) || 0
      }
    }
    
    return stats
  }
}
```

### 3. 記憶體快取適配器

#### 記憶體實作
```typescript
// lib/cache/adapters/memory.ts
export class MemoryCacheAdapter implements CacheAdapter {
  private cache = new Map<string, { value: any; expiry: number }>()
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0
  }
  
  private cleanupInterval: NodeJS.Timeout
  
  constructor() {
    // 定期清理過期的項目
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000) // 每分鐘清理一次
  }
  
  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key)
    
    if (!item) {
      this.stats.misses++
      return null
    }
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      this.stats.misses++
      return null
    }
    
    this.stats.hits++
    return item.value
  }
  
  async set<T>(key: string, value: T, ttl = 300): Promise<void> {
    const expiry = Date.now() + (ttl * 1000)
    this.cache.set(key, { value, expiry })
    this.stats.sets++
  }
  
  async del(key: string): Promise<void> {
    this.cache.delete(key)
    this.stats.deletes++
  }
  
  async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key)
    if (!item) return false
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }
  
  async clear(): Promise<void> {
    this.cache.clear()
  }
  
  async isHealthy(): Promise<boolean> {
    return true // 記憶體快取總是健康的
  }
  
  async getStats(): Promise<CacheStats> {
    return { ...this.stats }
  }
  
  private cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key)
      }
    }
  }
  
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
  }
}
```

### 4. 無快取適配器

#### 無快取實作
```typescript
// lib/cache/adapters/none.ts
export class NoCacheAdapter implements CacheAdapter {
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0
  }
  
  async get<T>(key: string): Promise<T | null> {
    this.stats.misses++
    return null
  }
  
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    this.stats.sets++
    // 不儲存任何東西
  }
  
  async del(key: string): Promise<void> {
    this.stats.deletes++
    // 不執行刪除
  }
  
  async exists(key: string): Promise<boolean> {
    return false
  }
  
  async clear(): Promise<void> {
    // 不執行清理
  }
  
  async isHealthy(): Promise<boolean> {
    return true
  }
  
  async getStats(): Promise<CacheStats> {
    return { ...this.stats }
  }
}
```

### 5. 快取工廠和配置

#### 快取工廠
```typescript
// lib/cache/factory.ts
export class CacheFactory {
  static create(): CacheManager {
    // 嘗試建立 Redis 適配器
    const redisAdapter = new RedisCacheAdapter(process.env.REDIS_URL)
    
    // 建立記憶體適配器作為備用
    const memoryAdapter = new MemoryCacheAdapter()
    
    // 如果沒有 Redis 配置，使用記憶體適配器作為主要
    if (!process.env.REDIS_URL) {
      console.log('Redis not configured, using memory cache')
      return new CacheManager(memoryAdapter, new NoCacheAdapter())
    }
    
    // 使用 Redis 作為主要，記憶體作為備用
    return new CacheManager(redisAdapter, memoryAdapter)
  }
}
```

#### Nuxt 插件整合
```typescript
// plugins/cache.client.ts
export default defineNuxtPlugin(async () => {
  const cacheManager = CacheFactory.create()
  
  // 提供給整個應用程式使用
  provide('cache', cacheManager)
  
  // 定期檢查快取健康狀態
  setInterval(async () => {
    const stats = await cacheManager.getStats()
    console.log('Cache stats:', stats)
  }, 60000) // 每分鐘記錄一次
})
```

## 使用範例

### API 路由中的使用
```typescript
// server/api/stocks/holdings.get.ts
export default defineEventHandler(async (event) => {
  const cache = await useCache()
  const userId = event.context.user?.id
  const cacheKey = `holdings:${userId}`
  
  try {
    // 嘗試從快取獲取
    const cached = await cache.get(cacheKey)
    if (cached) {
      setHeader(event, 'x-cache-status', 'hit')
      return cached
    }
    
    // 快取未命中，從資料庫查詢
    const holdings = await calculateHoldings(userId)
    
    // 儲存到快取（5分鐘過期）
    await cache.set(cacheKey, holdings, 300)
    
    setHeader(event, 'x-cache-status', 'miss')
    return holdings
    
  } catch (error) {
    console.error('Cache operation failed:', error)
    
    // 即使快取失敗，也能正常運作
    const holdings = await calculateHoldings(userId)
    setHeader(event, 'x-cache-status', 'bypass')
    return holdings
  }
})
```

### 元件中的使用
```typescript
// composables/useCachedData.ts
export const useCachedData = <T>(key: string, fetcher: () => Promise<T>, ttl = 300) => {
  const cache = useNuxtApp().$cache as CacheManager
  const data = ref<T | null>(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)
  
  const fetchData = async () => {
    loading.value = true
    error.value = null
    
    try {
      // 嘗試從快取獲取
      const cached = await cache.get<T>(key)
      if (cached) {
        data.value = cached
        loading.value = false
        return
      }
      
      // 從 API 獲取
      const result = await fetcher()
      data.value = result
      
      // 儲存到快取
      await cache.set(key, result, ttl)
      
    } catch (err) {
      error.value = err as Error
    } finally {
      loading.value = false
    }
  }
  
  onMounted(() => {
    fetchData()
  })
  
  return {
    data: readonly(data),
    loading: readonly(loading),
    error: readonly(error),
    refresh: fetchData
  }
}
```

## 配置選項

### 環境變數
```bash
# Redis 配置（可選）
REDIS_URL=redis://localhost:6379

# 快取配置
CACHE_DEFAULT_TTL=300
CACHE_MAX_MEMORY_SIZE=100mb
CACHE_CLEANUP_INTERVAL=60000

# 健康檢查配置
CACHE_HEALTH_CHECK_INTERVAL=30000
CACHE_MAX_RETRIES=3
```

### Nuxt 配置
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    // Redis 配置（可選）
    redisUrl: process.env.REDIS_URL,
    
    // 快取配置
    cache: {
      defaultTtl: 300,
      maxSize: '100mb',
      cleanupInterval: 60000
    },
    
    // 健康檢查配置
    healthCheck: {
      interval: 30000,
      maxRetries: 3
    }
  }
})
```

## 監控和除錯

### 快取狀態端點
```typescript
// server/api/cache/status.get.ts
export default defineEventHandler(async (event) => {
  const cache = await useCache()
  const stats = await cache.getStats()
  
  return {
    status: 'ok',
    cache: {
      adapter: cache.constructor.name,
      stats,
      healthy: await cache.isHealthy()
    },
    timestamp: new Date().toISOString()
  }
})
```

### 快取清理端點
```typescript
// server/api/cache/clear.post.ts
export default defineEventHandler(async (event) => {
  const cache = await useCache()
  await cache.clear()
  
  return {
    status: 'ok',
    message: 'Cache cleared successfully',
    timestamp: new Date().toISOString()
  }
})
```

## 部署考量

### Docker 配置
```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    environment:
      - REDIS_URL=redis://redis:6379  # 可選
    depends_on:
      - redis
    restart: unless-stopped
  
  redis:  # 可選服務
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

volumes:
  redis_data:
```

### 健康檢查
```typescript
// scripts/health-check.ts
async function checkCacheHealth() {
  try {
    const cache = CacheFactory.create()
    const isHealthy = await cache.isHealthy()
    
    if (!isHealthy) {
      console.warn('Cache system unhealthy')
      return false
    }
    
    console.log('Cache system healthy')
    return true
  } catch (error) {
    console.error('Cache health check failed:', error)
    return false
  }
}
```

## 效能影響

### 有 Redis 的情況
- **讀取效能**: ~1ms（記憶體存取）
- **寫入效能**: ~1ms（記憶體存取）
- **網路延遲**: ~0.1ms（本地網路）
- **總體影響**: 顯著提升

### 無 Redis 的情況
- **記憶體快取**: ~0.1ms（進程內存取）
- **無快取**: 直接查詢資料庫
- **總體影響**: 正常運作，無效能提升

### 記憶體使用
- **Redis 快取**: 外部記憶體，不影響應用程式
- **記憶體快取**: 應用程式記憶體，需要限制大小
- **無快取**: 最小記憶體使用

---

*這個設計確保了系統在任何情況下都能正常運作，同時在有 Redis 的情況下提供最佳效能*