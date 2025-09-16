/**
 * Analytics Test Configuration
 * Centralized configuration for analytics test suites
 */

export const AnalyticsTestConfig = {
  // Test timeouts for different test types
  timeouts: {
    unit: 5000,           // 5 seconds for unit tests
    integration: 30000,   // 30 seconds for integration tests
    performance: 60000,   // 60 seconds for performance tests
    largePerfomance: 300000, // 5 minutes for large performance tests
    edgeCase: 15000,      // 15 seconds for edge case tests
    security: 20000,      // 20 seconds for security tests
  },

  // Test data sizes for performance testing
  dataSizes: {
    small: 1000,
    medium: 10000,
    large: 50000,
    xlarge: 100000,
  },

  // Performance thresholds
  performance: {
    small: {
      maxExecutionTime: 1000,     // 1 second
      maxMemoryIncrease: 50_000_000,  // 50MB
      maxResultSize: 10000,
    },
    medium: {
      maxExecutionTime: 3000,     // 3 seconds
      maxMemoryIncrease: 100_000_000, // 100MB
      maxResultSize: 50000,
    },
    large: {
      maxExecutionTime: 10000,    // 10 seconds
      maxMemoryIncrease: 200_000_000, // 200MB
      maxResultSize: 100000,
    },
    xlarge: {
      maxExecutionTime: 30000,    // 30 seconds
      maxMemoryIncrease: 500_000_000, // 500MB
      maxResultSize: 500000,
    },
  },

  // Analytics endpoints to test
  endpoints: [
    {
      path: '/api/analytics/pipeline/status-distribution',
      method: 'GET',
      controller: 'getStatusDistribution',
      requiresAuth: true,
      category: 'pipeline',
    },
    {
      path: '/api/analytics/pipeline/trends',
      method: 'GET',
      controller: 'getPipelineTrends',
      requiresAuth: true,
      category: 'pipeline',
    },
    {
      path: '/api/analytics/pipeline/summary',
      method: 'GET',
      controller: 'getPipelineSummary',
      requiresAuth: true,
      category: 'pipeline',
    },
    {
      path: '/api/analytics/resumes/performance',
      method: 'GET',
      controller: 'getResumePerformance',
      requiresAuth: true,
      category: 'resume',
    },
    {
      path: '/api/analytics/resumes/usage',
      method: 'GET',
      controller: 'getResumeUsage',
      requiresAuth: true,
      category: 'resume',
    },
    {
      path: '/api/analytics/resumes/conversion-rates',
      method: 'GET',
      controller: 'getResumeConversionRates',
      requiresAuth: true,
      category: 'resume',
    },
    {
      path: '/api/analytics/timeline/response-times',
      method: 'GET',
      controller: 'getResponseTimes',
      requiresAuth: true,
      category: 'timeline',
    },
    {
      path: '/api/analytics/timeline/velocity',
      method: 'GET',
      controller: 'getApplicationVelocity',
      requiresAuth: true,
      category: 'timeline',
    },
    {
      path: '/api/analytics/conversion/overall',
      method: 'GET',
      controller: 'getOverallConversion',
      requiresAuth: true,
      category: 'conversion',
    },
    {
      path: '/api/analytics/conversion/by-period',
      method: 'GET',
      controller: 'getConversionByPeriod',
      requiresAuth: true,
      category: 'conversion',
    },
  ],

  // Test user profiles for different scenarios
  testUsers: {
    basicUser: {
      email: 'basic-user@example.com',
      firstName: 'Basic',
      lastName: 'User',
      role: 'user',
    },
    premiumUser: {
      email: 'premium-user@example.com',
      firstName: 'Premium',
      lastName: 'User',
      role: 'premium',
    },
    adminUser: {
      email: 'admin-user@example.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    },
  },

  // Security test scenarios
  security: {
    invalidUserIds: [
      'not-a-uuid',
      '123',
      '',
      'invalid-uuid-format',
      '12345678-1234-1234-1234-123456789012-extra',
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      null,
      undefined,
    ],
    xssAttempts: [
      '<script>alert("xss")</script>',
      'javascript:alert(1)',
      'onload="alert(1)"',
      '{{constructor.constructor("alert(1)")()}}',
      '${alert(1)}',
    ],
    sqlInjectionAttempts: [
      "'; DROP TABLE job_applications; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM resumes --",
      "admin' OR '1'='1' --",
      "'; SELECT * FROM job_applications WHERE user_id != '",
    ],
  },

  // Edge case scenarios
  edgeCases: {
    emptyDatasets: [
      'user with no applications',
      'user with no resumes',
      'applications with no resumes',
      'resumes with no applications',
    ],
    singleDataPoints: [
      'only one application',
      'only one resume',
      'only one status',
      'only one time period',
    ],
    extremeValues: [
      'very old dates (1900)',
      'future dates (2030)',
      'very long text fields (10KB)',
      'zero values in calculations',
      'division by zero scenarios',
    ],
    dataInconsistencies: [
      'orphaned relationships',
      'circular dependencies',
      'duplicate entries',
      'missing required fields',
    ],
  },

  // Database test configuration
  database: {
    // Connection pool settings for testing
    pool: {
      min: 1,
      max: 10,
      acquireTimeoutMillis: 60000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100,
    },

    // Test database cleanup settings
    cleanup: {
      batchSize: 1000,
      maxRetries: 3,
      retryDelay: 1000,
    },
  },

  // Logging configuration for tests
  logging: {
    level: process.env.NODE_ENV === 'test' ? 'error' : 'debug',
    enableSql: process.env.DEBUG_SQL === 'true',
    enablePerformanceMetrics: process.env.ENABLE_PERF_METRICS === 'true',
  },
}

/**
 * Test environment utilities
 */
export class AnalyticsTestEnvironment {
  /**
   * Check if large performance tests should be run
   */
  static shouldRunLargeTests(): boolean {
    return (
      process.env.NODE_ENV === 'ci' ||
      process.env.RUN_LARGE_TESTS === 'true' ||
      process.env.CI === 'true'
    )
  }

  /**
   * Check if performance monitoring is enabled
   */
  static isPerformanceMonitoringEnabled(): boolean {
    return process.env.ENABLE_PERF_MONITORING === 'true'
  }

  /**
   * Get test timeout based on test type
   */
  static getTimeout(testType: keyof typeof AnalyticsTestConfig.timeouts): number {
    return AnalyticsTestConfig.timeouts[testType]
  }

  /**
   * Get performance threshold based on dataset size
   */
  static getPerformanceThreshold(size: keyof typeof AnalyticsTestConfig.performance) {
    return AnalyticsTestConfig.performance[size]
  }

  /**
   * Check if test database is properly configured
   */
  static validateTestEnvironment(): void {
    const requiredEnvVars = [
      'NODE_ENV',
      'DATABASE_URL',
    ]

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot run tests in production environment')
    }
  }
}

/**
 * Test data size calculator
 */
export class TestDataSizeCalculator {
  /**
   * Calculate memory footprint of test data
   */
  static estimateMemoryUsage(recordCount: number, recordType: 'application' | 'resume' | 'contact'): number {
    const bytesPerRecord = {
      application: 1024,  // ~1KB per application
      resume: 2048,       // ~2KB per resume
      contact: 512,       // ~512B per contact
    }

    return recordCount * bytesPerRecord[recordType]
  }

  /**
   * Calculate recommended test timeout based on data size
   */
  static calculateTimeout(recordCount: number): number {
    const baseTimeout = 5000 // 5 seconds base
    const additionalTimePerK = 100 // 100ms per 1000 records

    return baseTimeout + Math.floor(recordCount / 1000) * additionalTimePerK
  }

  /**
   * Get optimal batch size for database operations
   */
  static getOptimalBatchSize(totalRecords: number): number {
    if (totalRecords < 1000) return 100
    if (totalRecords < 10000) return 500
    if (totalRecords < 50000) return 1000
    return 2000
  }
}

export default AnalyticsTestConfig