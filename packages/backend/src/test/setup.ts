/**
 * Jest test setup configuration
 * Configures global test environment, timeouts, and error handling
 */

import 'reflect-metadata';
import { TestEnvironmentUtils } from './testUtils';

TestEnvironmentUtils.setupTestEnv();

jest.setTimeout(30_000);

// Suppress console noise while preserving debugging capabilities in development
const originalConsole = global.console
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  // Preserve error/warn for debugging when not in test environment
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