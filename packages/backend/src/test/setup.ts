/**
 * Jest test setup configuration
 * Configures global test environment, timeouts, and error handling
 */

import 'reflect-metadata';
import { TestEnvironmentUtils } from './testUtils';

TestEnvironmentUtils.setupTestEnv();

// Global test timeout for async operations (30 seconds)
jest.setTimeout(30_000);

// Mock console methods in tests to reduce noise, but preserve error/warn for debugging
const originalConsole = global.console
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  // Keep error and warn for debugging purposes during development
  error: process.env.NODE_ENV === 'test' ? jest.fn() : originalConsole.error,
  warn: process.env.NODE_ENV === 'test' ? jest.fn() : originalConsole.warn,
}

afterEach(async () => {
  jest.clearAllMocks()
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection in tests:', reason)
})

export {}