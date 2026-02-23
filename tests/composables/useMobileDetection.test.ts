import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'

// Mock matchMedia function
const mockMatchMedia = vi.fn(() => ({
  matches: false,
  media: '(orientation: portrait)',
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
}))

// Mock window and navigator
const mockWindow = {
  innerWidth: 1024,
  innerHeight: 768,
  devicePixelRatio: 1,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  matchMedia: mockMatchMedia,
}

const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  maxTouchPoints: 0,
}

// Setup global mocks
vi.stubGlobal('window', mockWindow)
vi.stubGlobal('navigator', mockNavigator)

describe('useMobileDetection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWindow.innerWidth = 1024
    mockWindow.innerHeight = 768
    mockWindow.devicePixelRatio = 1
    mockNavigator.maxTouchPoints = 0
    mockNavigator.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('isMobile', () => {
    it('should return true for screen width < 768', async () => {
      mockWindow.innerWidth = 375
      mockNavigator.maxTouchPoints = 1

      const { useMobileDetection } = await import('~/composables/useMobileDetection')
      const { isMobile } = useMobileDetection()
      
      // Trigger update
      const resizeCallback = mockWindow.addEventListener.mock.calls.find(
        (call: any[]) => call[0] === 'resize'
      )?.[1]
      
      if (resizeCallback) {
        resizeCallback()
        await nextTick()
      }

      expect(isMobile.value).toBe(true)
    })

    it('should return false for desktop width', async () => {
      mockWindow.innerWidth = 1440
      mockNavigator.maxTouchPoints = 0

      const { useMobileDetection } = await import('~/composables/useMobileDetection')
      const { isMobile } = useMobileDetection()

      expect(isMobile.value).toBe(false)
    })
  })

  describe('isTablet', () => {
    it('should return true for screen width between 768 and 1024', async () => {
      mockWindow.innerWidth = 800
      mockNavigator.maxTouchPoints = 0

      const { useMobileDetection } = await import('~/composables/useMobileDetection')
      const { isTablet } = useMobileDetection()

      expect(isTablet.value).toBe(true)
    })

    it('should return false for mobile width', async () => {
      mockWindow.innerWidth = 375

      const { useMobileDetection } = await import('~/composables/useMobileDetection')
      const { isTablet } = useMobileDetection()

      expect(isTablet.value).toBe(false)
    })

    it('should return false for desktop width', async () => {
      mockWindow.innerWidth = 1440

      const { useMobileDetection } = await import('~/composables/useMobileDetection')
      const { isTablet } = useMobileDetection()

      expect(isTablet.value).toBe(false)
    })
  })

  describe('isDesktop', () => {
    it('should return true for screen width >= 1024 without touch', async () => {
      mockWindow.innerWidth = 1440
      mockNavigator.maxTouchPoints = 0

      const { useMobileDetection } = await import('~/composables/useMobileDetection')
      const { isDesktop } = useMobileDetection()

      expect(isDesktop.value).toBe(true)
    })

    it('should return false for touch devices', async () => {
      mockWindow.innerWidth = 1440
      mockNavigator.maxTouchPoints = 1

      const { useMobileDetection } = await import('~/composables/useMobileDetection')
      const { isDesktop } = useMobileDetection()

      // Desktop with touch should not be considered pure desktop
      expect(isDesktop.value).toBe(false)
    })
  })

  describe('orientation', () => {
    it('should return landscape when width > height', async () => {
      mockWindow.innerWidth = 1024
      mockWindow.innerHeight = 768

      const { useMobileDetection } = await import('~/composables/useMobileDetection')
      const { orientation } = useMobileDetection()

      const resizeCallback = mockWindow.addEventListener.mock.calls.find(
        (call: any[]) => call[0] === 'resize'
      )?.[1]
      
      if (resizeCallback) {
        resizeCallback()
        await nextTick()
      }

      expect(orientation.value).toBe('landscape')
    })

    it('should return portrait when height > width', async () => {
      mockWindow.innerWidth = 375
      mockWindow.innerHeight = 667

      const { useMobileDetection } = await import('~/composables/useMobileDetection')
      const { orientation } = useMobileDetection()

      const resizeCallback = mockWindow.addEventListener.mock.calls.find(
        (call: any[]) => call[0] === 'resize'
      )?.[1]
      
      if (resizeCallback) {
        resizeCallback()
        await nextTick()
      }

      expect(orientation.value).toBe('portrait')
    })
  })

  describe('isTouch', () => {
    it('should detect touch capability via maxTouchPoints', async () => {
      mockNavigator.maxTouchPoints = 5

      const { useMobileDetection } = await import('~/composables/useMobileDetection')
      const { isTouch } = useMobileDetection()

      expect(isTouch.value).toBe(true)
    })

    it('should detect no touch capability', async () => {
      mockNavigator.maxTouchPoints = 0

      const { useMobileDetection } = await import('~/composables/useMobileDetection')
      const { isTouch } = useMobileDetection()

      expect(isTouch.value).toBe(false)
    })
  })

  describe('getDeviceInfo', () => {
    it('should return complete device info', async () => {
      mockWindow.innerWidth = 1440
      mockWindow.innerHeight = 900
      mockWindow.devicePixelRatio = 2
      mockNavigator.maxTouchPoints = 0

      const { useMobileDetection } = await import('~/composables/useMobileDetection')
      const { getDeviceInfo } = useMobileDetection()

      const info = getDeviceInfo()

      expect(info).toHaveProperty('isMobile')
      expect(info).toHaveProperty('isTablet')
      expect(info).toHaveProperty('isDesktop')
      expect(info).toHaveProperty('screenWidth')
      expect(info).toHaveProperty('screenHeight')
      expect(info).toHaveProperty('orientation')
      expect(info).toHaveProperty('isTouch')
      expect(info).toHaveProperty('dpr')
      expect(info).toHaveProperty('userAgent')
    })
  })

  describe('detectDeviceType', () => {
    it('should detect iOS devices', async () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      mockWindow.innerWidth = 375

      const { useMobileDetection } = await import('~/composables/useMobileDetection')
      const { detectDeviceType } = useMobileDetection()

      const deviceType = detectDeviceType()

      expect(deviceType?.isIOS).toBe(true)
      expect(deviceType?.isAndroid).toBe(false)
    })

    it('should detect Android devices', async () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Linux; Android 11; Pixel 4) AppleWebKit/537.36'
      mockWindow.innerWidth = 375

      const { useMobileDetection } = await import('~/composables/useMobileDetection')
      const { detectDeviceType } = useMobileDetection()

      const deviceType = detectDeviceType()

      expect(deviceType?.isAndroid).toBe(true)
      expect(deviceType?.isIOS).toBe(false)
    })

    it('should detect iPad', async () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      mockWindow.innerWidth = 768

      const { useMobileDetection } = await import('~/composables/useMobileDetection')
      const { detectDeviceType } = useMobileDetection()

      const deviceType = detectDeviceType()

      expect(deviceType?.isIPad).toBe(true)
    })
  })

  describe('event listeners', () => {
    it('should register resize event listener', async () => {
      const { useMobileDetection } = await import('~/composables/useMobileDetection')
      useMobileDetection()

      expect(mockWindow.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
    })

    it('should register orientationchange event listener', async () => {
      const { useMobileDetection } = await import('~/composables/useMobileDetection')
      useMobileDetection()

      expect(mockWindow.addEventListener).toHaveBeenCalledWith('orientationchange', expect.any(Function))
    })
  })
})
