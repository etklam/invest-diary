import { ref, onMounted, onUnmounted, watch, readonly, type Ref } from 'vue'

export interface GestureConfig {
  longPressDelay: number
  swipeThreshold: number
  swipeVelocityThreshold: number
  doubleTapDelay: number
  pinchThreshold: number
  disabled: boolean
}

export interface GestureState {
  isPressed: boolean
  isLongPressed: boolean
  isSwiping: boolean
  isPinching: boolean
  startX: number
  startY: number
  currentX: number
  currentY: number
  startTime: number
  lastTapTime: number
  tapCount: number
  distance: number
  velocity: number
  direction: 'up' | 'down' | 'left' | 'right' | 'none'
}

export interface GestureCallbacks {
  onTap?: (event: TouchEvent | MouseEvent) => void
  onDoubleTap?: (event: TouchEvent | MouseEvent) => void
  onLongPress?: (event: TouchEvent | MouseEvent) => void
  onSwipeStart?: (state: GestureState) => void
  onSwipeMove?: (state: GestureState) => void
  onSwipeEnd?: (state: GestureState) => void
  onPinchStart?: (state: GestureState) => void
  onPinchMove?: (state: GestureState) => void
  onPinchEnd?: (state: GestureState) => void
}

export function useGestures(
  element: Ref<HTMLElement | null>,
  callbacks: GestureCallbacks = {},
  config: Partial<GestureConfig> = {}
) {
  // 默認配置
  const defaultConfig: GestureConfig = {
    longPressDelay: 500,
    swipeThreshold: 50,
    swipeVelocityThreshold: 0.3,
    doubleTapDelay: 300,
    pinchThreshold: 20,
    disabled: false
  }
  
  const gestureConfig = ref({ ...defaultConfig, ...config })
  
  // 手勢狀態
  const gestureState = ref<GestureState>({
    isPressed: false,
    isLongPressed: false,
    isSwiping: false,
    isPinching: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    startTime: 0,
    lastTapTime: 0,
    tapCount: 0,
    distance: 0,
    velocity: 0,
    direction: 'none'
  })
  
  // 長按定時器
  let longPressTimer: NodeJS.Timeout | null = null
  
  // 計算距離
  const calculateDistance = (x1: number, y1: number, x2: number, y2: number) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
  }
  
  // 計算速度
  const calculateVelocity = (distance: number, time: number) => {
    return time > 0 ? distance / time : 0
  }
  
  // 計算方向
  const calculateDirection = (dx: number, dy: number): 'up' | 'down' | 'left' | 'right' | 'none' => {
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)
    
    if (absDx < gestureConfig.value.swipeThreshold && absDy < gestureConfig.value.swipeThreshold) {
      return 'none'
    }
    
    return absDx > absDy ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')
  }
  
  // 獲取觸控點或滑鼠位置
  const getPoint = (event: TouchEvent | MouseEvent) => {
    if ('touches' in event && event.touches.length > 0) {
      return event.touches[0]
    } else if ('changedTouches' in event && event.changedTouches.length > 0) {
      return event.changedTouches[0]
    } else {
      return event as MouseEvent
    }
  }
  
  // 處理開始
  const handleStart = (event: TouchEvent | MouseEvent) => {
    if (gestureConfig.value.disabled) return
    
    const point = getPoint(event)
    if (!point) return
    
    const currentTime = Date.now()
    
    gestureState.value = {
      ...gestureState.value,
      isPressed: true,
      isLongPressed: false,
      isSwiping: false,
      startX: point.clientX,
      startY: point.clientY,
      currentX: point.clientX,
      currentY: point.clientY,
      startTime: currentTime,
      distance: 0,
      velocity: 0,
      direction: 'none'
    }
    
    // 檢測雙擊
    const timeSinceLastTap = currentTime - gestureState.value.lastTapTime
    if (timeSinceLastTap < gestureConfig.value.doubleTapDelay) {
      gestureState.value.tapCount++
      if (gestureState.value.tapCount === 2) {
        callbacks.onDoubleTap?.(event)
        gestureState.value.tapCount = 0
        return
      }
    } else {
      gestureState.value.tapCount = 1
    }
    
    gestureState.value.lastTapTime = currentTime
    
    // 設置長按定時器
    if (longPressTimer) {
      clearTimeout(longPressTimer)
    }
    
    longPressTimer = setTimeout(() => {
      if (gestureState.value.isPressed && !gestureState.value.isSwiping) {
        gestureState.value.isLongPressed = true
        callbacks.onLongPress?.(event)
      }
    }, gestureConfig.value.longPressDelay)
  }
  
  // 處理移動
  const handleMove = (event: TouchEvent | MouseEvent) => {
    if (gestureConfig.value.disabled || !gestureState.value.isPressed) return
    
    const point = getPoint(event)
    if (!point) return
    
    gestureState.value.currentX = point.clientX
    gestureState.value.currentY = point.clientY
    
    const dx = point.clientX - gestureState.value.startX
    const dy = point.clientY - gestureState.value.startY
    const distance = calculateDistance(
      gestureState.value.startX,
      gestureState.value.startY,
      point.clientX,
      point.clientY
    )
    
    gestureState.value.distance = distance
    gestureState.value.direction = calculateDirection(dx, dy)
    
    // 如果移動距離超過 swipeThreshold，則認為是滑動
    if (distance > gestureConfig.value.swipeThreshold) {
      if (!gestureState.value.isSwiping) {
        gestureState.value.isSwiping = true
        callbacks.onSwipeStart?.(gestureState.value)
        
        // 取消長按
        if (longPressTimer) {
          clearTimeout(longPressTimer)
          longPressTimer = null
        }
      }
      
      callbacks.onSwipeMove?.(gestureState.value)
    }
  }
  
  // 處理結束
  const handleEnd = (event: TouchEvent | MouseEvent) => {
    if (gestureConfig.value.disabled) return
    
    const currentTime = Date.now()
    const duration = currentTime - gestureState.value.startTime
    
    // 計算速度
    if (duration > 0) {
      gestureState.value.velocity = calculateVelocity(gestureState.value.distance, duration)
    }
    
    // 清除長按定時器
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
    
    // 處理點擊
    if (!gestureState.value.isLongPressed && !gestureState.value.isSwiping) {
      callbacks.onTap?.(event)
    }
    
    // 處理滑動結束
    if (gestureState.value.isSwiping) {
      // 檢查速度與距離，避免誤觸
      if (
        gestureState.value.distance >= gestureConfig.value.swipeThreshold &&
        gestureState.value.velocity >= gestureConfig.value.swipeVelocityThreshold
      ) {
        callbacks.onSwipeEnd?.(gestureState.value)
      }
    }
    
    // 重置狀態
    gestureState.value.isPressed = false
    gestureState.value.isLongPressed = false
    gestureState.value.isSwiping = false
  }
  
  // 處理取消
  const handleCancel = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
    
    gestureState.value.isPressed = false
    gestureState.value.isLongPressed = false
    gestureState.value.isSwiping = false
  }
  
  // 綁定事件監聽器
  const bindEvents = () => {
    if (!element.value) return
    
    const el = element.value
    
    // 觸控事件
    el.addEventListener('touchstart', handleStart, { passive: true })
    el.addEventListener('touchmove', handleMove, { passive: true })
    el.addEventListener('touchend', handleEnd, { passive: true })
    el.addEventListener('touchcancel', handleCancel, { passive: true })
    
    // 滑鼠事件（桌面支援）
    el.addEventListener('mousedown', handleStart)
    el.addEventListener('mousemove', handleMove)
    el.addEventListener('mouseup', handleEnd)
    el.addEventListener('mouseleave', handleCancel)
  }
  
  // 解綁事件監聽器
  const unbindEvents = () => {
    if (!element.value) return
    
    const el = element.value
    
    el.removeEventListener('touchstart', handleStart)
    el.removeEventListener('touchmove', handleMove)
    el.removeEventListener('touchend', handleEnd)
    el.removeEventListener('touchcancel', handleCancel)
    
    el.removeEventListener('mousedown', handleStart)
    el.removeEventListener('mousemove', handleMove)
    el.removeEventListener('mouseup', handleEnd)
    el.removeEventListener('mouseleave', handleCancel)
  }
  
  // 更新配置
  const updateConfig = (newConfig: Partial<GestureConfig>) => {
    gestureConfig.value = { ...gestureConfig.value, ...newConfig }
  }
  
  // 重置狀態
  const reset = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
    
    gestureState.value = {
      isPressed: false,
      isLongPressed: false,
      isSwiping: false,
      isPinching: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      startTime: 0,
      lastTapTime: 0,
      tapCount: 0,
      distance: 0,
      velocity: 0,
      direction: 'none'
    }
  }
  
  // 生命週期
  onMounted(() => {
    bindEvents()
  })
  
  onUnmounted(() => {
    unbindEvents()
    if (longPressTimer) {
      clearTimeout(longPressTimer)
    }
  })
  
  // 監聽元素變化
  watch(element, (newElement, oldElement) => {
    if (oldElement) {
      unbindEvents()
    }
    if (newElement) {
      bindEvents()
    }
  })
  
  return {
    // 狀態
    gestureState: readonly(gestureState),
    gestureConfig: readonly(gestureConfig),
    
    // 方法
    updateConfig,
    reset,
    bindEvents,
    unbindEvents
  }
}

// 便捷的組合式函數
export function useSwipeGestures(
  element: Ref<HTMLElement | null>,
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void
) {
  return useGestures(element, {
    onSwipeEnd: (state) => {
      const { direction, velocity } = state
      
      // 檢查速度閾值
      if (velocity < 0.3) return
      
      switch (direction) {
        case 'left':
          onSwipeLeft?.()
          break
        case 'right':
          onSwipeRight?.()
          break
        case 'up':
          onSwipeUp?.()
          break
        case 'down':
          onSwipeDown?.()
          break
      }
    }
  })
}
