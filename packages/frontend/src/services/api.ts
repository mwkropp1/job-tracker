import type { User, ApiResponse } from '@/types';

// Mock API service for demonstration
export const apiService = {
  getUser: async (): Promise<ApiResponse<User>> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      data: {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
      },
      message: 'User fetched successfully',
      success: true,
    };
  },

  getWelcomeMessage: async (): Promise<ApiResponse<string>> => {
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      data: 'Welcome to Job Tracker! 🚀',
      message: 'Welcome message fetched',
      success: true,
    };
  },
};