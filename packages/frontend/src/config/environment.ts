/**
 * Environment configuration for the Job Tracker application
 * Provides type-safe access to environment variables and application settings
 */

// ============================================================================
// ENVIRONMENT TYPES
// ============================================================================

export type Environment = 'development' | 'test' | 'production';

export interface AppConfig {
  environment: Environment;
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
  };
  features: {
    enableDevTools: boolean;
    enableAnalytics: boolean;
    enableMockData: boolean;
  };
  upload: {
    maxFileSize: number; // in bytes
    allowedFileTypes: string[];
    maxFiles: number;
  };
  pagination: {
    defaultPageSize: number;
    maxPageSize: number;
  };
}

// ============================================================================
// ENVIRONMENT VARIABLE GETTERS
// ============================================================================

const getEnvVar = (name: string, defaultValue?: string): string => {
  const value = import.meta.env[name] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const getEnvNumber = (name: string, defaultValue: number): number => {
  const value = import.meta.env[name];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid number for environment variable ${name}: ${value}`);
  }
  return parsed;
};

const getEnvBoolean = (name: string, defaultValue: boolean): boolean => {
  const value = import.meta.env[name];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

// ============================================================================
// CONFIGURATION
// ============================================================================

const environment = (import.meta.env['VITE_NODE_ENV'] || 'development') as Environment;

const config: AppConfig = {
  environment,

  api: {
    baseUrl: getEnvVar('VITE_API_BASE_URL', 'http://localhost:3001/api'),
    timeout: getEnvNumber('VITE_API_TIMEOUT', 10000), // 10 seconds
    retries: getEnvNumber('VITE_API_RETRIES', 3),
  },

  features: {
    enableDevTools: getEnvBoolean('VITE_ENABLE_DEV_TOOLS', environment === 'development'),
    enableAnalytics: getEnvBoolean('VITE_ENABLE_ANALYTICS', environment === 'production'),
    enableMockData: getEnvBoolean('VITE_ENABLE_MOCK_DATA', environment === 'development'),
  },

  upload: {
    maxFileSize: getEnvNumber('VITE_MAX_FILE_SIZE', 10 * 1024 * 1024), // 10MB
    allowedFileTypes: ['.pdf', '.doc', '.docx', '.txt'],
    maxFiles: getEnvNumber('VITE_MAX_FILES', 5),
  },

  pagination: {
    defaultPageSize: getEnvNumber('VITE_DEFAULT_PAGE_SIZE', 20),
    maxPageSize: getEnvNumber('VITE_MAX_PAGE_SIZE', 100),
  },
};

// ============================================================================
// VALIDATION
// ============================================================================

const validateConfig = (config: AppConfig): void => {
  // Validate API base URL format
  try {
    new URL(config.api.baseUrl);
  } catch {
    throw new Error(`Invalid API base URL: ${config.api.baseUrl}`);
  }

  // Validate timeout is positive
  if (config.api.timeout <= 0) {
    throw new Error(`API timeout must be positive: ${config.api.timeout}`);
  }

  // Validate retries is non-negative
  if (config.api.retries < 0) {
    throw new Error(`API retries must be non-negative: ${config.api.retries}`);
  }

  // Validate file size is positive
  if (config.upload.maxFileSize <= 0) {
    throw new Error(`Max file size must be positive: ${config.upload.maxFileSize}`);
  }

  // Validate page sizes
  if (config.pagination.defaultPageSize <= 0 || config.pagination.maxPageSize <= 0) {
    throw new Error('Page sizes must be positive');
  }

  if (config.pagination.defaultPageSize > config.pagination.maxPageSize) {
    throw new Error('Default page size cannot exceed max page size');
  }
};

// Validate configuration on module load
validateConfig(config);

// ============================================================================
// EXPORTS
// ============================================================================

export { config };

// Helper functions for common use cases
export const isProduction = () => config.environment === 'production';
export const isDevelopment = () => config.environment === 'development';
export const isTest = () => config.environment === 'test';

// API configuration helpers
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = config.api.baseUrl.endsWith('/')
    ? config.api.baseUrl.slice(0, -1)
    : config.api.baseUrl;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

// File upload helpers
export const isValidFileType = (fileName: string): boolean => {
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return config.upload.allowedFileTypes.includes(extension);
};

export const isValidFileSize = (fileSize: number): boolean => {
  return fileSize <= config.upload.maxFileSize;
};

// Pagination helpers
export const getValidPageSize = (requestedSize?: number): number => {
  if (!requestedSize) return config.pagination.defaultPageSize;
  return Math.min(requestedSize, config.pagination.maxPageSize);
};

// Debug helper
export const getConfigSnapshot = (): AppConfig => {
  return JSON.parse(JSON.stringify(config));
};