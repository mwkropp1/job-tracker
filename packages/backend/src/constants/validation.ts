/**
 * Validation and sanitization constants
 * Centralizes all magic numbers for consistency and maintainability
 */

// String length limits
export const STRING_LIMITS = {
  // General text fields
  DEFAULT_STRING: 1000,
  SHORT_STRING: 100,
  MEDIUM_STRING: 500,
  LONG_STRING: 2000,

  // Specific field limits
  COMPANY_NAME: 100,
  JOB_TITLE: 100,
  CONTACT_NAME: 100,
  NOTES: 1000,
  INTERACTION_NOTES: 500,

  // Resume-specific limits
  RESUME_VERSION_NAME: 100,
  RESUME_FILE_NAME: 255,
  RESUME_NOTES: 1000,

  // Contact information
  EMAIL: 254, // RFC 5321 limit
  PHONE_NUMBER: 20,
  URL: 2048,

  // Search and query limits
  SEARCH_QUERY: 100,
  LOG_MESSAGE: 1000,
  LOG_CONTEXT_VALUE: 500,
} as const

// Array and object limits
export const COLLECTION_LIMITS = {
  // Array sizes
  JSON_ARRAY_SIZE: 100,

  // Object properties
  JSON_OBJECT_PROPERTIES: 50,

  // Pagination
  MAX_PAGE: 1000,
  MAX_LIMIT: 100,
  DEFAULT_LIMIT: 10,
  MIN_PAGE: 1,
  MIN_LIMIT: 1,
} as const

// File and system limits
export const SYSTEM_LIMITS = {
  // File sizes (in MB for readability, converted to bytes in usage)
  LOG_FILE_SIZE_MB: 20,
  LOG_RETENTION_DAYS: 14,

  // Resume file limits
  RESUME_FILE_SIZE_MB: 10,
  RESUME_FILE_SIZE_BYTES: 10 * 1024 * 1024,

  // Performance thresholds
  QUERY_TIMEOUT_MS: 30000,
  REQUEST_TIMEOUT_MS: 60000,
} as const

// Validation patterns (as constants for reusability)
export const VALIDATION_PATTERNS = {
  PHONE_NUMBER: /^[0-9+\-\s().-]*$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  URL_PROTOCOL: /^https?:\/\//i,

  // File name validation - allow alphanumeric, spaces, hyphens, underscores, and dots
  FILE_NAME: /^[a-zA-Z0-9\s\-_.]+$/,
} as const

// File type constants
export const FILE_TYPES = {
  RESUME_ALLOWED_MIME_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ] as const,

  RESUME_ALLOWED_EXTENSIONS: ['.pdf', '.doc', '.docx'] as const,

  // MIME type to extension mapping
  MIME_TO_EXTENSION: {
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  } as const,
} as const

// Security-related constants
export const SECURITY_LIMITS = {
  // Rate limiting
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_LOGIN_ATTEMPTS: 5,

  // Token and authentication
  JWT_EXPIRY_HOURS: 24,
  REFRESH_TOKEN_DAYS: 7,

  // Password requirements
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
} as const

// Analytics and business logic constants
export const ANALYTICS_CONSTANTS = {
  // Time-based analytics
  RECENT_ACTIVITY_DAYS: 90,
  RECENT_ANALYTICS_DAYS: 30,
  RECENT_RESUMES_LIMIT: 5,

  // Usage tracking
  DEFAULT_USAGE_COUNT: 0,
  MIN_USAGE_FOR_ANALYTICS: 1,
} as const

// Type helpers for better type safety
export type StringLimitKey = keyof typeof STRING_LIMITS
export type CollectionLimitKey = keyof typeof COLLECTION_LIMITS
export type SystemLimitKey = keyof typeof SYSTEM_LIMITS
export type ValidationPatternKey = keyof typeof VALIDATION_PATTERNS
export type SecurityLimitKey = keyof typeof SECURITY_LIMITS
export type FileTypeKey = keyof typeof FILE_TYPES
export type AnalyticsConstantKey = keyof typeof ANALYTICS_CONSTANTS

// File type utility types
export type AllowedResumeMediaType = (typeof FILE_TYPES.RESUME_ALLOWED_MIME_TYPES)[number]
export type AllowedResumeExtension = (typeof FILE_TYPES.RESUME_ALLOWED_EXTENSIONS)[number]
