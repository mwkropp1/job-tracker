/**
 * Jest test setup file
 * This file runs before all tests and configures the testing environment
 */

import 'reflect-metadata'

// Mock environment variables for testing
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only'
process.env.JWT_EXPIRES_IN = '1h'
process.env.BCRYPT_ROUNDS = '10'

// Global test timeout
jest.setTimeout(30000)

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  // Keep console.log and console.error for debugging
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}

// Global test utilities
declare global {
  namespace NodeJS {
    interface Global {
      testUtils: {
        createMockRequest: (overrides?: any) => any
        createMockResponse: () => any
        createMockNext: () => jest.MockedFunction<any>
      }
    }
  }
}

// Mock utilities that can be used across tests
global.testUtils = {
  createMockRequest: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ...overrides
  }),

  createMockResponse: () => {
    const res: any = {}
    res.status = jest.fn().mockReturnValue(res)
    res.json = jest.fn().mockReturnValue(res)
    res.send = jest.fn().mockReturnValue(res)
    res.cookie = jest.fn().mockReturnValue(res)
    res.clearCookie = jest.fn().mockReturnValue(res)
    res.redirect = jest.fn().mockReturnValue(res)
    return res
  },

  createMockNext: () => jest.fn()
}

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
})

export {}