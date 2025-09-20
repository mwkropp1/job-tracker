import '@testing-library/jest-dom';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { handlers } from '../mocks/handlers';

// Mock server setup for API mocking
export const server = setupServer(...handlers);

// Start server before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'error'
  });
});

// Reset handlers after each test `important for test isolation`
afterEach(() => {
  server.resetHandlers();
});

// Close server after all tests
afterAll(() => {
  server.close();
});

// Global test cleanup
afterEach(() => {
  // Clear any localStorage/sessionStorage if needed
  localStorage.clear();
  sessionStorage.clear();
});