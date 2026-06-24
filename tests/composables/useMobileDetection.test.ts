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
  describe('isMobile / isTablet / isDesktop（layouts/mobile.vue 契約）', () => {
    it('手機寬度 → isMobile=true, isDesktop=false', async () => {
      setViewport(375)
      const { isMobile, isTablet, isDesktop } = useMobileDetection()
      await nextTick()
      expect(isMobile.value).toBe(true)
      expect(isTablet.value).toBe(false)
      expect(isDesktop.value).toBe(false)
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

// ponytail: isDesktop 在無觸控桌面應為 true；happy-dom 預設 non-coarse pointer
describe('useMobileDetection - isDesktop', () => {
  it('桌面寬度且無觸控 → isDesktop=true', async () => {
    setViewport(1440)
    const { isDesktop } = useMobileDetection()
    await nextTick()
    expect(isDesktop.value).toBe(true)
  })
})
