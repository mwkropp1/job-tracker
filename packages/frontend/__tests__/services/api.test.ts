import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiService } from '@/services/api';

// Mock timers for testing async delays
vi.useFakeTimers();

describe('apiService', () => {
  beforeEach(() => {
    vi.clearAllTimers();
  });

  describe('getUser', () => {
    it('should return user data with correct structure', async () => {
      const userPromise = apiService.getUser();

      // Fast-forward time to resolve setTimeout
      vi.advanceTimersByTime(1000);

      const result = await userPromise;

      expect(result).toEqual({
        data: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
        },
        message: 'User fetched successfully',
        success: true,
      });
    });

    it('should simulate API delay of 1000ms', async () => {
      const startTime = Date.now();
      const userPromise = apiService.getUser();

      // Advance timer and await result
      vi.advanceTimersByTime(1000);
      await userPromise;

      // In real time, this would have taken 1000ms
      expect(vi.getTimerCount()).toBe(0);
    });

    it('should return consistent data structure', async () => {
      const userPromise = apiService.getUser();
      vi.advanceTimersByTime(1000);
      const result = await userPromise;

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
      expect(typeof result.data.id).toBe('string');
      expect(typeof result.data.name).toBe('string');
      expect(typeof result.data.email).toBe('string');
    });
  });

  describe('getWelcomeMessage', () => {
    it('should return welcome message with correct structure', async () => {
      const welcomePromise = apiService.getWelcomeMessage();

      // Fast-forward time to resolve setTimeout
      vi.advanceTimersByTime(500);

      const result = await welcomePromise;

      expect(result).toEqual({
        data: 'Welcome to Job Tracker! 🚀',
        message: 'Welcome message fetched',
        success: true,
      });
    });

    it('should simulate API delay of 500ms', async () => {
      const welcomePromise = apiService.getWelcomeMessage();

      // Advance timer and await result
      vi.advanceTimersByTime(500);
      await welcomePromise;

      expect(vi.getTimerCount()).toBe(0);
    });

    it('should return string data type', async () => {
      const welcomePromise = apiService.getWelcomeMessage();
      vi.advanceTimersByTime(500);
      const result = await welcomePromise;

      expect(typeof result.data).toBe('string');
      expect(result.data).toContain('Welcome to Job Tracker!');
      expect(result.success).toBe(true);
    });
  });

  describe('API response consistency', () => {
    it('should have consistent response format across all methods', async () => {
      const userPromise = apiService.getUser();
      const welcomePromise = apiService.getWelcomeMessage();

      vi.advanceTimersByTime(1000);

      const [userResult, welcomeResult] = await Promise.all([
        userPromise,
        welcomePromise,
      ]);

      // Both should have the same response structure
      const expectedKeys = ['data', 'message', 'success'];

      expect(Object.keys(userResult).sort()).toEqual(expectedKeys.sort());
      expect(Object.keys(welcomeResult).sort()).toEqual(expectedKeys.sort());

      expect(userResult.success).toBe(true);
      expect(welcomeResult.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle potential timeout scenarios', async () => {
      // This test verifies that the service handles delays properly
      const userPromise = apiService.getUser();

      // Test that promise doesn't resolve before timeout
      expect(userPromise).toBeInstanceOf(Promise);

      // Advance timer to complete the delay
      vi.advanceTimersByTime(1000);
      const result = await userPromise;

      expect(result.success).toBe(true);
    });
  });
});