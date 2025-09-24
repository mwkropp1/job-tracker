import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore, type Store } from '@reduxjs/toolkit';
import type { PropsWithChildren } from 'react';

// Import your actual store configuration and reducers
// import { rootReducer, RootState } from '@/store';

// Mock store configuration for testing
const mockRootReducer = (state: any = {}, _action: any) => state;

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: any; // Replace with RootState when available
  store?: Store;
  queryClient?: QueryClient;
  route?: string;
}

/**
 * Custom render function that includes all necessary providers
 * for testing components that use Redux, React Query, and React Router
 */
export function renderWithProviders(
  ui: React.ReactElement,
  {
    preloadedState = {},
    store = configureStore({
      reducer: mockRootReducer,
      preloadedState,
    }),
    queryClient = createTestQueryClient(),
    route = '/',
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  // Set initial route
  window.history.pushState({}, 'Test page', route);

  function Wrapper({ children }: PropsWithChildren<{}>): JSX.Element {
    return (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>{children}</BrowserRouter>
        </QueryClientProvider>
      </Provider>
    );
  }

  return {
    store,
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

/**
 * Creates a test-specific QueryClient with sensible defaults
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        networkMode: 'always',
      },
      mutations: {
        retry: false,
        networkMode: 'always',
      },
    },
    // Disable logging in tests to reduce noise
  });
}

/**
 * Helper to create a mock store with type safety
 */
export function createMockStore(preloadedState: any = {}) {
  return configureStore({
    reducer: mockRootReducer,
    preloadedState,
  });
}

/**
 * Utility to wrap hooks for testing with providers
 */
export function createHookWrapper(
  store?: Store,
  queryClient?: QueryClient
) {
  return function HookWrapper({ children }: PropsWithChildren<{}>) {
    const testStore = store || createMockStore();
    const testQueryClient = queryClient || createTestQueryClient();

    return (
      <Provider store={testStore}>
        <QueryClientProvider client={testQueryClient}>
          {children}
        </QueryClientProvider>
      </Provider>
    );
  };
}

// Re-export everything from RTL
export * from '@testing-library/react';