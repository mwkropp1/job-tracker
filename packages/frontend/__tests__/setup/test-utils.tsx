import { render, type RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureStore } from '@reduxjs/toolkit';
import type { ReactElement, ReactNode } from 'react';

import { uiSlice } from '@/store/slices/uiSlice';

/**
 * Creates a test Redux store with UI slice
 *
 * Configured for testing with serializable check disabled to avoid
 * warnings from test-specific actions and state.
 *
 * @returns Configured Redux store for testing
 */
const createTestStore = () =>
  configureStore({
    reducer: {
      ui: uiSlice.reducer,
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });

/**
 * Creates a React Query client optimized for testing
 *
 * Disables retries, caching, and stale time to ensure predictable
 * test behavior and faster test execution.
 *
 * @returns Configured QueryClient for testing
 */
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

interface AllTheProvidersProps {
  children: ReactNode;
}

/**
 * Test wrapper component that provides all necessary contexts
 *
 * Wraps components with Redux Provider and React Query Client for testing.
 * Creates fresh instances of store and query client for each test to ensure isolation.
 *
 * @param children - React components to wrap with providers
 * @returns JSX element with all providers
 */
const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  const testStore = createTestStore();
  const testQueryClient = createTestQueryClient();

  return (
    <Provider store={testStore}>
      <QueryClientProvider client={testQueryClient}>
        {children}
      </QueryClientProvider>
    </Provider>
  );
};

/**
 * Custom render function with all providers pre-configured
 *
 * Extends React Testing Library's render function to automatically
 * wrap components with Redux and React Query providers.
 *
 * @param ui - React element to render
 * @param options - Optional render options (excluding wrapper)
 * @returns Render result from React Testing Library
 */
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { customRender as render };