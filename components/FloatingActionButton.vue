<template>
  <div class="fab-container" :class="{ 'fab--expanded': isExpanded }">
    <!-- 主按鈕 -->
    <button
      class="fab fab--main"
      :class="{ 'fab--active': isExpanded }"
      @click="toggleExpanded"
      aria-label="新增操作"
    >
      <div class="fab__icon">
        <transition name="fab-icon" mode="out-in">
          <PlusIcon v-if="!isExpanded" key="plus" />
          <CloseIcon v-else key="close" />
        </transition>
      </div>
    </button>

    <!-- 展開的選項按鈕 -->
    <transition-group name="fab-item" tag="div" class="fab__items">
      <button
        v-for="(item, index) in actionItems"
        :key="item.name"
        class="fab fab--item"
        :style="{ 
          '--item-index': index,
          '--total-items': actionItems.length 
        }"
        @click="handleActionClick(item)"
        :aria-label="item.label"
      >
        <div class="fab__icon">
          <component :is="item.icon" />
        </div>
        <span class="fab__label">{{ item.label }}</span>
      </button>
    </transition-group>

    <!-- 背景遮罩 -->
    <div
      v-if="isExpanded"
      class="fab__overlay"
      @click="closeExpanded"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, h } from 'vue'
import { useRouter } from 'vue-router'

// 操作項目接口
interface ActionItem {
  name: string
  label: string
  icon: any
  action: () => void
  color?: string
}

// 圖標組件
const PlusIcon = () => h('svg', {
  width: '24',
  height: '24',
  viewBox: '0 0 24 24',
  fill: 'currentColor'
}, [
  h('path', { d: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z' })
])

const CloseIcon = () => h('svg', {
  width: '24',
  height: '24',
  viewBox: '0 0 24 24',
  fill: 'currentColor'
}, [
  h('path', { d: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z' })
])

const DiaryIcon = () => h('svg', {
  width: '24',
  height: '24',
  viewBox: '0 0 24 24',
  fill: 'currentColor'
}, [
  h('path', { d: 'M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z' })
])

const StockIcon = () => h('svg', {
  width: '24',
  height: '24',
  viewBox: '0 0 24 24',
  fill: 'currentColor'
}, [
  h('path', { d: 'M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z' })
])

const AlertIcon = () => h('svg', {
  width: '24',
  height: '24',
  viewBox: '0 0 24 24',
  fill: 'currentColor'
}, [
  h('path', { d: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z' })
])

// 路由和響應式偵測
const router = useRouter()

// 展開狀態
const isExpanded = ref(false)

// 操作項目配置
const actionItems = ref<ActionItem[]>([
  {
    name: 'quick-diary',
    label: '快速日記',
    icon: DiaryIcon,
    color: '#6366f1',
    action: () => {
      router.push('/diaries/quick')
      closeExpanded()
    }
  },
  {
    name: 'diary',
    label: '完整日記',
    icon: DiaryIcon,
    color: '#6366f1',
    action: () => {
      router.push('/diaries/new')
      closeExpanded()
    }
  },
  {
    name: 'transaction',
    label: '記錄交易',
    icon: StockIcon,
    color: '#10b981',
    action: () => {
      router.push('/transactions/new')
      closeExpanded()
    }
  },
  {
    name: 'alert',
    label: '設定提醒',
    icon: AlertIcon,
    color: '#f59e0b',
    action: () => {
      router.push('/alerts/new')
      closeExpanded()
    }
  }
])

// 切換展開狀態
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}

// 關閉展開狀態
const closeExpanded = () => {
  isExpanded.value = false
}

// 處理操作點擊
const handleActionClick = (item: ActionItem) => {
  item.action()
}

// 監聽 ESC 鍵關閉
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isExpanded.value) {
    closeExpanded()
  }
}

// 生命週期
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.fab-container {
  position: fixed;
  bottom: calc(80px + env(safe-area-inset-bottom));
  right: calc(16px + env(safe-area-inset-right));
  z-index: 100;
  pointer-events: none;
}

.fab-container.fab--expanded {
  pointer-events: auto;
}

.fab {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  pointer-events: auto;
  -webkit-tap-highlight-color: transparent;
  outline: none;
}

.fab:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}

.fab--main {
  width: var(--fab-size, 56px);
  height: var(--fab-size, 56px);
  background-color: #6366f1;
  color: white;
  z-index: 10;
}

.fab--main:hover {
  background-color: #4f46e5;
  transform: scale(1.05);
}

.fab--main:active {
  transform: scale(0.95);
}

.fab--main.fab--active {
  background-color: #ef4444;
  transform: rotate(45deg);
}

.fab--item {
  position: absolute;
  width: 48px;
  height: 48px;
  background-color: white;
  color: #374151;
  bottom: 0;
  right: 0;
  opacity: 0;
  transform: scale(0) translateY(20px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fab-container.fab--expanded .fab--item {
  opacity: 1;
  transform: scale(1) translateY(calc((var(--item-index) + 1) * -64px));
  transition-delay: calc(var(--item-index) * 0.05s);
}

.fab--item:hover {
  transform: scale(1.1) translateY(calc((var(--item-index) + 1) * -64px));
}

.fab__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--fab-icon-size, 24px);
  height: var(--fab-icon-size, 24px);
}

.fab--item .fab__icon {
  width: 20px;
  height: 20px;
}

.fab__label {
  position: absolute;
  right: 56px;
  background-color: #1f2937;
  color: white;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  opacity: 0;
  transform: translateX(10px);
  transition: all 0.2s ease;
  pointer-events: none;
}

.fab__label::after {
  content: '';
  position: absolute;
  top: 50%;
  right: -4px;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 4px solid #1f2937;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
}

.fab-container.fab--expanded .fab__label {
  opacity: 1;
  transform: translateX(0);
  transition-delay: calc(var(--item-index) * 0.05s + 0.1s);
}

.fab__overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: -1;
  opacity: 0;
  animation: fab-overlay-in 0.3s ease forwards;
}

/* 動畫 */
.fab-icon-enter-active,
.fab-icon-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fab-icon-enter-from {
  transform: rotate(-45deg);
}

.fab-icon-leave-to {
  transform: rotate(45deg);
}

.fab-item-enter-active,
.fab-item-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fab-item-enter-from,
.fab-item-leave-to {
  opacity: 0;
  transform: scale(0) translateY(20px);
}

.fab-item-move {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes fab-overlay-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 響應式調整 */
@media screen and (min-width: 768px) {
  .fab-container {
    bottom: 96px;
    right: 24px;
  }
  
  .fab--item {
    width: 56px;
    height: 56px;
  }
  
  .fab__label {
    font-size: 16px;
    padding: 8px 16px;
  }
}

/* 深色模式支援 */
@media (prefers-color-scheme: dark) {
  .fab--item {
    background-color: #374151;
    color: #f9fafb;
  }
  
  .fab__label {
    background-color: #f9fafb;
    color: #1f2937;
  }
  
  .fab__label::after {
    border-left-color: #f9fafb;
  }
}

/* 減少動畫模式支援 */
@media (prefers-reduced-motion: reduce) {
  .fab,
  .fab--item,
  .fab__label,
  .fab__overlay {
    transition: none;
    animation: none;
  }
  
  .fab--main.fab--active {
    transform: none;
  }
}

/* 高對比度模式支援 */
@media (prefers-contrast: high) {
  .fab {
    border: 2px solid currentColor;
  }
  
  .fab--main {
    border-color: #6366f1;
  }
  
  .fab--item {
    border-color: #374151;
  }
}
</style>
