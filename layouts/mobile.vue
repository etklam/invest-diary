<template>
  <div class="mobile-layout" :class="{ 'has-keyboard': keyboardVisible }">
    <!-- 主要內容區域 -->
    <main class="main-content" :style="{ paddingBottom: safeAreaBottom + navigationHeight + 'px' }">
      <slot />
    </main>

    <!-- 底部導航 -->
    <BottomNavigation v-if="showBottomNavigation" />

    <!-- 浮動操作按鈕 -->
    <FloatingActionButton v-if="showFab" />

    <!-- 鍵盤佔位符 -->
    <div v-if="keyboardVisible" class="keyboard-spacer" :style="{ height: keyboardHeight + 'px' }"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMobileDetection } from '~/composables/useMobileDetection'
import BottomNavigation from '~/components/BottomNavigation.vue'
import FloatingActionButton from '~/components/FloatingActionButton.vue'

// 響應式偵測
const { isMobile, isTablet } = useMobileDetection()

// 鍵盤狀態
const keyboardVisible = ref(false)
const keyboardHeight = ref(0)

// 安全區域
const safeAreaTop = ref(0)
const safeAreaBottom = ref(0)
const safeAreaLeft = ref(0)
const safeAreaRight = ref(0)

// 導航高度
const navigationHeight = ref(64)

// 計算屬性
const showBottomNavigation = computed(() => isMobile.value || isTablet.value)
const showFab = computed(() => isMobile.value || isTablet.value)

// 初始化安全區域
const initSafeArea = () => {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const rootStyle = getComputedStyle(document.documentElement)
    safeAreaTop.value = parseInt(rootStyle.getPropertyValue('--safe-area-inset-top') || '0')
    safeAreaBottom.value = parseInt(rootStyle.getPropertyValue('--safe-area-inset-bottom') || '0')
    safeAreaLeft.value = parseInt(rootStyle.getPropertyValue('--safe-area-inset-left') || '0')
    safeAreaRight.value = parseInt(rootStyle.getPropertyValue('--safe-area-inset-right') || '0')
  }
}

// 處理視窗大小變化
const handleResize = () => {
  initSafeArea()
}

// 處理鍵盤顯示/隱藏
const handleKeyboardChange = (visible: boolean, height: number) => {
  keyboardVisible.value = visible
  keyboardHeight.value = height
}

// 監聽鍵盤事件
const setupKeyboardListeners = () => {
  if (typeof window === 'undefined') return

  // 視覺變化 API (iOS 鍵盤偵測)
  if ('visualViewport' in window) {
    const visualViewport = window.visualViewport
    if (!visualViewport) return
    const handleViewportChange = () => {
      const keyboardHeight = window.innerHeight - visualViewport.height
      handleKeyboardChange(keyboardHeight > 150, keyboardHeight)
    }
    
    visualViewport.addEventListener('resize', handleViewportChange)
    
    onUnmounted(() => {
      visualViewport.removeEventListener('resize', handleViewportChange)
    })
  } else {
    // 後備方案：監聽 focus/blur 事件
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        handleKeyboardChange(true, 300) // 估計高度
      }
    }
    
    const handleFocusOut = () => {
      handleKeyboardChange(false, 0)
    }
    
    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)
    
    onUnmounted(() => {
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
    })
  }
}

// 生命週期
onMounted(() => {
  initSafeArea()
  setupKeyboardListeners()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.mobile-layout {
  min-height: 100vh;
  position: relative;
  background-color: var(--color-background, #020617);
  overflow-x: hidden;
}

.main-content {
  width: 100%;
  min-height: 100vh;
  position: relative;
  transition: padding-bottom 0.3s ease-out;
}

.keyboard-spacer {
  width: 100%;
  background-color: transparent;
  flex-shrink: 0;
}

.has-keyboard .main-content {
  /* 鍵盤顯示時的額外調整 */
  transition: padding-bottom 0.15s ease-out;
}

/* 安全區域支援 */
@supports (padding: max(0px)) {
  .mobile-layout {
    padding-left: max(env(safe-area-inset-left), var(--safe-area-inset-left, 0px));
    padding-right: max(env(safe-area-inset-right), var(--safe-area-inset-right, 0px));
  }
}

/* 橫向模式調整 */
@media screen and (orientation: landscape) {
  .main-content {
    /* 橫向時減少底部間距 */
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 56px) !important;
  }
}

/* 平板模式調整 */
@media screen and (min-width: 768px) {
  .main-content {
    /* 平板上可以考慮側邊導航 */
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 72px);
  }
}
</style>
