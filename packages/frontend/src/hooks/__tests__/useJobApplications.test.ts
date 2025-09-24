/**
 * useJobApplications Hook tests following TDD principles
 * These tests define the expected behavior of the custom React hook
 * WRITE THESE TESTS BEFORE IMPLEMENTING THE HOOK
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createHookWrapper } from '../../../__tests__/utils/renderWithProviders';
import { server, overrideHandlers } from '../../../__tests__/mocks/server';
import { http, HttpResponse } from 'msw';
import { createMockJobApplications } from '../../../__tests__/utils/mockData';

// Import the hook that we will implement
// NOTE: This import will fail initially - that's expected in TDD!
// import { useJobApplications } from '../useJobApplications';

describe.skip('useJobApplications Hook', () => {
  const API_BASE_URL = 'http://localhost:3001/api';

  beforeEach(() => {
    localStorage.clear();
  });

  describe('Default behavior', () => {
    it('should fetch job applications on mount with default parameters', async () => {
      // const { result } = renderHook(() => useJobApplications(), {
      //   wrapper: createHookWrapper(),
      // });

      // Initially loading
      // expect(result.current.isLoading).toBe(true);
      // expect(result.current.data).toBeUndefined();
      // expect(result.current.error).toBeNull();

      // Wait for the query to complete
      // await waitFor(() => {
      //   expect(result.current.isLoading).toBe(false);
      // });

      // Should have data
      // expect(result.current.data).toBeDefined();
      // expect(result.current.data!.data).toHaveLength(expect.any(Number));
      // expect(result.current.data!.total).toBeGreaterThanOrEqual(0);
      // expect(result.current.error).toBeNull();
    });

    it('should use default pagination parameters', async () => {
      let capturedUrl = '';

      overrideHandlers(
        http.get(`${API_BASE_URL}/job-applications`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            data: createMockJobApplications(10),
            total: 10,
            page: 1,
            limit: 10,
            totalPages: 1,
          });
        })
      );

      // renderHook(() => useJobApplications(), {
      //   wrapper: createHookWrapper(),
      // });

      // await waitFor(() => {
      //   expect(capturedUrl).toContain('page=1');
      //   expect(capturedUrl).toContain('limit=10');
      // });
    });
  });

  describe('Custom parameters', () => {
    it('should accept custom pagination parameters', async () => {
      let capturedUrl = '';

      overrideHandlers(
        http.get(`${API_BASE_URL}/job-applications`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            data: createMockJobApplications(5),
            total: 25,
            page: 2,
            limit: 5,
            totalPages: 5,
          });
        })
      );

      const params = { page: 2, limit: 5 };

      // const { result } = renderHook(() => useJobApplications(params), {
      //   wrapper: createHookWrapper(),
      // });

      // await waitFor(() => {
      //   expect(capturedUrl).toContain('page=2');
      //   expect(capturedUrl).toContain('limit=5');
      // });

      // await waitFor(() => {
      //   expect(result.current.data!.page).toBe(2);
      //   expect(result.current.data!.limit).toBe(5);
      // });
    });

    it('should accept status filter parameter', async () => {
      let capturedUrl = '';

      overrideHandlers(
        http.get(`${API_BASE_URL}/job-applications`, ({ request }) => {
          capturedUrl = request.url;
          const url = new URL(request.url);
          const status = url.searchParams.get('status');

          const filteredData = createMockJobApplications(5).map(app => ({
            ...app,
            status: status as any
          }));

          return HttpResponse.json({
            data: filteredData,
            total: 5,
            page: 1,
            limit: 10,
            totalPages: 1,
          });
        })
      );

      const params = { status: 'interviewing' as const };

      // const { result } = renderHook(() => useJobApplications(params), {
      //   wrapper: createHookWrapper(),
      // });

      // await waitFor(() => {
      //   expect(capturedUrl).toContain('status=interviewing');
      // });

      // await waitFor(() => {
      //   expect(result.current.data!.data.every(app => app.status === 'interviewing')).toBe(true);
      // });
    });

    it('should accept search parameter', async () => {
      let capturedUrl = '';

      overrideHandlers(
        http.get(`${API_BASE_URL}/job-applications`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            data: createMockJobApplications(2),
            total: 2,
            page: 1,
            limit: 10,
            totalPages: 1,
          });
        })
      );

      const params = { search: 'Tech Corp' };

      // const { result } = renderHook(() => useJobApplications(params), {
      //   wrapper: createHookWrapper(),
      // });

      // await waitFor(() => {
      //   expect(capturedUrl).toContain('search=Tech%20Corp');
      // });
    });
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      overrideHandlers(
        http.get(`${API_BASE_URL}/job-applications`, () => {
          return HttpResponse.error();
        })
      );

      // const { result } = renderHook(() => useJobApplications(), {
      //   wrapper: createHookWrapper(),
      // });

      // await waitFor(() => {
      //   expect(result.current.isLoading).toBe(false);
      //   expect(result.current.error).toBeTruthy();
      //   expect(result.current.data).toBeUndefined();
      // });
    });

    it('should handle API errors (500) gracefully', async () => {
      overrideHandlers(
        http.get(`${API_BASE_URL}/job-applications`, () => {
          return new HttpResponse(JSON.stringify({
            error: 'Internal Server Error',
            message: 'Database connection failed',
            statusCode: 500
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        })
      );

      // const { result } = renderHook(() => useJobApplications(), {
      //   wrapper: createHookWrapper(),
      // });

      // await waitFor(() => {
      //   expect(result.current.isLoading).toBe(false);
      //   expect(result.current.error).toBeTruthy();
      //   expect(result.current.data).toBeUndefined();
      // });
    });

    it('should handle authentication errors (401)', async () => {
      overrideHandlers(
        http.get(`${API_BASE_URL}/job-applications`, () => {
          return new HttpResponse(JSON.stringify({
            error: 'Unauthorized',
            message: 'Token expired',
            statusCode: 401
          }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        })
      );

      // const { result } = renderHook(() => useJobApplications(), {
      //   wrapper: createHookWrapper(),
      // });

      // await waitFor(() => {
      //   expect(result.current.isLoading).toBe(false);
      //   expect(result.current.error).toBeTruthy();
      // });
    });
  });

  describe('Loading states', () => {
    it('should show loading state initially', () => {
      // const { result } = renderHook(() => useJobApplications(), {
      //   wrapper: createHookWrapper(),
      // });

      // expect(result.current.isLoading).toBe(true);
      // expect(result.current.isFetching).toBe(true);
      // expect(result.current.data).toBeUndefined();
    });

    it('should show fetching state when refetching', async () => {
      // const { result } = renderHook(() => useJobApplications(), {
      //   wrapper: createHookWrapper(),
      // });

      // Wait for initial load
      // await waitFor(() => {
      //   expect(result.current.isLoading).toBe(false);
      // });

      // Trigger refetch
      // result.current.refetch();

      // Should show fetching state
      // expect(result.current.isFetching).toBe(true);
    });
  });

  describe('Caching and data management', () => {
    it('should cache data and not refetch on remount', async () => {
      let requestCount = 0;

      overrideHandlers(
        http.get(`${API_BASE_URL}/job-applications`, () => {
          requestCount++;
          return HttpResponse.json({
            data: createMockJobApplications(5),
            total: 5,
            page: 1,
            limit: 10,
            totalPages: 1,
          });
        })
      );

      const wrapper = createHookWrapper();

      // First render
      // const { unmount: unmount1 } = renderHook(() => useJobApplications(), { wrapper });

      // await waitFor(() => {
      //   expect(requestCount).toBe(1);
      // });

      // unmount1();

      // Second render (should use cache)
      // const { result } = renderHook(() => useJobApplications(), { wrapper });

      // Should have data immediately from cache
      // expect(result.current.data).toBeDefined();
      // expect(requestCount).toBe(1); // Should not have made another request
    });

    it('should support manual refetch', async () => {
      let requestCount = 0;

      overrideHandlers(
        http.get(`${API_BASE_URL}/job-applications`, () => {
          requestCount++;
          return HttpResponse.json({
            data: createMockJobApplications(5),
            total: 5,
            page: 1,
            limit: 10,
            totalPages: 1,
          });
        })
      );

      // const { result } = renderHook(() => useJobApplications(), {
      //   wrapper: createHookWrapper(),
      // });

      // Wait for initial load
      // await waitFor(() => {
      //   expect(requestCount).toBe(1);
      // });

      // Manual refetch
      // await result.current.refetch();

      // Should have made another request
      // expect(requestCount).toBe(2);
    });

    it('should invalidate cache when parameters change', async () => {
      let requestCount = 0;

      overrideHandlers(
        http.get(`${API_BASE_URL}/job-applications`, ({ request }) => {
          requestCount++;
          const url = new URL(request.url);
          const page = url.searchParams.get('page') || '1';

          return HttpResponse.json({
            data: createMockJobApplications(5),
            total: 10,
            page: parseInt(page),
            limit: 10,
            totalPages: 1,
          });
        })
      );

      // const { result, rerender } = renderHook(
      //   ({ params }) => useJobApplications(params),
      //   {
      //     wrapper: createHookWrapper(),
      //     initialProps: { params: { page: 1 } },
      //   }
      // );

      // Wait for initial load
      // await waitFor(() => {
      //   expect(requestCount).toBe(1);
      // });

      // Change parameters
      // rerender({ params: { page: 2 } });

      // Should trigger new request
      // await waitFor(() => {
      //   expect(requestCount).toBe(2);
      // });
    });
  });

  describe('Return values', () => {
    it('should return all necessary query states and functions', async () => {
      // const { result } = renderHook(() => useJobApplications(), {
      //   wrapper: createHookWrapper(),
      // });

      // Wait for load
      // await waitFor(() => {
      //   expect(result.current.isLoading).toBe(false);
      // });

      // Check all expected properties are present
      // expect(result.current).toHaveProperty('data');
      // expect(result.current).toHaveProperty('isLoading');
      // expect(result.current).toHaveProperty('isFetching');
      // expect(result.current).toHaveProperty('error');
      // expect(result.current).toHaveProperty('refetch');
      // expect(result.current).toHaveProperty('isSuccess');
      // expect(result.current).toHaveProperty('isError');

      // Check types
      // expect(typeof result.current.isLoading).toBe('boolean');
      // expect(typeof result.current.isFetching).toBe('boolean');
      // expect(typeof result.current.isSuccess).toBe('boolean');
      // expect(typeof result.current.isError).toBe('boolean');
      // expect(typeof result.current.refetch).toBe('function');
    });
  });
});

/**
 * TODO: Implement the useJobApplications hook in src/hooks/useJobApplications.ts
 *
 * Requirements based on these tests:
 * 1. Use React Query (useQuery) for data fetching
 * 2. Accept optional parameters (page, limit, status, search)
 * 3. Provide default pagination values
 * 4. Handle loading and error states properly
 * 5. Support caching and refetching
 * 6. Return all necessary query states and functions
 * 7. Properly handle parameter changes
 * 8. Use the jobApplicationApi service for actual API calls
 *
 * Interface should look like:
 * ```typescript
 * interface UseJobApplicationsParams {
 *   page?: number;
 *   limit?: number;
 *   status?: JobApplicationStatus;
 *   search?: string;
 * }
 *
 * function useJobApplications(params?: UseJobApplicationsParams) {
 *   // Implementation
 * }
 * ```
 *
 * Once implemented, remove the .skip from the describe block above
 */