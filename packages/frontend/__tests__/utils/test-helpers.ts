import { vi, beforeEach, afterEach, expect } from 'vitest';

// Utility functions for testing

/**
 * Helper to wait for async operations in tests
 */
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Helper to create mock functions with better TypeScript support
 */
export const createMockFn = <T extends (...args: any[]) => any>() => {
  return vi.fn() as T;
};

/**
 * Helper to generate test IDs consistently
 */
export const testId = (id: string) => `[data-testid="${id}"]`;

/**
 * Helper to create mock Redux store state
 */
export const createMockStoreState = (overrides = {}) => ({
  ui: {
    isLoading: false,
    message: null,
    theme: 'light' as const,
  },
  ...overrides,
});

/**
 * Helper to mock console methods for testing
 */
export const mockConsole = () => {
  const originalConsole = { ...console };
  const mockConsole = {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  };

  beforeEach(() => {
    Object.assign(console, mockConsole);
  });

  afterEach(() => {
    Object.assign(console, originalConsole);
    vi.clearAllMocks();
  });

  return mockConsole;
};

/**
 * Helper to test accessibility
 */
export const checkAccessibility = async (container: HTMLElement) => {
  // This would integrate with axe-core if installed
  // For now, basic checks
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
  expect(headings.length).toBeGreaterThan(0);

  const buttons = container.querySelectorAll('button');
  buttons.forEach(button => {
    expect(button).toHaveAttribute('type');
  });
};