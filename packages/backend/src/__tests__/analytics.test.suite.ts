/**
 * Analytics Test Suite Runner
 * Comprehensive test suite orchestrator for Job Application Analytics API
 *
 * This file serves as the main entry point for running all analytics tests
 * and provides utilities for test organization and reporting.
 */

import { AnalyticsTestConfig, AnalyticsTestEnvironment } from './analytics.test.config'

/**
 * Test Suite Registry
 * Defines all test suites and their execution order
 */
export const AnalyticsTestSuites = {
  // Unit Tests - Fast, isolated tests with mocked dependencies
  unit: {
    name: 'Analytics Service Unit Tests',
    description: 'Tests analytics service methods with mocked repositories',
    files: [
      './services/AnalyticsService.test.ts',
    ],
    timeout: AnalyticsTestConfig.timeouts.unit,
    parallel: true,
    order: 1,
  },

  // Integration Tests - Test full API endpoints with real database
  integration: {
    name: 'Analytics Controller Integration Tests',
    description: 'Tests full API endpoints with test database operations',
    files: [
      './controllers/AnalyticsController.test.ts',
    ],
    timeout: AnalyticsTestConfig.timeouts.integration,
    parallel: false, // Database operations need isolation
    order: 2,
  },


  // Security Tests - Authentication, authorization, and vulnerability testing
  security: {
    name: 'Analytics Security and Authorization',
    description: 'Tests authentication, authorization, data isolation, and security vulnerabilities',
    files: [
      './security/AnalyticsSecurity.test.ts',
    ],
    timeout: AnalyticsTestConfig.timeouts.security,
    parallel: false,
    order: 4,
  },

  // Performance Tests - Scalability and optimization testing
  performance: {
    name: 'Analytics Performance Tests',
    description: 'Tests scalability, query optimization, and resource utilization with large datasets',
    files: [
      './performance/AnalyticsPerformance.test.ts',
    ],
    timeout: AnalyticsTestConfig.timeouts.performance,
    parallel: false,
    order: 5,
    skipCondition: () => !AnalyticsTestEnvironment.shouldRunLargeTests(),
  },
}

/**
 * Test Coverage Requirements
 * Defines minimum coverage requirements for analytics code
 */
export const CoverageRequirements = {
  global: {
    branches: 85,
    functions: 90,
    lines: 90,
    statements: 90,
  },
  analyticsService: {
    branches: 95,
    functions: 100,
    lines: 95,
    statements: 95,
  },
  analyticsController: {
    branches: 90,
    functions: 95,
    lines: 90,
    statements: 90,
  },
}

/**
 * Test Execution Strategy
 * Defines how tests should be executed in different environments
 */
export const TestExecutionStrategy = {
  development: {
    suites: ['unit', 'integration'],
    parallel: true,
    coverage: true,
    verbose: true,
  },
  ci: {
    suites: ['unit', 'integration', 'security', 'performance'],
    parallel: false,
    coverage: true,
    verbose: false,
    failFast: true,
  },
  production: {
    suites: [], // No tests should run in production
    parallel: false,
    coverage: false,
    verbose: false,
  },
}

/**
 * Test Utilities for Analytics Test Suite
 */
export class AnalyticsTestUtils {
  /**
   * Get test execution plan based on environment
   */
  static getExecutionPlan(): typeof TestExecutionStrategy[keyof typeof TestExecutionStrategy] {
    const env = process.env.NODE_ENV || 'development'

    if (env === 'production') {
      throw new Error('Tests should not be run in production environment')
    }

    if (process.env.CI === 'true' || env === 'ci') {
      return TestExecutionStrategy.ci
    }

    return TestExecutionStrategy.development
  }

  /**
   * Validate test environment setup
   */
  static validateEnvironment(): void {
    try {
      AnalyticsTestEnvironment.validateTestEnvironment()
      console.log('✓ Test environment validation passed')
    } catch (error) {
      console.error('✗ Test environment validation failed:', error.message)
      process.exit(1)
    }
  }

  /**
   * Get test suites to run based on execution plan
   */
  static getSuitesToRun(): Array<keyof typeof AnalyticsTestSuites> {
    const plan = this.getExecutionPlan()
    return plan.suites.filter(suiteName => {
      const suite = AnalyticsTestSuites[suiteName as keyof typeof AnalyticsTestSuites]
      return !suite.skipCondition || !suite.skipCondition()
    }) as Array<keyof typeof AnalyticsTestSuites>
  }

  /**
   * Generate Jest configuration for analytics tests
   */
  static generateJestConfig() {
    const plan = this.getExecutionPlan()
    const suitesToRun = this.getSuitesToRun()

    return {
      displayName: 'Analytics API Tests',
      testMatch: suitesToRun.flatMap(suiteName =>
        AnalyticsTestSuites[suiteName].files.map(file =>
          `<rootDir>/src/__tests__/${file}`
        )
      ),
      setupFilesAfterEnv: [
        '<rootDir>/src/test/setup.ts',
        '<rootDir>/src/__tests__/analytics.test.config.ts',
      ],
      testTimeout: Math.max(...suitesToRun.map(suiteName =>
        AnalyticsTestSuites[suiteName].timeout
      )),
      maxWorkers: plan.parallel ? '50%' : 1,
      collectCoverage: plan.coverage,
      collectCoverageFrom: [
        'src/services/AnalyticsService.ts',
        'src/controllers/AnalyticsController.ts',
        'src/routes/analytics.ts',
      ],
      coverageThreshold: {
        global: CoverageRequirements.global,
        'src/services/AnalyticsService.ts': CoverageRequirements.analyticsService,
        'src/controllers/AnalyticsController.ts': CoverageRequirements.analyticsController,
      },
      verbose: plan.verbose,
      bail: plan.failFast ? 1 : false,
    }
  }

  /**
   * Print test suite information
   */
  static printTestInfo(): void {
    const plan = this.getExecutionPlan()
    const suitesToRun = this.getSuitesToRun()

    console.log('\n📊 Analytics API Test Suite')
    console.log('=' .repeat(50))
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
    console.log(`Execution Strategy: ${plan.parallel ? 'Parallel' : 'Sequential'}`)
    console.log(`Coverage Collection: ${plan.coverage ? 'Enabled' : 'Disabled'}`)
    console.log(`Large Performance Tests: ${AnalyticsTestEnvironment.shouldRunLargeTests() ? 'Enabled' : 'Skipped'}`)

    console.log('\n🧪 Test Suites to Run:')
    suitesToRun.forEach((suiteName, index) => {
      const suite = AnalyticsTestSuites[suiteName]
      console.log(`  ${index + 1}. ${suite.name}`)
      console.log(`     ${suite.description}`)
      console.log(`     Timeout: ${suite.timeout}ms`)
      console.log(`     Files: ${suite.files.length}`)
    })

    console.log('\n📈 Coverage Requirements:')
    Object.entries(CoverageRequirements.global).forEach(([metric, threshold]) => {
      console.log(`  ${metric}: ${threshold}%`)
    })

    console.log('\n🎯 Analytics Endpoints Under Test:')
    AnalyticsTestConfig.endpoints.forEach(endpoint => {
      console.log(`  ${endpoint.method} ${endpoint.path}`)
    })

    console.log('\n' + '='.repeat(50))
  }

  /**
   * Create test summary report
   */
  static createTestReport(results: any): void {
    console.log('\n📋 Analytics Test Suite Results')
    console.log('=' .repeat(50))

    if (results.success) {
      console.log('✅ All tests passed!')
    } else {
      console.log('❌ Some tests failed.')
    }

    console.log(`\nTest Execution Summary:`)
    console.log(`  Total Tests: ${results.numTotalTests}`)
    console.log(`  Passed: ${results.numPassedTests}`)
    console.log(`  Failed: ${results.numFailedTests}`)
    console.log(`  Skipped: ${results.numPendingTests}`)
    console.log(`  Total Time: ${results.testResults?.[0]?.perfStats?.end - results.testResults?.[0]?.perfStats?.start}ms`)

    if (results.coverageMap) {
      console.log(`\nCoverage Summary:`)
      console.log(`  Lines: ${results.coverageMap.getCoverageSummary().lines.pct}%`)
      console.log(`  Functions: ${results.coverageMap.getCoverageSummary().functions.pct}%`)
      console.log(`  Branches: ${results.coverageMap.getCoverageSummary().branches.pct}%`)
      console.log(`  Statements: ${results.coverageMap.getCoverageSummary().statements.pct}%`)
    }

    console.log('\n' + '='.repeat(50))
  }
}

/**
 * Test Data Management
 */
export class AnalyticsTestDataManager {
  /**
   * Estimate test data requirements
   */
  static estimateDataRequirements() {
    const requirements = {
      users: 5, // Multiple test users for isolation testing
      applications: {
        small: AnalyticsTestConfig.dataSizes.small,
        medium: AnalyticsTestConfig.dataSizes.medium,
        large: AnalyticsTestConfig.dataSizes.large,
      },
      resumes: {
        perUser: 5, // Average resumes per user
      },
      contacts: {
        perUser: 10, // Average contacts per user
      },
    }

    return requirements
  }

  /**
   * Calculate estimated test execution time
   */
  static estimateExecutionTime(): number {
    const suitesToRun = AnalyticsTestUtils.getSuitesToRun()

    const estimatedTimes = {
      unit: 30000,        // 30 seconds
      integration: 120000, // 2 minutes
      security: 240000,    // 4 minutes
      performance: 1800000, // 30 minutes
    }

    const totalTime = suitesToRun.reduce((total, suiteName) => {
      return total + (estimatedTimes[suiteName] || 60000)
    }, 0)

    return totalTime
  }

  /**
   * Check system requirements for tests
   */
  static checkSystemRequirements(): boolean {
    const requirements = {
      minMemory: 2 * 1024 * 1024 * 1024, // 2GB
      minDiskSpace: 1 * 1024 * 1024 * 1024, // 1GB
    }

    const memoryUsage = process.memoryUsage()
    const freeMemory = process.platform === 'linux'
      ? require('os').freemem()
      : 4 * 1024 * 1024 * 1024 // Assume 4GB on other platforms

    if (freeMemory < requirements.minMemory) {
      console.warn(`⚠️  Low memory detected. Required: ${requirements.minMemory / (1024*1024*1024)}GB, Available: ${freeMemory / (1024*1024*1024)}GB`)
      return false
    }

    return true
  }
}

// Export test runner entry point
export function runAnalyticsTests(): void {
  console.log('🚀 Starting Analytics API Test Suite...\n')

  // Validate environment
  AnalyticsTestUtils.validateEnvironment()

  // Check system requirements
  if (!AnalyticsTestDataManager.checkSystemRequirements()) {
    console.error('❌ System requirements not met')
    process.exit(1)
  }

  // Print test information
  AnalyticsTestUtils.printTestInfo()

  // Estimate execution time
  const estimatedTime = AnalyticsTestDataManager.estimateExecutionTime()
  console.log(`\n⏱️  Estimated execution time: ${Math.round(estimatedTime / 1000 / 60)} minutes`)

  console.log('\n▶️  Running tests...\n')
}

export default {
  AnalyticsTestSuites,
  CoverageRequirements,
  TestExecutionStrategy,
  AnalyticsTestUtils,
  AnalyticsTestDataManager,
  runAnalyticsTests,
}