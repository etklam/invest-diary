import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockToast } from '../vi-setup'

// Mock $fetch
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

describe('useDiscipline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('showDisciplineToast', () => {
    it('should fetch random discipline and show toast', async () => {
      const mockResponse = {
        content: 'Test discipline quote',
        isCustom: false,
      }

      mockFetch.mockResolvedValueOnce(mockResponse)

      const { showDisciplineToast } = await import('~/composables/useDiscipline')
      await showDisciplineToast()

      expect(mockFetch).toHaveBeenCalledWith('/api/discipline/random')
      expect(mockToast.info).toHaveBeenCalledWith('💡 Test discipline quote', 8000)
    })

    it('should show custom discipline with different icon', async () => {
      const mockResponse = {
        content: 'Custom discipline quote',
        isCustom: true,
      }

      mockFetch.mockResolvedValueOnce(mockResponse)

      const { showDisciplineToast } = await import('~/composables/useDiscipline')
      await showDisciplineToast()

      expect(mockToast.info).toHaveBeenCalledWith('💭 Custom discipline quote', 8000)
    })

    it('should not show toast if no content returned', async () => {
      mockFetch.mockResolvedValueOnce(null)

      const { showDisciplineToast } = await import('~/composables/useDiscipline')
      await showDisciplineToast()

      expect(mockToast.info).not.toHaveBeenCalled()
    })

    it('should not show toast if content is empty', async () => {
      mockFetch.mockResolvedValueOnce({ content: '', isCustom: false })

      const { showDisciplineToast } = await import('~/composables/useDiscipline')
      await showDisciplineToast()

      expect(mockToast.info).not.toHaveBeenCalled()
    })

    it('should handle fetch error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { showDisciplineToast } = await import('~/composables/useDiscipline')
      
      // Should not throw
      await expect(showDisciplineToast()).resolves.not.toThrow()

      // Should log error
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should show toast with 8 second duration for reading', async () => {
      const mockResponse = {
        content: 'Long discipline quote that needs time to read',
        isCustom: false,
      }

      mockFetch.mockResolvedValueOnce(mockResponse)

      const { showDisciplineToast } = await import('~/composables/useDiscipline')
      await showDisciplineToast()

      // Verify the duration is 8000ms (8 seconds)
      expect(mockToast.info).toHaveBeenCalledWith(
        expect.any(String),
        8000
      )
    })
  })

  describe('response handling', () => {
    it('should handle missing isCustom field', async () => {
      const mockResponse = {
        content: 'Test quote',
        // isCustom is missing
      }

      mockFetch.mockResolvedValueOnce(mockResponse)

      const { showDisciplineToast } = await import('~/composables/useDiscipline')
      await showDisciplineToast()

      // Should default to non-custom icon (💡)
      expect(mockToast.info).toHaveBeenCalledWith('💡 Test quote', 8000)
    })

    it('should handle undefined response', async () => {
      mockFetch.mockResolvedValueOnce(undefined)

      const { showDisciplineToast } = await import('~/composables/useDiscipline')
      await showDisciplineToast()

      expect(mockToast.info).not.toHaveBeenCalled()
    })
  })
})
