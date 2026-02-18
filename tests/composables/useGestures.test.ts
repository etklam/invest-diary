import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick, type Ref } from 'vue'

// Mock timers
vi.useFakeTimers()

// Type for mock element with vi.fn()
interface MockHTMLElement {
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
  dispatchEvent: ReturnType<typeof vi.fn>
}

describe('useGestures', () => {
  let mockElement: MockHTMLElement
  let elementRef: Ref<HTMLElement | null>

  beforeEach(() => {
    // Create mock element with event listener tracking
    mockElement = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }

    elementRef = ref(mockElement as unknown as HTMLElement)
    vi.clearAllMocks()
    vi.clearAllTimers()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
  })

  describe('initialization', () => {
    it('should register touch and mouse event listeners', async () => {
      const { useGestures } = await import('~/composables/useGestures')
      const callbacks = {
        onTap: vi.fn(),
      }

      useGestures(elementRef, callbacks)

      expect(mockElement.addEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: false })
      expect(mockElement.addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function))
    })

    it('should not register event listeners when disabled', async () => {
      const { useGestures } = await import('~/composables/useGestures')
      const callbacks = {
        onTap: vi.fn(),
      }

      useGestures(elementRef, callbacks, { disabled: true })

      expect(mockElement.addEventListener).not.toHaveBeenCalled()
    })
  })

  describe('gesture state', () => {
    it('should initialize with default state', async () => {
      const { useGestures } = await import('~/composables/useGestures')
      const callbacks = {}

      const { gestureState } = useGestures(elementRef, callbacks)

      expect(gestureState.value).toEqual({
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
        direction: 'none',
      })
    })

    it('should update state during touch start', async () => {
      const { useGestures } = await import('~/composables/useGestures')
      const callbacks = {}

      const { gestureState } = useGestures(elementRef, callbacks)

      const touchstartCall = mockElement.addEventListener.mock.calls.find(
        (call: unknown[]) => Array.isArray(call) && call[0] === 'touchstart'
      )
      const touchstartHandler = touchstartCall?.[1] as Function | undefined

      const touchEvent = {
        type: 'touchstart',
        touches: [{ clientX: 150, clientY: 200 }],
        preventDefault: vi.fn(),
      }

      if (touchstartHandler) {
        touchstartHandler(touchEvent)
      }

      expect(gestureState.value.isPressed).toBe(true)
      expect(gestureState.value.startX).toBe(150)
      expect(gestureState.value.startY).toBe(200)
    })
  })

  describe('tap handling', () => {
    it('should call onTap callback on tap', async () => {
      const { useGestures } = await import('~/composables/useGestures')
      const onTap = vi.fn()
      const callbacks = { onTap }

      useGestures(elementRef, callbacks)

      // Get the touchstart handler
      const touchstartCall = mockElement.addEventListener.mock.calls.find(
        (call: unknown[]) => Array.isArray(call) && call[0] === 'touchstart'
      )
      const touchstartHandler = touchstartCall?.[1] as Function | undefined

      // Simulate touch start
      const touchEvent = {
        type: 'touchstart',
        touches: [{ clientX: 100, clientY: 100 }],
        preventDefault: vi.fn(),
      }

      if (touchstartHandler) {
        touchstartHandler(touchEvent)
      }

      // Get the touchend handler
      const touchendCall = mockElement.addEventListener.mock.calls.find(
        (call: unknown[]) => Array.isArray(call) && call[0] === 'touchend'
      )
      const touchendHandler = touchendCall?.[1] as Function | undefined

      // Simulate touch end quickly (tap)
      const touchEndEvent = {
        type: 'touchend',
        changedTouches: [{ clientX: 100, clientY: 100 }],
        preventDefault: vi.fn(),
      }

      if (touchendHandler) {
        touchendHandler(touchEndEvent)
      }

      // Wait for any async operations
      await nextTick()

      // onTap should be called after a quick tap
      expect(onTap).toHaveBeenCalled()
    })
  })

  describe('long press handling', () => {
    it('should call onLongPress after long press delay', async () => {
      const { useGestures } = await import('~/composables/useGestures')
      const onLongPress = vi.fn()
      const callbacks = { onLongPress }

      useGestures(elementRef, callbacks, { longPressDelay: 500 })

      // Get the touchstart handler
      const touchstartCall = mockElement.addEventListener.mock.calls.find(
        (call: unknown[]) => Array.isArray(call) && call[0] === 'touchstart'
      )
      const touchstartHandler = touchstartCall?.[1] as Function | undefined

      // Simulate touch start
      const touchEvent = {
        type: 'touchstart',
        touches: [{ clientX: 100, clientY: 100 }],
        preventDefault: vi.fn(),
      }

      if (touchstartHandler) {
        touchstartHandler(touchEvent)
      }

      // Before delay - should not be called
      expect(onLongPress).not.toHaveBeenCalled()

      // Advance time past long press delay
      vi.advanceTimersByTime(600)

      // Now it should be called
      expect(onLongPress).toHaveBeenCalled()
    })

    it('should not call onLongPress if touch ends before delay', async () => {
      const { useGestures } = await import('~/composables/useGestures')
      const onLongPress = vi.fn()
      const callbacks = { onLongPress }

      useGestures(elementRef, callbacks, { longPressDelay: 500 })

      // Get handlers
      const touchstartCall = mockElement.addEventListener.mock.calls.find(
        (call: unknown[]) => Array.isArray(call) && call[0] === 'touchstart'
      )
      const touchendCall = mockElement.addEventListener.mock.calls.find(
        (call: unknown[]) => Array.isArray(call) && call[0] === 'touchend'
      )
      const touchstartHandler = touchstartCall?.[1] as Function | undefined
      const touchendHandler = touchendCall?.[1] as Function | undefined

      // Simulate touch start
      const touchEvent = {
        type: 'touchstart',
        touches: [{ clientX: 100, clientY: 100 }],
        preventDefault: vi.fn(),
      }

      if (touchstartHandler) {
        touchstartHandler(touchEvent)
      }

      // End touch before delay
      vi.advanceTimersByTime(200)

      const touchEndEvent = {
        type: 'touchend',
        changedTouches: [{ clientX: 100, clientY: 100 }],
        preventDefault: vi.fn(),
      }

      if (touchendHandler) {
        touchendHandler(touchEndEvent)
      }

      // Advance past original delay
      vi.advanceTimersByTime(400)

      // Should not have been called
      expect(onLongPress).not.toHaveBeenCalled()
    })
  })

  describe('swipe handling', () => {
    it('should detect swipe right and call onSwipeEnd', async () => {
      const { useGestures } = await import('~/composables/useGestures')
      const onSwipeEnd = vi.fn()
      const callbacks = { onSwipeEnd }

      useGestures(elementRef, callbacks, { swipeThreshold: 50 })

      // Get handlers
      const touchstartCall = mockElement.addEventListener.mock.calls.find(
        (call: unknown[]) => Array.isArray(call) && call[0] === 'touchstart'
      )
      const touchmoveCall = mockElement.addEventListener.mock.calls.find(
        (call: unknown[]) => Array.isArray(call) && call[0] === 'touchmove'
      )
      const touchendCall = mockElement.addEventListener.mock.calls.find(
        (call: unknown[]) => Array.isArray(call) && call[0] === 'touchend'
      )

      const touchstartHandler = touchstartCall?.[1] as Function | undefined
      const touchmoveHandler = touchmoveCall?.[1] as Function | undefined
      const touchendHandler = touchendCall?.[1] as Function | undefined

      // Simulate swipe right
      const touchStartEvent = {
        type: 'touchstart',
        touches: [{ clientX: 100, clientY: 100 }],
        preventDefault: vi.fn(),
      }

      if (touchstartHandler) {
        touchstartHandler(touchStartEvent)
      }

      // Move finger
      const touchMoveEvent = {
        type: 'touchmove',
        touches: [{ clientX: 200, clientY: 100 }],
        preventDefault: vi.fn(),
      }

      if (touchmoveHandler) {
        touchmoveHandler(touchMoveEvent)
      }

      // End swipe
      const touchEndEvent = {
        type: 'touchend',
        changedTouches: [{ clientX: 200, clientY: 100 }],
        preventDefault: vi.fn(),
      }

      if (touchendHandler) {
        touchendHandler(touchEndEvent)
      }

      await nextTick()

      // onSwipeEnd should be called with swipe state
      expect(onSwipeEnd).toHaveBeenCalled()
      const calls = onSwipeEnd.mock.calls
      if (calls.length > 0 && calls[0]) {
        const swipeState = calls[0][0]
        expect(swipeState.direction).toBe('right')
        expect(swipeState.distance).toBeGreaterThan(50)
      }
    })

    it('should detect swipe left direction', async () => {
      const { useGestures } = await import('~/composables/useGestures')
      const onSwipeEnd = vi.fn()
      const callbacks = { onSwipeEnd }

      useGestures(elementRef, callbacks, { swipeThreshold: 50 })

      const touchstartCall = mockElement.addEventListener.mock.calls.find(
        (call: unknown[]) => Array.isArray(call) && call[0] === 'touchstart'
      )
      const touchendCall = mockElement.addEventListener.mock.calls.find(
        (call: unknown[]) => Array.isArray(call) && call[0] === 'touchend'
      )

      const touchstartHandler = touchstartCall?.[1] as Function | undefined
      const touchendHandler = touchendCall?.[1] as Function | undefined

      // Simulate swipe left
      const touchStartEvent = {
        type: 'touchstart',
        touches: [{ clientX: 200, clientY: 100 }],
        preventDefault: vi.fn(),
      }

      if (touchstartHandler) {
        touchstartHandler(touchStartEvent)
      }

      const touchEndEvent = {
        type: 'touchend',
        changedTouches: [{ clientX: 100, clientY: 100 }],
        preventDefault: vi.fn(),
      }

      if (touchendHandler) {
        touchendHandler(touchEndEvent)
      }

      await nextTick()

      expect(onSwipeEnd).toHaveBeenCalled()
      const calls = onSwipeEnd.mock.calls
      if (calls.length > 0 && calls[0]) {
        const swipeState = calls[0][0]
        expect(swipeState.direction).toBe('left')
      }
    })

    it('should detect swipe up direction', async () => {
      const { useGestures } = await import('~/composables/useGestures')
      const onSwipeEnd = vi.fn()
      const callbacks = { onSwipeEnd }

      useGestures(elementRef, callbacks, { swipeThreshold: 50 })

      const touchstartCall = mockElement.addEventListener.mock.calls.find(
        (call: unknown[]) => Array.isArray(call) && call[0] === 'touchstart'
      )
      const touchendCall = mockElement.addEventListener.mock.calls.find(
        (call: unknown[]) => Array.isArray(call) && call[0] === 'touchend'
      )

      const touchstartHandler = touchstartCall?.[1] as Function | undefined
      const touchendHandler = touchendCall?.[1] as Function | undefined

      // Simulate swipe up
      const touchStartEvent = {
        type: 'touchstart',
        touches: [{ clientX: 100, clientY: 200 }],
        preventDefault: vi.fn(),
      }

      if (touchstartHandler) {
        touchstartHandler(touchStartEvent)
      }

      const touchEndEvent = {
        type: 'touchend',
        changedTouches: [{ clientX: 100, clientY: 100 }],
        preventDefault: vi.fn(),
      }

      if (touchendHandler) {
        touchendHandler(touchEndEvent)
      }

      await nextTick()

      expect(onSwipeEnd).toHaveBeenCalled()
      const calls = onSwipeEnd.mock.calls
      if (calls.length > 0 && calls[0]) {
        const swipeState = calls[0][0]
        expect(swipeState.direction).toBe('up')
      }
    })

    it('should detect swipe down direction', async () => {
      const { useGestures } = await import('~/composables/useGestures')
      const onSwipeEnd = vi.fn()
      const callbacks = { onSwipeEnd }

      useGestures(elementRef, callbacks, { swipeThreshold: 50 })

      const touchstartCall = mockElement.addEventListener.mock.calls.find(
        (call: unknown[]) => Array.isArray(call) && call[0] === 'touchstart'
      )
      const touchendCall = mockElement.addEventListener.mock.calls.find(
        (call: unknown[]) => Array.isArray(call) && call[0] === 'touchend'
      )

      const touchstartHandler = touchstartCall?.[1] as Function | undefined
      const touchendHandler = touchendCall?.[1] as Function | undefined

      // Simulate swipe down
      const touchStartEvent = {
        type: 'touchstart',
        touches: [{ clientX: 100, clientY: 100 }],
        preventDefault: vi.fn(),
      }

      if (touchstartHandler) {
        touchstartHandler(touchStartEvent)
      }

      const touchEndEvent = {
        type: 'touchend',
        changedTouches: [{ clientX: 100, clientY: 200 }],
        preventDefault: vi.fn(),
      }

      if (touchendHandler) {
        touchendHandler(touchEndEvent)
      }

      await nextTick()

      expect(onSwipeEnd).toHaveBeenCalled()
      const calls = onSwipeEnd.mock.calls
      if (calls.length > 0 && calls[0]) {
        const swipeState = calls[0][0]
        expect(swipeState.direction).toBe('down')
      }
    })
  })

  describe('double tap handling', () => {
    it('should detect double tap', async () => {
      const { useGestures } = await import('~/composables/useGestures')
      const onDoubleTap = vi.fn()
      const onTap = vi.fn()
      const callbacks = { onDoubleTap, onTap }

      useGestures(elementRef, callbacks, { doubleTapDelay: 300 })

      const touchstartCall = mockElement.addEventListener.mock.calls.find(
        (call: unknown[]) => Array.isArray(call) && call[0] === 'touchstart'
      )
      const touchendCall = mockElement.addEventListener.mock.calls.find(
        (call: unknown[]) => Array.isArray(call) && call[0] === 'touchend'
      )

      const touchstartHandler = touchstartCall?.[1] as Function | undefined
      const touchendHandler = touchendCall?.[1] as Function | undefined

      // First tap
      const touchEvent1 = {
        type: 'touchstart',
        touches: [{ clientX: 100, clientY: 100 }],
        preventDefault: vi.fn(),
      }

      if (touchstartHandler) {
        touchstartHandler(touchEvent1)
      }

      const touchEndEvent1 = {
        type: 'touchend',
        changedTouches: [{ clientX: 100, clientY: 100 }],
        preventDefault: vi.fn(),
      }

      if (touchendHandler) {
        touchendHandler(touchEndEvent1)
      }

      // Second tap within delay
      vi.advanceTimersByTime(100)

      const touchEvent2 = {
        type: 'touchstart',
        touches: [{ clientX: 100, clientY: 100 }],
        preventDefault: vi.fn(),
      }

      if (touchstartHandler) {
        touchstartHandler(touchEvent2)
      }

      const touchEndEvent2 = {
        type: 'touchend',
        changedTouches: [{ clientX: 100, clientY: 100 }],
        preventDefault: vi.fn(),
      }

      if (touchendHandler) {
        touchendHandler(touchEndEvent2)
      }

      await nextTick()

      // Double tap should be called
      expect(onDoubleTap).toHaveBeenCalled()
    })
  })

  describe('onSwipeMove callback', () => {
    it('should call onSwipeMove during swipe', async () => {
      const { useGestures } = await import('~/composables/useGestures')
      const onSwipeMove = vi.fn()
      const callbacks = { onSwipeMove }

      useGestures(elementRef, callbacks, { swipeThreshold: 50 })

      const touchstartCall = mockElement.addEventListener.mock.calls.find(
        (call: unknown[]) => Array.isArray(call) && call[0] === 'touchstart'
      )
      const touchmoveCall = mockElement.addEventListener.mock.calls.find(
        (call: unknown[]) => Array.isArray(call) && call[0] === 'touchmove'
      )

      const touchstartHandler = touchstartCall?.[1] as Function | undefined
      const touchmoveHandler = touchmoveCall?.[1] as Function | undefined

      // Start touch
      const touchStartEvent = {
        type: 'touchstart',
        touches: [{ clientX: 100, clientY: 100 }],
        preventDefault: vi.fn(),
      }

      if (touchstartHandler) {
        touchstartHandler(touchStartEvent)
      }

      // Move finger
      const touchMoveEvent = {
        type: 'touchmove',
        touches: [{ clientX: 150, clientY: 100 }],
        preventDefault: vi.fn(),
      }

      if (touchmoveHandler) {
        touchmoveHandler(touchMoveEvent)
      }

      expect(onSwipeMove).toHaveBeenCalled()
    })
  })
})
