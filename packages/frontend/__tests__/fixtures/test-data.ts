// Test fixtures and mock data for consistent testing

export const mockUser = {
  id: 1,
  name: 'John Doe',
  email: 'john.doe@example.com',
  role: 'user' as const,
};

export const mockAdminUser = {
  id: 2,
  name: 'Jane Admin',
  email: 'jane.admin@example.com',
  role: 'admin' as const,
};

// Add more test fixtures as your application grows
export const mockApiResponse = {
  success: true,
  data: mockUser,
  message: 'Operation successful',
};

export const mockErrorResponse = {
  success: false,
  error: 'Something went wrong',
  message: 'An error occurred',
};