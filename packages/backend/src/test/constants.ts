/**
 * Test constants and configuration values
 * Centralized location for test-related constants to improve maintainability
 */

export const TEST_CONSTANTS = {
  // Database configuration
  DATABASE: {
    TIMEOUT: 10_000,
    MAX_RETRY_ATTEMPTS: 3,
    CLEANUP_ORDER: ['Resume', 'JobApplication', 'Contact', 'User'] as const,
  },

  // Authentication test values
  AUTH: {
    VALID_EMAIL: 'test@example.com',
    VALID_PASSWORD: 'testPassword123',
    HASHED_PASSWORD: '$2b$10$hashed.password.here',
    JWT_SECRET: 'test-jwt-secret-key-for-testing-only',
    JWT_EXPIRES_IN: '1h',
    BCRYPT_ROUNDS: 10,
  },

  // File upload test values
  FILE_UPLOAD: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_MIME_TYPES: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ] as const,
    TEST_FILE_SIZE: 1_024_000, // 1MB
  },

  // Test timeouts
  TIMEOUTS: {
    DEFAULT: 10_000,
    INTEGRATION: 30_000,
    DATABASE_OPERATION: 5_000,
  },

  // Mock data templates
  MOCK_DATA: {
    USER: {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
    },
    JOB_APPLICATION: {
      company: 'Test Company Inc',
      jobTitle: 'Software Engineer',
      location: 'Remote',
      salary: 100_000,
    },
    CONTACT: {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@company.com',
      company: 'Test Company Inc',
      jobTitle: 'Engineering Manager',
    },
    RESUME: {
      fileName: 'test_resume.pdf',
      originalName: 'Test_Resume.pdf',
      filePath: '/uploads/test_resume.pdf',
      fileSize: 1_024_000,
      mimeType: 'application/pdf',
    },
  },
} as const;

export type TestConstantKeys = keyof typeof TEST_CONSTANTS;
export type DatabaseCleanupEntity = typeof TEST_CONSTANTS.DATABASE.CLEANUP_ORDER[number];
export type AllowedMimeType = typeof TEST_CONSTANTS.FILE_UPLOAD.ALLOWED_MIME_TYPES[number];