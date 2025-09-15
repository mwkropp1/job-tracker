/**
 * Test infrastructure exports
 * Centralized exports for all test utilities, assertions, and setup functions
 */

// Database setup and management
export {
  initializeTestDatabase,
  cleanupTestDatabase,
  resetTestDatabase,
  closeTestDatabase,
  getTestDatabase,
  getTestRepository,
  runInTransaction,
  getRecordCount,
  isTestDatabaseReady,
  TestDatabase,
  testDatabase
} from './testDatabase'

// Test data factories and helpers
export {
  TestDataFactory,
  DatabaseTestHelpers
} from './testDataFactory'

// Enhanced assertion utilities
export {
  EnhancedTestAssertions
} from './assertions'

// Mock utilities for Express and database
export {
  MockExpressUtils,
  MockDatabaseUtils,
  TestEnvironmentUtils
} from './testUtils'

// Test constants and configuration
export {
  TEST_CONSTANTS
} from './constants'

// Types
export type {
  ApiErrorResponse,
  PaginationResponse,
  UserPublicResponse
} from './assertions'

export type {
  MockRequest,
  MockResponse,
  MockQueryBuilder
} from './testUtils'

export type {
  TestConstantKeys,
  DatabaseCleanupEntity,
  AllowedMimeType
} from './constants'