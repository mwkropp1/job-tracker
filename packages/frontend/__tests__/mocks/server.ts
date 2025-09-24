import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * Mock Service Worker server for Node.js environment (tests)
 * This intercepts HTTP requests and returns mock responses
 */
export const server = setupServer(...handlers);

/**
 * Helper function to add additional handlers for specific tests
 */
export function addHandlers(...additionalHandlers: Parameters<typeof server.use>) {
  server.use(...additionalHandlers);
}

/**
 * Helper function to override existing handlers for specific test scenarios
 */
export function overrideHandlers(...overrideHandlers: Parameters<typeof server.use>) {
  server.resetHandlers(...overrideHandlers);
}