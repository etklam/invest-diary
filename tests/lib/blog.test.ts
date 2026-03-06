import { describe, it, expect } from 'vitest'
import {
  generateSlug,
  generateExcerpt,
  calculateReadingTime,
  parseTags,
  stringifyTags,
} from '~/lib/blog'

describe('generateSlug', () => {
  describe('basic functionality', () => {
    it('should convert to lowercase', () => {
      expect(generateSlug('Hello World')).toBe('hello-world')
    })

    it('should trim whitespace', () => {
      expect(generateSlug('  Hello World  ')).toBe('hello-world')
    })

    it('should replace spaces with hyphens', () => {
      expect(generateSlug('Hello World Test')).toBe('hello-world-test')
    })

    it('should replace multiple spaces with single hyphen', () => {
      expect(generateSlug('Hello    World')).toBe('hello-world')
    })

    it('should replace multiple hyphens with single hyphen', () => {
      expect(generateSlug('Hello--World')).toBe('hello-world')
    })

    it('should remove leading hyphens', () => {
      expect(generateSlug('-Hello World')).toBe('hello-world')
    })

    it('should remove trailing hyphens', () => {
      expect(generateSlug('Hello World-')).toBe('hello-world')
    })
  })

  describe('special characters', () => {
    it('should remove special characters', () => {
      expect(generateSlug('Hello! @World# $Test%')).toBe('hello-world-test')
    })

    it('should keep alphanumeric characters', () => {
      expect(generateSlug('Test123 ABC')).toBe('test123-abc')
    })

    it('should keep hyphens', () => {
      expect(generateSlug('Hello-World')).toBe('hello-world')
    })
  })

  describe('Chinese characters', () => {
    it('should keep Chinese characters', () => {
      expect(generateSlug('你好世界')).toBe('你好世界')
    })

    it('should handle mixed Chinese and English', () => {
      expect(generateSlug('Hello 世界 Test')).toBe('hello-世界-test')
    })

    it('should handle Chinese with spaces', () => {
      expect(generateSlug('台灣 股市 分析')).toBe('台灣-股市-分析')
    })
  })

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(generateSlug('')).toBe('')
    })

    it('should handle only special characters', () => {
      expect(generateSlug('!@#$%')).toBe('')
    })

    it('should handle only spaces', () => {
      expect(generateSlug('   ')).toBe('')
    })

    it('should handle single word', () => {
      expect(generateSlug('Hello')).toBe('hello')
    })

    it('should handle numbers only', () => {
      expect(generateSlug('123 456')).toBe('123-456')
    })
  })
})

describe('generateExcerpt', () => {
  describe('basic functionality', () => {
    it('should return plain text without markdown', () => {
      const content = '# Hello **World**'
      expect(generateExcerpt(content)).toBe('Hello World')
    })

    it('should remove heading markers', () => {
      const content = '## Title\n### Subtitle'
      expect(generateExcerpt(content)).toBe('Title Subtitle')
    })

    it('should remove bold markers', () => {
      const content = '**bold** text'
      expect(generateExcerpt(content)).toBe('bold text')
    })

    it('should remove italic markers', () => {
      const content = '*italic* text'
      expect(generateExcerpt(content)).toBe('italic text')
    })

    it('should remove code backticks', () => {
      const content = '`code` text'
      expect(generateExcerpt(content)).toBe('code text')
    })

    it('should remove link brackets', () => {
      const content = '[link](url) text'
      expect(generateExcerpt(content)).toBe('link text')
    })
  })

  describe('whitespace handling', () => {
    it('should replace newlines with spaces', () => {
      const content = 'Line1\nLine2\nLine3'
      expect(generateExcerpt(content)).toBe('Line1 Line2 Line3')
    })

    it('should collapse multiple spaces', () => {
      const content = 'Hello    World'
      expect(generateExcerpt(content)).toBe('Hello World')
    })

    it('should trim leading and trailing whitespace', () => {
      const content = '  Hello World  '
      expect(generateExcerpt(content)).toBe('Hello World')
    })
  })

  describe('length limiting', () => {
    it('should truncate to default max length (150)', () => {
      const content = 'a'.repeat(200)
      const result = generateExcerpt(content)
      expect(result.length).toBe(153) // 150 + '...'
    })

    it('should add ellipsis when truncated', () => {
      const content = 'a'.repeat(200)
      const result = generateExcerpt(content)
      expect(result.endsWith('...')).toBe(true)
    })

    it('should not add ellipsis when not truncated', () => {
      const content = 'Short content'
      const result = generateExcerpt(content)
      expect(result.endsWith('...')).toBe(false)
    })

    it('should respect custom max length', () => {
      const content = 'a'.repeat(200)
      const result = generateExcerpt(content, 50)
      expect(result.length).toBe(53) // 50 + '...'
    })

    it('should handle exact length content', () => {
      const content = 'a'.repeat(150)
      const result = generateExcerpt(content)
      expect(result).toBe(content)
      expect(result.endsWith('...')).toBe(false)
    })
  })

  describe('complex content', () => {
    it('should handle markdown with multiple elements', () => {
      const content = `# Title
This is **bold** and *italic* text.
\`code\` here and a [link](url).`
      expect(generateExcerpt(content)).toBe('Title This is bold and italic text. code here and a link.')
    })

    it('should handle mixed content with length limit', () => {
      const content = `# Long Title
This is a very long piece of content that should be truncated at some point because it exceeds the maximum length.`
      const result = generateExcerpt(content, 50)
      expect(result.length).toBe(53)
      expect(result.endsWith('...')).toBe(true)
    })
  })
})

describe('calculateReadingTime', () => {
  describe('basic functionality', () => {
    it('should return 1 for short content', () => {
      const content = 'Short content'
      expect(calculateReadingTime(content)).toBe(1)
    })

    it('should return 1 for content under 200 characters', () => {
      const content = 'a'.repeat(199)
      expect(calculateReadingTime(content)).toBe(1)
    })

    it('should return 1 for exactly 200 characters', () => {
      const content = 'a'.repeat(200)
      expect(calculateReadingTime(content)).toBe(1)
    })

    it('should return 2 for content over 200 characters', () => {
      const content = 'a'.repeat(201)
      expect(calculateReadingTime(content)).toBe(2)
    })

    it('should return correct time for longer content', () => {
      const content = 'a'.repeat(500)
      expect(calculateReadingTime(content)).toBe(3) // ceil(500/200) = 3
    })

    it('should return correct time for 1000 characters', () => {
      const content = 'a'.repeat(1000)
      expect(calculateReadingTime(content)).toBe(5) // ceil(1000/200) = 5
    })

    it('should calculate by words for space-delimited text', () => {
      const content = Array.from({ length: 200 }, () => 'word').join(' ')
      expect(calculateReadingTime(content)).toBe(1)
    })

    it('should treat continuous CJK text as character-based estimation', () => {
      const content = '這是一段測試內容'.repeat(200)
      expect(calculateReadingTime(content)).toBe(4)
    })
  })

  describe('edge cases', () => {
    it('should return 1 for empty string', () => {
      expect(calculateReadingTime('')).toBe(1) // ceil(0/200) = 0, but minimum is 1
    })

    it('should handle very long content', () => {
      const content = 'a'.repeat(10000)
      expect(calculateReadingTime(content)).toBe(50) // ceil(10000/200) = 50
    })
  })
})

describe('parseTags', () => {
  describe('basic functionality', () => {
    it('should split comma-separated tags', () => {
      expect(parseTags('tag1,tag2,tag3')).toEqual(['tag1', 'tag2', 'tag3'])
    })

    it('should trim whitespace from tags', () => {
      expect(parseTags('tag1, tag2 , tag3')).toEqual(['tag1', 'tag2', 'tag3'])
    })

    it('should handle single tag', () => {
      expect(parseTags('tag1')).toEqual(['tag1'])
    })
  })

  describe('empty and null handling', () => {
    it('should return empty array for null', () => {
      expect(parseTags(null)).toEqual([])
    })

    it('should return empty array for undefined', () => {
      expect(parseTags(undefined)).toEqual([])
    })

    it('should return empty array for empty string', () => {
      expect(parseTags('')).toEqual([])
    })

    it('should filter out empty tags', () => {
      expect(parseTags('tag1,,tag2,')).toEqual(['tag1', 'tag2'])
    })

    it('should filter out whitespace-only tags', () => {
      expect(parseTags('tag1,   ,tag2')).toEqual(['tag1', 'tag2'])
    })
  })

  describe('special content', () => {
    it('should handle Chinese tags', () => {
      expect(parseTags('投資,股票,台股')).toEqual(['投資', '股票', '台股'])
    })

    it('should handle mixed language tags', () => {
      expect(parseTags('investment,投資,stock')).toEqual(['investment', '投資', 'stock'])
    })

    it('should preserve tag case', () => {
      expect(parseTags('Tag1,TAG2,tag3')).toEqual(['Tag1', 'TAG2', 'tag3'])
    })
  })
})

describe('stringifyTags', () => {
  describe('basic functionality', () => {
    it('should join tags with commas', () => {
      expect(stringifyTags(['tag1', 'tag2', 'tag3'])).toBe('tag1,tag2,tag3')
    })

    it('should handle single tag', () => {
      expect(stringifyTags(['tag1'])).toBe('tag1')
    })

    it('should handle empty array', () => {
      expect(stringifyTags([])).toBe('')
    })
  })

  describe('special content', () => {
    it('should handle Chinese tags', () => {
      expect(stringifyTags(['投資', '股票'])).toBe('投資,股票')
    })

    it('should preserve tag case', () => {
      expect(stringifyTags(['Tag1', 'TAG2'])).toBe('Tag1,TAG2')
    })
  })
})

describe('parseTags and stringifyTags round-trip', () => {
  it('should maintain tags through parse and stringify', () => {
    const original = 'tag1, tag2, tag3'
    const parsed = parseTags(original)
    const stringified = stringifyTags(parsed)
    expect(stringified).toBe('tag1,tag2,tag3')
  })

  it('should handle Chinese tags in round-trip', () => {
    const original = '投資, 股票, 台股'
    const parsed = parseTags(original)
    const stringified = stringifyTags(parsed)
    expect(stringified).toBe('投資,股票,台股')
  })
})
