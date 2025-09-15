/**
 * Input sanitization utilities for enhanced security
 * Provides functions to sanitize user input and prevent injection attacks
 */

import { STRING_LIMITS, COLLECTION_LIMITS } from '../constants/validation'

/**
 * Sanitizes a string by removing potentially harmful characters
 * and limiting length to prevent buffer overflow attacks.
 *
 * @param input String to sanitize
 * @param maxLength Maximum allowed length after sanitization
 * @returns Sanitized string safe for database storage
 */
export function sanitizeString(input: string, maxLength: number = STRING_LIMITS.DEFAULT_STRING): string {
  if (typeof input !== 'string') {
    return ''
  }

  return input
    .trim()
    .replace(/[<>;"']/g, '')
    .replace(/\x00/g, '')
    .replace(/[\r\n\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .substring(0, maxLength)
}

/**
 * Sanitizes search query strings to prevent SQL injection in LIKE queries.
 * Escapes special characters used in SQL LIKE patterns.
 *
 * @param query Search query string to sanitize
 * @returns Sanitized search query safe for database LIKE operations
 */
export function sanitizeSearchQuery(query: string): string {
  if (typeof query !== 'string') {
    return ''
  }

  return query
    .trim()
    .replace(/[%_\\]/g, '\\$&')
    .replace(/[<>;"']/g, '')
    .replace(/\x00/g, '')
    .substring(0, STRING_LIMITS.SEARCH_QUERY)
}

/**
 * Validates and sanitizes pagination parameters to prevent malicious input.
 *
 * @param page Page number to validate and sanitize
 * @param limit Items per page limit to validate and sanitize
 * @returns Validated pagination parameters within safe bounds
 */
export function sanitizePaginationParams(page?: string | number, limit?: string | number): {
  page: number
  limit: number
} {
  const sanitizedPage = Math.max(COLLECTION_LIMITS.MIN_PAGE, Math.min(COLLECTION_LIMITS.MAX_PAGE, Number(page) || 1))
  const sanitizedLimit = Math.max(COLLECTION_LIMITS.MIN_LIMIT, Math.min(COLLECTION_LIMITS.MAX_LIMIT, Number(limit) || COLLECTION_LIMITS.DEFAULT_LIMIT))

  return {
    page: sanitizedPage,
    limit: sanitizedLimit
  }
}

/**
 * Sanitizes phone numbers to allow only valid characters
 */
export function sanitizePhoneNumber(phone: string): string {
  if (typeof phone !== 'string') {
    return ''
  }

  return phone
    .trim()
    .replace(/[^0-9+\-\s\(\)\.]/g, '') // Keep only valid phone characters
    .substring(0, STRING_LIMITS.PHONE_NUMBER)
}

/**
 * Sanitizes email addresses
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    return ''
  }

  return email
    .trim()
    .toLowerCase()
    .replace(/[<>;"']/g, '') // Remove potentially harmful characters
    .substring(0, STRING_LIMITS.EMAIL) // RFC 5321 limit
}

/**
 * Sanitizes URL inputs
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') {
    return ''
  }

  try {
    const parsedUrl = new URL(url)
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return ''
    }
    return parsedUrl.toString().substring(0, STRING_LIMITS.URL) // Reasonable URL length limit
  } catch {
    return ''
  }
}

/**
 * Type guard to check if value is a plain object
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null &&
         typeof value === 'object' &&
         !Array.isArray(value) &&
         Object.prototype.toString.call(value) === '[object Object]'
}

/**
 * Sanitizes JSON input to prevent JSON injection
 * Uses proper generic constraints instead of 'any' type
 */
export function sanitizeJsonInput<T = unknown>(input: T): T extends string ? string
  : T extends (infer U)[] ? U[]
  : T extends Record<string, unknown> ? Record<string, unknown>
  : T {
  // Handle primitive types
  if (typeof input === 'string') {
    return sanitizeString(input) as any
  }

  if (typeof input === 'number' || typeof input === 'boolean' || input === null || input === undefined) {
    return input as any
  }
  // Handle arrays
  if (Array.isArray(input)) {
    return input.slice(0, COLLECTION_LIMITS.JSON_ARRAY_SIZE).map(item => sanitizeJsonInput(item)) as any
  }

  // Handle plain objects
  if (isPlainObject(input)) {
    const sanitized: Record<string, unknown> = {}
    let propertyCount = 0

    for (const [key, value] of Object.entries(input)) {
      if (propertyCount >= COLLECTION_LIMITS.JSON_OBJECT_PROPERTIES) {break}

      const sanitizedKey = sanitizeString(key, STRING_LIMITS.SHORT_STRING)
      if (sanitizedKey) {
        sanitized[sanitizedKey] = sanitizeJsonInput(value)
        propertyCount++
      }
    }

    return sanitized as any
  }

  // Return input as-is for other types (preserves type)
  return input as any
}