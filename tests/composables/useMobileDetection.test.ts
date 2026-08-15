import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import { useMobileDetection } from '~/composables/useMobileDetection'

// ponytail: happy-dom 已提供 window.matchMedia，直接賦值 innerWidth 觸發 vueuse resize listener
function setViewport(width: number, height = 800) {
  window.innerWidth = width
  window.innerHeight = height
  window.dispatchEvent(new Event('resize'))
}

describe('useMobileDetection', () => {
  describe('isMobile / isTablet（layouts/mobile.vue 契約）', () => {
    it('手機寬度 → isMobile=true, isTablet=false', async () => {
      setViewport(375)
      const { isMobile, isTablet } = useMobileDetection()
      await nextTick()
      expect(isMobile.value).toBe(true)
      expect(isTablet.value).toBe(false)
    })

    it('平板寬度 → isTablet=true', async () => {
      setViewport(800)
      const { isMobile, isTablet } = useMobileDetection()
      await nextTick()
      expect(isMobile.value).toBe(false)
      expect(isTablet.value).toBe(true)
    })

    it('桌面寬度 → isTablet=false, isMobile=false', async () => {
      setViewport(1440)
      const { isMobile, isTablet } = useMobileDetection()
      await nextTick()
      expect(isMobile.value).toBe(false)
      expect(isTablet.value).toBe(false)
    })
  })
})
