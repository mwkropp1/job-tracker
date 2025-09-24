/**
 * Type-safe HTTP client for Job Tracker API
 * Provides centralized API communication with error handling, retries, and type safety
 */

import { config, getApiUrl } from '@/config/environment';
import type { ApiResponse, ApiError } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

export interface RequestConfig extends RequestInit {
  timeout?: number;
  retries?: number;
  skipAuth?: boolean;
}

export interface ApiClientConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  headers?: Record<string, string>;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public field?: string,
    public timestamp?: string
  ) {
    super(message);
    this.name = 'ApiClientError';
  }

  static fromApiError(error: ApiError, status?: number): ApiClientError {
    return new ApiClientError(
      error.message,
      status,
      error.code,
      error.field,
      error.timestamp
    );
  }
}

export class NetworkError extends ApiClientError {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends ApiClientError {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

// ============================================================================
// API CLIENT CLASS
// ============================================================================

class ApiClient {
  private readonly config: ApiClientConfig;
  private authToken: string | null = null;

  constructor(config: ApiClientConfig) {
    this.config = config;
  }

  // ========================================
  // AUTHENTICATION
  // ========================================

  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  getAuthToken(): string | null {
    return this.authToken;
  }

  // ========================================
  // PRIVATE HELPERS
  // ========================================

  private getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers,
      ...customHeaders,
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      timeout = this.config.timeout,
      retries = this.config.retries,
      skipAuth = false,
      ...fetchOptions
    } = options;

    const url = getApiUrl(endpoint);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const headers = this.getHeaders(fetchOptions.headers as Record<string, string>);
    if (skipAuth) {
      delete headers['Authorization'];
    }

    const requestOptions: RequestInit = {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    };

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, requestOptions);
        clearTimeout(timeoutId);

        // Handle different response statuses
        if (response.ok) {
          const data = await response.json();
          return this.validateApiResponse<T>(data);
        }

        // Handle API errors
        await this.handleErrorResponse(response);
        return this.handleError(); // TypeScript needs this for never return type
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (
          error instanceof ApiClientError ||
          error instanceof TimeoutError ||
          (error as Error).name === 'AbortError'
        ) {
          clearTimeout(timeoutId);

          if ((error as Error).name === 'AbortError') {
            throw new TimeoutError(`Request timeout after ${timeout}ms`);
          }

          throw error;
        }

        // Retry on network errors
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff
          await this.delay(delay);
        }
      }
    }

    clearTimeout(timeoutId);
    throw new NetworkError(`Request failed after ${retries + 1} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  private validateApiResponse<T>(data: unknown): ApiResponse<T> {
    if (typeof data !== 'object' || data === null) {
      throw new ApiClientError('Invalid response format');
    }

    if (!('success' in data) || !('message' in data) || !('data' in data)) {
      throw new ApiClientError('Missing required response fields');
    }

    return data as ApiResponse<T>;
  }

  private async handleErrorResponse(response: Response): Promise<void> {
    let errorData: unknown;

    try {
      errorData = await response.json();
    } catch {
      throw new ApiClientError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status
      );
    }

    // Handle structured API errors
    if (typeof errorData === 'object' && errorData !== null && 'error' in errorData) {
      throw ApiClientError.fromApiError(errorData.error as ApiError, response.status);
    }

    // Handle simple error responses
    if (typeof errorData === 'object' && errorData !== null && 'message' in errorData) {
      throw new ApiClientError((errorData as { message: string }).message, response.status);
    }

    // Fallback for unknown error formats
    throw new ApiClientError(
      `HTTP ${response.status}: ${response.statusText}`,
      response.status
    );
  }

  private handleError(): never {
    // This method will never return
    throw new Error('This should never be reached');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ========================================
  // PUBLIC HTTP METHODS
  // ========================================

  async get<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'GET',
      ...config,
    });
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : null,
      ...config,
    });
  }

  async put<T>(
    endpoint: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : null,
      ...config,
    });
  }

  async patch<T>(
    endpoint: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : null,
      ...config,
    });
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'DELETE',
      ...config,
    });
  }

  // ========================================
  // FILE UPLOAD
  // ========================================

  async upload<T>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, string>,
    config?: Omit<RequestConfig, 'body'>
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const {
      timeout = this.config.timeout,
      skipAuth = false,
      headers: customHeaders,
      ...fetchOptions
    } = config || {};

    const url = getApiUrl(endpoint);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const headers = this.getHeaders();
    delete headers['Content-Type']; // Let browser set multipart boundary

    if (customHeaders) {
      Object.assign(headers, customHeaders);
    }

    if (skipAuth) {
      delete headers['Authorization'];
    }

    const requestOptions: RequestInit = {
      method: 'POST',
      body: formData,
      headers,
      signal: controller.signal,
      ...fetchOptions,
    };

    try {
      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return this.validateApiResponse<T>(data);
      }

      await this.handleErrorResponse(response);
      return this.handleError(); // TypeScript needs this for never return type
    } catch (error) {
      clearTimeout(timeoutId);

      if ((error as Error).name === 'AbortError') {
        throw new TimeoutError(`Upload timeout after ${timeout}ms`);
      }

      throw error;
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  buildQueryString(params: Record<string, unknown>): string {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  // ========================================
  // TEST API METHODS (TDD Implementation)
  // ========================================

  async getUser(): Promise<{ data: { id: string; name: string; email: string }; message: string; success: boolean }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: {
            id: '1',
            name: 'John Doe',
            email: 'john@example.com',
          },
          message: 'User fetched successfully',
          success: true,
        });
      }, 1000);
    });
  }

  async getWelcomeMessage(): Promise<{ data: string; message: string; success: boolean }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: 'Welcome to Job Tracker! 🚀',
          message: 'Welcome message fetched',
          success: true,
        });
      }, 500);
    });
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const apiClient = new ApiClient({
  baseUrl: config.api.baseUrl,
  timeout: config.api.timeout,
  retries: config.api.retries,
});

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export const {
  get,
  post,
  put,
  patch,
  delete: del,
  upload,
  setAuthToken,
  getAuthToken,
  buildQueryString,
  isOnline,
  getUser,
  getWelcomeMessage,
} = apiClient;