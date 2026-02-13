<template>
  <nav class="bottom-navigation" :class="{ 'has-safe-area': hasSafeArea }">
    <div class="nav-container">
      <router-link
        v-for="item in navigationItems"
        :key="item.name"
        :to="item.to"
        class="nav-item"
        :class="{ 'nav-item--active': isActive(item.to) }"
        @click="handleNavClick(item)"
      >
        <div class="nav-item__icon">
          <component :is="item.icon" class="icon" />
          <div v-if="item.badge" class="nav-item__badge">
            {{ item.badge }}
          </div>
        </div>
        <span class="nav-item__label">{{ item.label }}</span>
      </router-link>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMobileDetection } from '~/composables/useMobileDetection'

// 導航項目接口
interface NavigationItem {
  name: string
  label: string
  to: string
  icon: any
  badge: number | null
}

// 圖標組件（這裡使用簡單的 SVG，實際項目中可以使用圖標庫）
const HomeIcon = () => h('svg', { 
  width: '24', 
  height: '24', 
  viewBox: '0 0 24 24', 
  fill: 'currentColor' 
}, [
  h('path', { d: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z' })
])

const ChartIcon = () => h('svg', { 
  width: '24', 
  height: '24', 
  viewBox: '0 0 24 24', 
  fill: 'currentColor' 
}, [
  h('path', { d: 'M3 13h2v8H3zm4-8h2v16H7zm4-2h2v18h-2zm4 4h2v14h-2zm4-2h2v16h-2z' })
])

const BookIcon = () => h('svg', { 
  width: '24', 
  height: '24', 
  viewBox: '0 0 24 24', 
  fill: 'currentColor' 
}, [
  h('path', { d: 'M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z' })
])

const BellIcon = () => h('svg', { 
  width: '24', 
  height: '24', 
  viewBox: '0 0 24 24', 
  fill: 'currentColor' 
}, [
  h('path', { d: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z' })
])

const UserIcon = () => h('svg', { 
  width: '24', 
  height: '24', 
  viewBox: '0 0 24 24', 
  fill: 'currentColor' 
}, [
  h('path', { d: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' })
])

// 路由和導航
const route = useRoute()
const router = useRouter()
const { isMobile, isTablet } = useMobileDetection()

// 導航項目配置
const navigationItems = ref<NavigationItem[]>([
  {
    name: 'home',
    label: '首頁',
    to: '/',
    icon: HomeIcon,
    badge: null
  },
  {
    name: 'holdings',
    label: '持股',
    to: '/stocks',
    icon: ChartIcon,
    badge: null
  },
  {
    name: 'diaries',
    label: '日記',
    to: '/diaries',
    icon: BookIcon,
    badge: null
  },
  {
    name: 'alerts',
    label: '提醒',
    to: '/alerts',
    icon: BellIcon,
    badge: null
  },
  {
    name: 'profile',
    label: '設定',
    to: '/settings',
    icon: UserIcon,
    badge: null
  }
])

// 安全區域檢測
const hasSafeArea = computed(() => {
  if (typeof window === 'undefined') return false
  const rootStyle = getComputedStyle(document.documentElement)
  const bottom = rootStyle.getPropertyValue('--safe-area-inset-bottom')
  return bottom && parseInt(bottom) > 0
})

// 檢查當前路由是否活躍
const isActive = (to: string) => {
  if (to === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(to)
}

// 處理導航點擊
const handleNavClick = (item: NavigationItem) => {
  // 可以在這裡添加點擊分析或其他邏輯
  console.log(`Navigation clicked: ${item.name}`)
}

// 更新徽章數量
const updateBadge = (itemName: string, count: number | null) => {
  const item = navigationItems.value.find(nav => nav.name === itemName)
  if (item) {
    item.badge = count
  }
}

// 暴露方法給父組件
defineExpose({
  updateBadge
})

// 組件掛載後的初始化
onMounted(() => {
  // 可以在這裡初始化徽章數量
  // 例如：從 API 獲取未讀提醒數量
})
</script>

<style scoped>
.bottom-navigation {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #ffffff;
  border-top: 1px solid #e5e7eb;
  z-index: 50;
  transform: translateZ(0); /* 硬體加速 */
  will-change: transform;
}

.bottom-navigation.has-safe-area {
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.nav-container {
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 64px;
  max-width: 100%;
  margin: 0 auto;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 8px 4px;
  text-decoration: none;
  color: #6b7280;
  transition: color 0.2s ease;
  position: relative;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.nav-item:hover {
  color: #374151;
}

.nav-item--active {
  color: #6366f1;
}

.nav-item__icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-bottom: 4px;
}

.nav-item__badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background-color: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: 600;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  box-sizing: border-box;
}

.nav-item__label {
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  line-height: 1.2;
}

/* 觸控回饋效果 */
.nav-item:active {
  transform: scale(0.95);
  transition: transform 0.1s ease;
}

/* 動畫效果 */
.nav-item {
  animation: nav-item-enter 0.3s ease-out;
}

@keyframes nav-item-enter {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 響應式調整 */
@media screen and (min-width: 768px) {
  .nav-container {
    height: 72px;
    max-width: 768px;
  }
  
  .nav-item__icon {
    width: 28px;
    height: 28px;
  }
  
  .nav-item__label {
    font-size: 13px;
  }
}

/* 深色模式支援 */
@media (prefers-color-scheme: dark) {
  .bottom-navigation {
    background-color: #1f2937;
    border-top-color: #374151;
  }
  
  .nav-item {
    color: #9ca3af;
  }
  
  .nav-item:hover {
    color: #d1d5db;
  }
  
  .nav-item--active {
    color: #818cf8;
  }
}

/* 高對比度模式支援 */
@media (prefers-contrast: high) {
  .bottom-navigation {
    border-top-width: 2px;
  }
  
  .nav-item--active {
    font-weight: 700;
  }
}

/* 減少動畫模式支援 */
@media (prefers-reduced-motion: reduce) {
  .nav-item {
    animation: none;
  }
  
  .nav-item:active {
    transform: none;
  }
}
</style>