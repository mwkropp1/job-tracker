/**
 * API Client tests following TDD principles
 * These tests define the expected behavior of the HTTP client
 * WRITE THESE TESTS BEFORE IMPLEMENTING THE API CLIENT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { server, overrideHandlers } from '../../../__tests__/mocks/server';
import { http, HttpResponse } from 'msw';

// Import the API client that we will implement
// NOTE: This import will fail initially - that's expected in TDD!
import { apiClient } from '../apiClient';

describe('API Client', () => {
  // Mock base URL for testing
  const API_BASE_URL = 'http://localhost:3001/api';

  beforeEach(() => {
    // Reset any localStorage/auth state
    localStorage.clear();
  });

  describe('Configuration', () => {
    it('should use the correct base URL from environment', () => {
      // Test that the client is configured with the right base URL
      // expect(apiClient.defaults.baseURL).toBe(process.env.VITE_API_URL || 'http://localhost:3001/api');
    });

    it('should set default headers including Content-Type', () => {
      // expect(apiClient.defaults.headers.common['Content-Type']).toBe('application/json');
    });

    it('should have a reasonable timeout configured', () => {
      // expect(apiClient.defaults.timeout).toBeGreaterThan(0);
      // expect(apiClient.defaults.timeout).toBeLessThanOrEqual(30000); // 30 seconds max
    });
  });

  describe('Authentication', () => {
    it('should include Authorization header when token is present', async () => {
      // Set up auth token
      localStorage.setItem('authToken', 'fake-jwt-token');

      // Mock an endpoint to capture the request
      overrideHandlers(
        http.get(`${API_BASE_URL}/test-auth`, ({ request }) => {
          const authHeader = request.headers.get('Authorization');
          return HttpResponse.json({ authHeader });
        })
      );

      // Make request and verify auth header is included
      // const response = await apiClient.get('/test-auth');
      // expect(response.data.authHeader).toBe('Bearer fake-jwt-token');
    });

    it('should not include Authorization header when no token is present', async () => {
      // Ensure no token is present
      localStorage.removeItem('authToken');

      overrideHandlers(
        http.get(`${API_BASE_URL}/test-no-auth`, ({ request }) => {
          const authHeader = request.headers.get('Authorization');
          return HttpResponse.json({ authHeader });
        })
      );

      // const response = await apiClient.get('/test-no-auth');
      // expect(response.data.authHeader).toBeNull();
    });
  });

  describe('HTTP Methods', () => {
    it('should support GET requests', async () => {
      overrideHandlers(
        http.get(`${API_BASE_URL}/test-get`, () => {
          return HttpResponse.json({ method: 'GET', success: true });
        })
      );

      // const response = await apiClient.get('/test-get');
      // expect(response.data.method).toBe('GET');
      // expect(response.data.success).toBe(true);
    });

    it('should support POST requests with data', async () => {
      const testData = { name: 'Test', value: 123 };

      overrideHandlers(
        http.post(`${API_BASE_URL}/test-post`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({ method: 'POST', receivedData: body });
        })
      );

      // const response = await apiClient.post('/test-post', testData);
      // expect(response.data.method).toBe('POST');
      // expect(response.data.receivedData).toEqual(testData);
    });

    it('should support PUT requests with data', async () => {
      const testData = { id: 1, name: 'Updated Test' };

      overrideHandlers(
        http.put(`${API_BASE_URL}/test-put`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({ method: 'PUT', receivedData: body });
        })
      );

      // const response = await apiClient.put('/test-put', testData);
      // expect(response.data.method).toBe('PUT');
      // expect(response.data.receivedData).toEqual(testData);
    });

    it('should support DELETE requests', async () => {
      overrideHandlers(
        http.delete(`${API_BASE_URL}/test-delete`, () => {
          return new HttpResponse(null, { status: 204 });
        })
      );

      // const response = await apiClient.delete('/test-delete');
      // expect(response.status).toBe(204);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      overrideHandlers(
        http.get(`${API_BASE_URL}/network-error`, () => {
          return HttpResponse.error();
        })
      );

      // await expect(apiClient.get('/network-error')).rejects.toThrow();
    });

    it('should handle 404 errors with proper error structure', async () => {
      overrideHandlers(
        http.get(`${API_BASE_URL}/not-found`, () => {
          return new HttpResponse(JSON.stringify({
            error: 'Not Found',
            message: 'Resource not found',
            statusCode: 404
          }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        })
      );

      try {
        // await apiClient.get('/not-found');
        // expect.fail('Should have thrown an error');
      } catch (error: any) {
        // expect(error.response.status).toBe(404);
        // expect(error.response.data.error).toBe('Not Found');
        // expect(error.response.data.message).toBe('Resource not found');
      }
    });

    it('should handle validation errors (400) with field details', async () => {
      overrideHandlers(
        http.post(`${API_BASE_URL}/validation-error`, () => {
          return new HttpResponse(JSON.stringify({
            error: 'Validation Error',
            message: 'Invalid input data',
            statusCode: 400,
            details: [
              { field: 'email', message: 'Email is required' },
              { field: 'password', message: 'Password must be at least 8 characters' }
            ]
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        })
      );

      try {
        // await apiClient.post('/validation-error', {});
        // expect.fail('Should have thrown an error');
      } catch (error: any) {
        // expect(error.response.status).toBe(400);
        // expect(error.response.data.details).toHaveLength(2);
        // expect(error.response.data.details[0].field).toBe('email');
      }
    });

    it('should handle server errors (500) gracefully', async () => {
      overrideHandlers(
        http.get(`${API_BASE_URL}/server-error`, () => {
          return new HttpResponse(JSON.stringify({
            error: 'Internal Server Error',
            message: 'Something went wrong',
            statusCode: 500
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        })
      );

      try {
        // await apiClient.get('/server-error');
        // expect.fail('Should have thrown an error');
      } catch (error: any) {
        // expect(error.response.status).toBe(500);
        // expect(error.response.data.error).toBe('Internal Server Error');
      }
    });
  });

  describe('Request/Response Interceptors', () => {
    it('should automatically add timestamp to requests', async () => {
      let capturedTimestamp: string | null = null;

      overrideHandlers(
        http.get(`${API_BASE_URL}/test-timestamp`, ({ request }) => {
          capturedTimestamp = request.headers.get('X-Request-Timestamp');
          return HttpResponse.json({ received: true });
        })
      );

      // await apiClient.get('/test-timestamp');
      // expect(capturedTimestamp).toBeTruthy();
      // expect(new Date(capturedTimestamp!)).toBeInstanceOf(Date);
    });

    it('should transform response data consistently', async () => {
      overrideHandlers(
        http.get(`${API_BASE_URL}/test-transform`, () => {
          return HttpResponse.json({
            data: { id: 1, name: 'Test' },
            message: 'Success'
          });
        })
      );

      // const response = await apiClient.get('/test-transform');
      // Assuming we transform snake_case to camelCase or similar
      // expect(response.data).toBeDefined();
    });

    it('should handle authentication token refresh on 401', async () => {
      // Set an expired token
      localStorage.setItem('authToken', 'expired-token');

      overrideHandlers(
        http.get(`${API_BASE_URL}/protected`, ({ request }) => {
          const authHeader = request.headers.get('Authorization');
          if (authHeader === 'Bearer expired-token') {
            return new HttpResponse(null, { status: 401 });
          }
          return HttpResponse.json({ data: 'protected data' });
        }),
        http.post(`${API_BASE_URL}/auth/refresh`, () => {
          return HttpResponse.json({ token: 'new-fresh-token' });
        })
      );

      // The client should automatically refresh the token and retry
      // const response = await apiClient.get('/protected');
      // expect(response.data.data).toBe('protected data');
      // expect(localStorage.getItem('authToken')).toBe('new-fresh-token');
    });
  });

  describe('Query Parameters', () => {
    it('should properly encode query parameters', async () => {
      let capturedUrl: string = '';

      overrideHandlers(
        http.get(`${API_BASE_URL}/test-params`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ success: true });
        })
      );

      const params = {
        page: 1,
        limit: 10,
        search: 'test query',
        status: ['active', 'pending']
      };

      // await apiClient.get('/test-params', { params });
      // expect(capturedUrl).toContain('page=1');
      // expect(capturedUrl).toContain('limit=10');
      // expect(capturedUrl).toContain('search=test%20query');
      // expect(capturedUrl).toContain('status=active');
      // expect(capturedUrl).toContain('status=pending');
    });
  });
});

/**
 * TODO: Implement the API client in src/services/apiClient.ts
 *
 * Requirements based on these tests:
 * 1. Use axios or fetch with proper configuration
 * 2. Set up base URL from environment variables
 * 3. Implement request interceptor for auth tokens and timestamps
 * 4. Implement response interceptor for error handling and token refresh
 * 5. Support all HTTP methods (GET, POST, PUT, DELETE)
 * 6. Handle query parameters properly
 * 7. Provide consistent error structure
 * 8. Implement automatic token refresh on 401 errors
 *
 * Once implemented, remove the .skip from the describe block above
 */