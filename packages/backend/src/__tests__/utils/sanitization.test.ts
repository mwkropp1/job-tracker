/**
 * Tests for sanitization utilities
 */

import {
  sanitizeString,
  sanitizeEmail,
  sanitizeSearchQuery,
  sanitizePhoneNumber,
  sanitizeUrl,
  sanitizePaginationParams
} from '../../utils/sanitization'

describe('Sanitization Utils', () => {
  describe('sanitizeString', () => {
    it('should remove potentially harmful characters', () => {
      const input = '<script>alert("xss")</script>Hello World'
      const result = sanitizeString(input)
      expect(result).toBe('scriptalert(xss)/scriptHello World')
    })

    it('should trim whitespace and collapse multiple spaces', () => {
      const input = '  Hello   World  '
      const result = sanitizeString(input)
      expect(result).toBe('Hello World')
    })

    it('should handle non-string inputs', () => {
      expect(sanitizeString(null as any)).toBe('')
      expect(sanitizeString(undefined as any)).toBe('')
      expect(sanitizeString(123 as any)).toBe('')
    })

    it('should handle empty strings', () => {
      expect(sanitizeString('')).toBe('')
      expect(sanitizeString('   ')).toBe('')
    })

    it('should limit string length', () => {
      const longString = 'a'.repeat(1000)
      const result = sanitizeString(longString, 10)
      expect(result).toHaveLength(10)
    })
  })

  describe('sanitizeEmail', () => {
    it('should normalize valid email addresses', () => {
      const email = '  TEST@EXAMPLE.COM  '
      const result = sanitizeEmail(email)
      expect(result).toBe('test@example.com')
    })

    it('should remove harmful characters', () => {
      const email = 'test<script>@example.com'
      const result = sanitizeEmail(email)
      expect(result).toBe('testscript@example.com')
    })

    it('should handle non-string inputs', () => {
      expect(sanitizeEmail(null as any)).toBe('')
      expect(sanitizeEmail(undefined as any)).toBe('')
    })
  })

  describe('sanitizeSearchQuery', () => {
    it('should escape SQL LIKE wildcards', () => {
      const query = 'test%query_with\\wildcards'
      const result = sanitizeSearchQuery(query)
      expect(result).toBe('test\\%query\\_with\\\\wildcards')
    })

    it('should remove harmful characters', () => {
      const query = 'search<script>query'
      const result = sanitizeSearchQuery(query)
      expect(result).toBe('searchscriptquery')
    })
  })

  describe('sanitizePhoneNumber', () => {
    it('should keep only valid phone characters', () => {
      const phone = '+1 (555) abc-123-4567'
      const result = sanitizePhoneNumber(phone)
      expect(result).toBe('+1 (555) -123-4567')
    })

    it('should handle non-string inputs', () => {
      expect(sanitizePhoneNumber(null as any)).toBe('')
    })
  })

  describe('sanitizeUrl', () => {
    it('should validate and return valid HTTP URLs', () => {
      const url = 'https://example.com'
      const result = sanitizeUrl(url)
      expect(result).toBe('https://example.com/')
    })

    it('should reject invalid protocols', () => {
      const url = 'javascript:alert(1)'
      const result = sanitizeUrl(url)
      expect(result).toBe('')
    })

    it('should handle malformed URLs', () => {
      const url = 'not a url'
      const result = sanitizeUrl(url)
      expect(result).toBe('')
    })
  })

  describe('sanitizePaginationParams', () => {
    it('should return valid pagination parameters', () => {
      const result = sanitizePaginationParams('2', '20')
      expect(result).toEqual({ page: 2, limit: 20 })
    })

    it('should handle invalid inputs with defaults', () => {
      const result = sanitizePaginationParams('abc', '-5')
      expect(result.page).toBeGreaterThanOrEqual(1)
      expect(result.limit).toBeGreaterThanOrEqual(1)
    })

    it('should enforce limits', () => {
      const result = sanitizePaginationParams('9999', '9999')
      expect(result.page).toBeLessThanOrEqual(1000) // Assuming reasonable max
      expect(result.limit).toBeLessThanOrEqual(100) // Assuming reasonable max
    })
  })
})