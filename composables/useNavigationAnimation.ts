import { ref, computed, watch, nextTick } from 'vue'
import { useNavigationStore } from '~/stores/navigation'

export interface NavigationAnimationConfig {
  duration: number
  easing: string
  direction: 'horizontal' | 'vertical' | 'fade'
  disabled: boolean
}

export function useNavigationAnimation(config: Partial<NavigationAnimationConfig> = {}) {
  const navigationStore = useNavigationStore()
  
  // 默認配置
  const defaultConfig: NavigationAnimationConfig = {
    duration: 300,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    direction: 'horizontal',
    disabled: false
  }
  
  // 合併配置
  const animationConfig = ref({ ...defaultConfig, ...config })
  
  // 動畫狀態
  const isAnimating = ref(false)
  const animationDirection = ref<'forward' | 'backward' | 'none'>('none')
  const animationClass = ref('')
  
  // 監聽導航狀態變化
  watch(
    () => navigationStore.navigationDirection.value,
    (newDirection) => {
      if (animationConfig.value.disabled) return
      
      animationDirection.value = newDirection
      triggerAnimation()
    }
  )
  
  // 監聽導航狀態
  watch(
    () => navigationStore.isNavigating.value,
    (isNavigating) => {
      if (animationConfig.value.disabled) return
      
      if (isNavigating) {
        isAnimating.value = true
      } else {
        // 延遲重置動畫狀態
        setTimeout(() => {
          isAnimating.value = false
          animationClass.value = ''
        }, animationConfig.value.duration)
      }
    }
  )
  
  // 觸發動畫
  const triggerAnimation = () => {
    if (animationConfig.value.disabled) return
    
    const { direction } = animationConfig.value
    const navDirection = navigationStore.navigationDirection.value
    
    // 生成動畫類名
    let className = ''
    
    switch (direction) {
      case 'horizontal':
        if (navDirection === 'forward') {
          className = 'nav-animation-slide-in-right'
        } else if (navDirection === 'backward') {
          className = 'nav-animation-slide-in-left'
        }
        break
        
      case 'vertical':
        if (navDirection === 'forward') {
          className = 'nav-animation-slide-in-up'
        } else if (navDirection === 'backward') {
          className = 'nav-animation-slide-in-down'
        }
        break
        
      case 'fade':
        className = 'nav-animation-fade'
        break
    }
    
    animationClass.value = className
  }
  
  // 計算動畫樣式
  const animationStyles = computed(() => {
    if (animationConfig.value.disabled) return {}
    
    return {
      '--nav-animation-duration': `${animationConfig.value.duration}ms`,
      '--nav-animation-easing': animationConfig.value.easing
    }
  })
  
  // 計算動畫類名
  const animationClasses = computed(() => {
    const classes = ['nav-animation-container']
    
    if (isAnimating.value) {
      classes.push('nav-animation--active')
    }
    
    if (animationClass.value) {
      classes.push(animationClass.value)
    }
    
    return classes.join(' ')
  })
  
  // 頁面轉場動畫
  const pageTransition = computed(() => {
    if (animationConfig.value.disabled) return {}
    
    const { duration, easing, direction } = animationConfig.value
    
    return {
      name: `page-transition-${direction}`,
      mode: 'out-in' as const,
      css: true,
      duration,
      easing,
      onBeforeEnter: (el: Element) => {
        isAnimating.value = true
      },
      onAfterEnter: (el: Element) => {
        isAnimating.value = false
      }
    }
  })
  
  // 手動觸發動畫
  const animate = (direction: 'forward' | 'backward' | 'none' = 'forward') => {
    animationDirection.value = direction
    triggerAnimation()
  }
  
  // 更新配置
  const updateConfig = (newConfig: Partial<NavigationAnimationConfig>) => {
    animationConfig.value = { ...animationConfig.value, ...newConfig }
  }
  
  // 重置動畫
  const reset = () => {
    isAnimating.value = false
    animationDirection.value = 'none'
    animationClass.value = ''
  }
  
  return {
    // 狀態
    isAnimating,
    animationDirection,
    animationClass,
    animationConfig,
    
    // 計算屬性
    animationStyles,
    animationClasses,
    pageTransition,
    
    // 方法
    triggerAnimation,
    animate,
    updateConfig,
    reset
  }
}

// 預定義的動畫配置
export const navigationAnimationPresets = {
  // 快速滑動
  fastSlide: {
    duration: 200,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    direction: 'horizontal' as const
  },
  
  // 平滑滑動
  smoothSlide: {
    duration: 300,
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    direction: 'horizontal' as const
  },
  
  // 淡入淡出
  fade: {
    duration: 250,
    easing: 'ease-in-out',
    direction: 'fade' as const
  },
  
  // 垂直滑動
  vertical: {
    duration: 300,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    direction: 'vertical' as const
  },
  
  // 禁用動畫
  none: {
    duration: 0,
    easing: 'linear',
    direction: 'horizontal' as const,
    disabled: true
  }
}