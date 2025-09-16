/**
 * Performance tests for Analytics API with large datasets
 * Tests scalability, query optimization, and resource utilization
 */

import type { DataSource } from 'typeorm'

import { AnalyticsService } from '../../services/AnalyticsService'
import { AnalyticsController } from '../../controllers/AnalyticsController'
import { JobApplication, JobApplicationStatus } from '../../entities/JobApplication'
import { Resume, ResumeSource } from '../../entities/Resume'
import { User } from '../../entities/User'
import { Contact } from '../../entities/Contact'
import { JobApplicationContact, InteractionType } from '../../entities/JobApplicationContact'
import {
  initializeTestDatabase,
  closeTestDatabase,
  cleanupTestDatabase,
} from '../../test/testDatabase'
import { TestDataFactory, MockExpressUtils } from '../../test'
import { AnalyticsTestFixtures, AnalyticsTestSeeder } from '../../test/analyticsTestFixtures'

interface PerformanceMetrics {
  executionTime: number
  memoryUsage: {
    before: NodeJS.MemoryUsage
    after: NodeJS.MemoryUsage
    peak: number
  }
  databaseQueries?: number
  resultSize: number
}

interface PerformanceThresholds {
  maxExecutionTime: number // milliseconds
  maxMemoryIncrease: number // bytes
  maxResultSize: number // number of records or bytes
}

describe('Analytics Performance Tests', () => {
  let dataSource: DataSource
  let analyticsService: AnalyticsService
  let analyticsController: AnalyticsController
  let performanceUser: User

  // Performance thresholds
  const THRESHOLDS = {
    small: { maxExecutionTime: 1000, maxMemoryIncrease: 50_000_000, maxResultSize: 10000 },
    medium: { maxExecutionTime: 3000, maxMemoryIncrease: 100_000_000, maxResultSize: 50000 },
    large: { maxExecutionTime: 10000, maxMemoryIncrease: 200_000_000, maxResultSize: 100000 },
    xlarge: { maxExecutionTime: 30000, maxMemoryIncrease: 500_000_000, maxResultSize: 500000 },
  }

  beforeAll(async () => {
    dataSource = await initializeTestDatabase()
    analyticsService = new AnalyticsService(dataSource)
    analyticsController = new AnalyticsController()
  }, 60000) // 60 second timeout for setup

  afterAll(async () => {
    await closeTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()

    // Create performance test user
    const userRepository = dataSource.getRepository(User)
    performanceUser = await userRepository.save(
      TestDataFactory.createMockUser({
        email: 'performance-test@example.com',
        firstName: 'Performance',
        lastName: 'TestUser',
      })
    )
  })

  describe('Scalability Tests', () => {
    describe('Small Dataset Performance (1K applications)', () => {
      let dataset: any

      beforeEach(async () => {
        // Create 1,000 applications with realistic distribution
        dataset = await createPerformanceDataset(1000)
      }, 30000)

      afterEach(async () => {
        await cleanupPerformanceData(dataset.user.id)
      })

      it('should handle status distribution query efficiently', async () => {
        const metrics = await measurePerformance(async () => {
          return await analyticsService.getStatusDistribution(dataset.user.id)
        })

        assertPerformance(metrics, THRESHOLDS.small)
        expect(metrics.resultSize).toBeGreaterThan(0)
      })

      it('should handle pipeline trends query efficiently', async () => {
        const metrics = await measurePerformance(async () => {
          return await analyticsService.getPipelineTrends(dataset.user.id, {
            startDate: new Date('2023-01-01'),
            endDate: new Date('2024-12-31'),
          })
        })

        assertPerformance(metrics, THRESHOLDS.small)
        expect(metrics.resultSize).toBeGreaterThan(0)
      })

      it('should handle complex resume performance analysis efficiently', async () => {
        const metrics = await measurePerformance(async () => {
          return await analyticsService.getResumePerformance(dataset.user.id)
        })

        assertPerformance(metrics, THRESHOLDS.small)
      })
    })

    describe('Medium Dataset Performance (10K applications)', () => {
      let dataset: any

      beforeEach(async () => {
        dataset = await createPerformanceDataset(10000)
      }, 120000) // 2 minute timeout for 10K records

      afterEach(async () => {
        await cleanupPerformanceData(dataset.user.id)
      })

      it('should maintain performance with 10K applications', async () => {
        const metrics = await measurePerformance(async () => {
          return await analyticsService.getStatusDistribution(dataset.user.id)
        })

        assertPerformance(metrics, THRESHOLDS.medium)
        expect(metrics.resultSize).toBeGreaterThan(0)
      })

      it('should handle complex aggregations efficiently', async () => {
        const metrics = await measurePerformance(async () => {
          return await analyticsService.getPipelineSummary(dataset.user.id)
        })

        assertPerformance(metrics, THRESHOLDS.medium)
      })

      it('should optimize time-range queries', async () => {
        const metrics = await measurePerformance(async () => {
          return await analyticsService.getPipelineTrends(dataset.user.id, {
            startDate: new Date('2023-01-01'),
            endDate: new Date('2024-12-31'),
          })
        })

        assertPerformance(metrics, THRESHOLDS.medium)
      })

      it('should handle concurrent requests efficiently', async () => {
        const concurrentRequests = 10
        const startTime = Date.now()

        const promises = Array(concurrentRequests).fill(null).map(() =>
          analyticsService.getStatusDistribution(dataset.user.id)
        )

        const results = await Promise.all(promises)
        const totalTime = Date.now() - startTime

        // All requests should complete
        expect(results).toHaveLength(concurrentRequests)
        results.forEach(result => {
          expect(result.total).toBeGreaterThan(0)
        })

        // Total time should be reasonable (not much longer than sequential)
        expect(totalTime).toBeLessThan(THRESHOLDS.medium.maxExecutionTime * 2)
      })
    })

    describe('Large Dataset Performance (50K applications)', () => {
      let dataset: any

      beforeEach(async () => {
        dataset = await createPerformanceDataset(50000)
      }, 300000) // 5 minute timeout for 50K records

      afterEach(async () => {
        await cleanupPerformanceData(dataset.user.id)
      })

      it('should handle large dataset status distribution', async () => {
        const metrics = await measurePerformance(async () => {
          return await analyticsService.getStatusDistribution(dataset.user.id)
        })

        assertPerformance(metrics, THRESHOLDS.large)
      })

      it('should optimize conversion funnel calculations', async () => {
        const metrics = await measurePerformance(async () => {
          return await analyticsService.getOverallConversion(dataset.user.id)
        })

        assertPerformance(metrics, THRESHOLDS.large)
      })

      it('should handle memory efficiently with large result sets', async () => {
        const initialMemory = process.memoryUsage()

        // Run multiple heavy queries
        await analyticsService.getStatusDistribution(dataset.user.id)
        await analyticsService.getPipelineTrends(dataset.user.id)
        await analyticsService.getResumePerformance(dataset.user.id)
        await analyticsService.getResponseTimes(dataset.user.id)

        // Force garbage collection if available
        if (global.gc) {
          global.gc()
        }

        const finalMemory = process.memoryUsage()
        const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

        // Memory increase should be reasonable
        expect(memoryIncrease).toBeLessThan(THRESHOLDS.large.maxMemoryIncrease)
      })
    })

    describe('Extra Large Dataset Performance (100K applications)', () => {
      let dataset: any

      beforeEach(async () => {
        // Only run this test in CI or when explicitly requested
        if (process.env.NODE_ENV !== 'ci' && !process.env.RUN_LARGE_TESTS) {
          pending('Skipping extra large performance test - set RUN_LARGE_TESTS=true to enable')
        }

        dataset = await createPerformanceDataset(100000)
      }, 600000) // 10 minute timeout for 100K records

      afterEach(async () => {
        await cleanupPerformanceData(dataset.user.id)
      })

      it('should handle extreme dataset sizes', async () => {
        const metrics = await measurePerformance(async () => {
          return await analyticsService.getStatusDistribution(dataset.user.id)
        })

        assertPerformance(metrics, THRESHOLDS.xlarge)
      })

      it('should maintain response times under load', async () => {
        // Test system under load with large dataset
        const loadTestDuration = 30000 // 30 seconds
        const requestInterval = 1000 // 1 second between requests
        const startTime = Date.now()
        const results: PerformanceMetrics[] = []

        while (Date.now() - startTime < loadTestDuration) {
          const metrics = await measurePerformance(async () => {
            return await analyticsService.getStatusDistribution(dataset.user.id)
          })

          results.push(metrics)

          // Wait before next request
          await new Promise(resolve => setTimeout(resolve, requestInterval))
        }

        // Analyze results
        const avgExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length
        const maxExecutionTime = Math.max(...results.map(r => r.executionTime))

        expect(avgExecutionTime).toBeLessThan(THRESHOLDS.large.maxExecutionTime)
        expect(maxExecutionTime).toBeLessThan(THRESHOLDS.xlarge.maxExecutionTime)

        // Performance should not degrade significantly over time
        const firstHalfAvg = results.slice(0, Math.floor(results.length / 2))
          .reduce((sum, r) => sum + r.executionTime, 0) / Math.floor(results.length / 2)
        const secondHalfAvg = results.slice(Math.floor(results.length / 2))
          .reduce((sum, r) => sum + r.executionTime, 0) / Math.ceil(results.length / 2)

        const degradationRatio = secondHalfAvg / firstHalfAvg
        expect(degradationRatio).toBeLessThan(2.0) // Performance shouldn't degrade more than 2x
      }, 120000) // 2 minute timeout for load test
    })
  })

  describe('Query Optimization Tests', () => {
    let mediumDataset: any

    beforeEach(async () => {
      mediumDataset = await createPerformanceDataset(5000)
    }, 60000)

    afterEach(async () => {
      await cleanupPerformanceData(mediumDataset.user.id)
    })

    it('should use efficient indexes for status distribution', async () => {
      // Test that the query uses proper indexes
      const startTime = Date.now()

      const result = await analyticsService.getStatusDistribution(mediumDataset.user.id)

      const executionTime = Date.now() - startTime

      // Should be fast due to indexed queries
      expect(executionTime).toBeLessThan(2000) // 2 seconds
      expect(result.total).toBeGreaterThan(0)
    })

    it('should optimize date range queries', async () => {
      // Test various date range sizes to ensure indexing works
      const dateRanges = [
        { days: 30, threshold: 1000 },
        { days: 90, threshold: 2000 },
        { days: 365, threshold: 3000 },
      ]

      for (const range of dateRanges) {
        const endDate = new Date()
        const startDate = new Date(endDate.getTime() - range.days * 24 * 60 * 60 * 1000)

        const startTime = Date.now()
        await analyticsService.getPipelineTrends(mediumDataset.user.id, { startDate, endDate })
        const executionTime = Date.now() - startTime

        expect(executionTime).toBeLessThan(range.threshold)
      }
    })

    it('should efficiently handle complex joins', async () => {
      // Test queries that require joins between multiple tables
      const metrics = await measurePerformance(async () => {
        return await analyticsService.getResumePerformance(mediumDataset.user.id)
      })

      // Complex joins should still be efficient
      expect(metrics.executionTime).toBeLessThan(5000) // 5 seconds
    })

    it('should optimize aggregation queries', async () => {
      // Test queries that perform complex aggregations
      const aggregationQueries = [
        () => analyticsService.getOverallConversion(mediumDataset.user.id),
        () => analyticsService.getConversionByPeriod(mediumDataset.user.id, 'month'),
        () => analyticsService.getResponseTimes(mediumDataset.user.id),
        () => analyticsService.getApplicationVelocity(mediumDataset.user.id),
      ]

      for (const query of aggregationQueries) {
        const metrics = await measurePerformance(query)
        expect(metrics.executionTime).toBeLessThan(5000) // 5 seconds for complex aggregations
      }
    })
  })

  describe('Memory Usage Tests', () => {
    it('should not leak memory with repeated queries', async () => {
      const dataset = await createPerformanceDataset(1000)

      const initialMemory = process.memoryUsage().heapUsed
      const iterations = 50

      try {
        // Run the same query many times
        for (let i = 0; i < iterations; i++) {
          await analyticsService.getStatusDistribution(dataset.user.id)

          // Force garbage collection periodically
          if (i % 10 === 0 && global.gc) {
            global.gc()
          }
        }

        // Force final garbage collection
        if (global.gc) {
          global.gc()
        }

        const finalMemory = process.memoryUsage().heapUsed
        const memoryIncrease = finalMemory - initialMemory

        // Memory increase should be minimal
        expect(memoryIncrease).toBeLessThan(50_000_000) // 50MB
      } finally {
        await cleanupPerformanceData(dataset.user.id)
      }
    })

    it('should handle large result sets efficiently', async () => {
      const dataset = await createPerformanceDataset(10000)

      try {
        const beforeMemory = process.memoryUsage()

        // Query that returns large result set
        const result = await analyticsService.getPipelineTrends(dataset.user.id, {
          startDate: new Date('2020-01-01'),
          endDate: new Date('2024-12-31'),
        })

        const afterMemory = process.memoryUsage()
        const memoryUsed = afterMemory.heapUsed - beforeMemory.heapUsed

        // Memory usage should be proportional to result size
        const resultSize = JSON.stringify(result).length
        const memoryPerByte = memoryUsed / resultSize

        // Should not use excessive memory per byte of result
        expect(memoryPerByte).toBeLessThan(10) // 10 bytes of memory per byte of result
      } finally {
        await cleanupPerformanceData(dataset.user.id)
      }
    })
  })

  describe('Database Connection Tests', () => {
    it('should handle connection pool efficiently', async () => {
      const dataset = await createPerformanceDataset(1000)

      try {
        // Make many concurrent requests to test connection pooling
        const concurrentRequests = 20
        const promises = Array(concurrentRequests).fill(null).map(async (_, index) => {
          // Vary the queries to test different connection patterns
          if (index % 3 === 0) {
            return await analyticsService.getStatusDistribution(dataset.user.id)
          } else if (index % 3 === 1) {
            return await analyticsService.getPipelineSummary(dataset.user.id)
          } else {
            return await analyticsService.getResumePerformance(dataset.user.id)
          }
        })

        const startTime = Date.now()
        const results = await Promise.all(promises)
        const totalTime = Date.now() - startTime

        // All requests should complete successfully
        expect(results).toHaveLength(concurrentRequests)
        results.forEach(result => {
          expect(result).toBeDefined()
        })

        // Should complete in reasonable time despite concurrency
        expect(totalTime).toBeLessThan(10000) // 10 seconds
      } finally {
        await cleanupPerformanceData(dataset.user.id)
      }
    })
  })

  // Helper functions

  async function createPerformanceDataset(applicationCount: number) {
    const dataset = AnalyticsTestFixtures.createLargeDataset(performanceUser, {
      applicationCount,
      startDate: '2020-01-01',
      endDate: '2024-12-31',
    })

    // Save to database in batches for better performance
    const batchSize = 1000

    const resumeRepo = dataSource.getRepository(Resume)
    await resumeRepo.save(dataset.resumes)

    const jobAppRepo = dataSource.getRepository(JobApplication)
    for (let i = 0; i < dataset.applications.length; i += batchSize) {
      const batch = dataset.applications.slice(i, i + batchSize)
      await jobAppRepo.save(batch)
    }

    const contactRepo = dataSource.getRepository(Contact)
    if (dataset.contacts.length > 0) {
      for (let i = 0; i < dataset.contacts.length; i += batchSize) {
        const batch = dataset.contacts.slice(i, i + batchSize)
        await contactRepo.save(batch)
      }
    }

    const interactionRepo = dataSource.getRepository(JobApplicationContact)
    if (dataset.interactions.length > 0) {
      for (let i = 0; i < dataset.interactions.length; i += batchSize) {
        const batch = dataset.interactions.slice(i, i + batchSize)
        await interactionRepo.save(batch)
      }
    }

    return dataset
  }

  async function cleanupPerformanceData(userId: string) {
    await AnalyticsTestSeeder.cleanupAnalyticsData(
      (entity) => dataSource.getRepository(entity),
      userId
    )
  }

  async function measurePerformance<T>(operation: () => Promise<T>): Promise<PerformanceMetrics> {
    const beforeMemory = process.memoryUsage()
    const startTime = Date.now()

    const result = await operation()

    const endTime = Date.now()
    const afterMemory = process.memoryUsage()

    const executionTime = endTime - startTime
    const resultSize = JSON.stringify(result).length

    return {
      executionTime,
      memoryUsage: {
        before: beforeMemory,
        after: afterMemory,
        peak: Math.max(beforeMemory.heapUsed, afterMemory.heapUsed),
      },
      resultSize,
    }
  }

  function assertPerformance(metrics: PerformanceMetrics, thresholds: PerformanceThresholds) {
    expect(metrics.executionTime).toBeLessThan(thresholds.maxExecutionTime)

    const memoryIncrease = metrics.memoryUsage.after.heapUsed - metrics.memoryUsage.before.heapUsed
    expect(memoryIncrease).toBeLessThan(thresholds.maxMemoryIncrease)

    expect(metrics.resultSize).toBeLessThan(thresholds.maxResultSize)
  }
})