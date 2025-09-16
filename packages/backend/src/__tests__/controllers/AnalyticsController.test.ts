/**
 * Comprehensive tests for AnalyticsController
 * Tests RESTful endpoints with authentication and user-scoped data access
 */

import type { Request, Response } from 'express'
import type { DataSource } from 'typeorm'

import { AnalyticsController } from '../../controllers/AnalyticsController'
import { AnalyticsService } from '../../services/AnalyticsService'
import { JobApplicationStatus } from '../../entities/JobApplication'
import { User } from '../../entities/User'
import {
  initializeTestDatabase,
  closeTestDatabase,
  cleanupTestDatabase,
} from '../../test/testDatabase'
import { TestDataFactory, MockExpressUtils } from '../../test'
import { ErrorCode } from '../../utils/errorResponse'

// Mock the analytics service for unit testing controller logic
jest.mock('../../services/AnalyticsService')

describe('AnalyticsController', () => {
  let dataSource: DataSource
  let analyticsController: AnalyticsController
  let mockAnalyticsService: jest.Mocked<AnalyticsService>
  let testUser: User
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>

  beforeAll(async () => {
    dataSource = await initializeTestDatabase()
  }, 30000)

  afterAll(async () => {
    await closeTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()

    // Create test user
    testUser = await TestDataFactory.createUser()

    // Setup mocked service
    mockAnalyticsService = new AnalyticsService(dataSource) as jest.Mocked<AnalyticsService>

    // Create controller with mocked service
    analyticsController = new AnalyticsController()
    // Inject mocked service
    ;(analyticsController as any).analyticsService = mockAnalyticsService

    // Setup mock request and response
    mockReq = MockExpressUtils.createMockRequest()
    mockRes = MockExpressUtils.createMockResponse()

    // Setup authenticated user context
    mockReq.user = { id: testUser.id, email: testUser.email }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /analytics/pipeline', () => {
    it('should return pipeline analytics successfully', async () => {
      const mockPipelineAnalytics = {
        statusDistribution: [
          { status: JobApplicationStatus.APPLIED, count: 5, percentage: 50 },
          { status: JobApplicationStatus.PHONE_SCREEN, count: 3, percentage: 30 },
          { status: JobApplicationStatus.REJECTED, count: 2, percentage: 20 }
        ],
        applicationsTrends: [
          { period: '2024-01', count: 4, newApplications: 4, statusChanges: 0 },
          { period: '2024-02', count: 6, newApplications: 6, statusChanges: 0 }
        ],
        summary: {
          totalApplications: 10,
          activeApplications: 8,
          completedApplications: 2,
          recentActivityCount: 3,
          averageTimeInPipeline: 15
        }
      }

      mockAnalyticsService.getPipelineAnalytics.mockResolvedValue(mockPipelineAnalytics)

      await analyticsController.getPipelineAnalytics(mockReq as Request, mockRes as Response)

      expect(mockAnalyticsService.getPipelineAnalytics).toHaveBeenCalledWith(testUser.id, undefined)
      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockPipelineAnalytics,
        timestamp: expect.any(String)
      })
    })

    it('should apply query filters correctly', async () => {
      mockReq.query = {
        timePeriod: 'weekly',
        company: 'Google',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        includeArchived: 'true'
      }

      const expectedFilters = {
        timePeriod: 'weekly',
        company: 'Google',
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31')
        },
        includeArchived: true
      }

      mockAnalyticsService.getPipelineAnalytics.mockResolvedValue({
        statusDistribution: [],
        applicationsTrends: [],
        summary: {
          totalApplications: 0,
          activeApplications: 0,
          completedApplications: 0,
          recentActivityCount: 0,
          averageTimeInPipeline: 0
        }
      })

      await analyticsController.getPipelineAnalytics(mockReq as Request, mockRes as Response)

      expect(mockAnalyticsService.getPipelineAnalytics).toHaveBeenCalledWith(testUser.id, expectedFilters)
    })

    it('should handle service errors gracefully', async () => {
      mockAnalyticsService.getPipelineAnalytics.mockRejectedValue(new Error('Database error'))

      await analyticsController.getPipelineAnalytics(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to retrieve pipeline analytics',
          timestamp: expect.any(String)
        }
      })
    })

    it('should require authentication', async () => {
      mockReq.user = undefined

      await analyticsController.getPipelineAnalytics(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'User not authenticated',
          timestamp: expect.any(String)
        }
      })
    })
  })

  describe('GET /analytics/resume-performance', () => {
    it('should return resume performance analytics successfully', async () => {
      const mockResumeAnalytics = {
        resumeMetrics: [
          {
            resumeId: 'resume-1',
            versionName: 'Software Engineer v1',
            usageCount: 5,
            conversionRates: {
              applicationToPhoneScreen: 40,
              phoneScreenToTechnical: 60,
              technicalToOnsite: 50,
              onsiteToOffer: 33.33,
              offerToAccepted: 100,
              overallApplicationToOffer: 20
            },
            successRate: 20
          }
        ],
        summary: {
          totalResumes: 1,
          mostUsedResume: {
            id: 'resume-1',
            versionName: 'Software Engineer v1',
            usageCount: 5
          },
          averageUsagePerResume: 5
        }
      }

      mockAnalyticsService.getResumePerformanceAnalytics.mockResolvedValue(mockResumeAnalytics)

      await analyticsController.getResumePerformanceAnalytics(mockReq as Request, mockRes as Response)

      expect(mockAnalyticsService.getResumePerformanceAnalytics).toHaveBeenCalledWith(testUser.id, undefined)
      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResumeAnalytics,
        timestamp: expect.any(String)
      })
    })

    it('should apply resume filter correctly', async () => {
      mockReq.query = {
        resumeId: 'specific-resume-id'
      }

      const expectedFilters = {
        resumeId: 'specific-resume-id'
      }

      mockAnalyticsService.getResumePerformanceAnalytics.mockResolvedValue({
        resumeMetrics: [],
        summary: {
          totalResumes: 0,
          averageUsagePerResume: 0
        }
      })

      await analyticsController.getResumePerformanceAnalytics(mockReq as Request, mockRes as Response)

      expect(mockAnalyticsService.getResumePerformanceAnalytics).toHaveBeenCalledWith(testUser.id, expectedFilters)
    })
  })

  describe('GET /analytics/timeline', () => {
    it('should return timeline analytics successfully', async () => {
      const mockTimelineAnalytics = {
        responseTimeMetrics: {
          averageResponseTime: 7,
          responseTimeByStatus: [],
          responseTimeByCompany: []
        },
        velocityMetrics: {
          applicationsPerWeek: 2.5,
          applicationsPerMonth: 10,
          velocityTrend: [
            { period: '2024-01', applicationCount: 5 },
            { period: '2024-02', applicationCount: 7 }
          ],
          peakApplicationPeriods: [
            { period: '2024-02', applicationCount: 7, rank: 1 }
          ]
        },
        summary: {
          oldestApplication: new Date('2024-01-01'),
          newestApplication: new Date('2024-02-29'),
          totalTimespan: 59,
          averageApplicationsPerMonth: 6,
          mostActiveMonth: '2024-02',
          leastActiveMonth: '2024-01'
        }
      }

      mockAnalyticsService.getTimelineAnalytics.mockResolvedValue(mockTimelineAnalytics)

      await analyticsController.getTimelineAnalytics(mockReq as Request, mockRes as Response)

      expect(mockAnalyticsService.getTimelineAnalytics).toHaveBeenCalledWith(testUser.id, undefined)
      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockTimelineAnalytics,
        timestamp: expect.any(String)
      })
    })
  })

  describe('GET /analytics/conversion', () => {
    it('should return conversion analytics successfully', async () => {
      const mockConversionAnalytics = {
        overallConversion: {
          applicationToPhoneScreen: 30,
          phoneScreenToTechnical: 60,
          technicalToOnsite: 75,
          onsiteToOffer: 50,
          offerToAccepted: 80,
          overallApplicationToOffer: 10
        },
        conversionByCompany: [
          {
            company: 'Google',
            applicationCount: 3,
            conversionRates: {
              applicationToPhoneScreen: 66.67,
              phoneScreenToTechnical: 100,
              technicalToOnsite: 50,
              onsiteToOffer: 100,
              offerToAccepted: 100,
              overallApplicationToOffer: 33.33
            },
            finalOutcomes: [
              { status: JobApplicationStatus.OFFER_ACCEPTED, count: 1, percentage: 33.33 },
              { status: JobApplicationStatus.REJECTED, count: 2, percentage: 66.67 }
            ]
          }
        ],
        conversionByResume: [],
        conversionByPeriod: [],
        summary: {
          bestConvertingCompany: {
            company: 'Google',
            conversionRate: 33.33
          },
          improvementOpportunities: ['Focus on technical interview preparation']
        }
      }

      mockAnalyticsService.getConversionAnalytics.mockResolvedValue(mockConversionAnalytics)

      await analyticsController.getConversionAnalytics(mockReq as Request, mockRes as Response)

      expect(mockAnalyticsService.getConversionAnalytics).toHaveBeenCalledWith(testUser.id, undefined)
      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockConversionAnalytics,
        timestamp: expect.any(String)
      })
    })
  })

  describe('GET /analytics/complete', () => {
    it('should return complete analytics successfully', async () => {
      const mockCompleteAnalytics = {
        pipeline: {
          statusDistribution: [],
          applicationsTrends: [],
          summary: {
            totalApplications: 0,
            activeApplications: 0,
            completedApplications: 0,
            recentActivityCount: 0,
            averageTimeInPipeline: 0
          }
        },
        resumePerformance: {
          resumeMetrics: [],
          summary: {
            totalResumes: 0,
            averageUsagePerResume: 0
          }
        },
        timeline: {
          responseTimeMetrics: {
            averageResponseTime: 0,
            responseTimeByStatus: [],
            responseTimeByCompany: []
          },
          velocityMetrics: {
            applicationsPerWeek: 0,
            applicationsPerMonth: 0,
            velocityTrend: [],
            peakApplicationPeriods: []
          },
          summary: {
            oldestApplication: new Date(),
            newestApplication: new Date(),
            totalTimespan: 0,
            averageApplicationsPerMonth: 0,
            mostActiveMonth: '',
            leastActiveMonth: ''
          }
        },
        conversion: {
          overallConversion: {
            applicationToPhoneScreen: 0,
            phoneScreenToTechnical: 0,
            technicalToOnsite: 0,
            onsiteToOffer: 0,
            offerToAccepted: 0,
            overallApplicationToOffer: 0
          },
          conversionByCompany: [],
          conversionByResume: [],
          conversionByPeriod: [],
          summary: {
            improvementOpportunities: []
          }
        },
        generatedAt: new Date(),
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31')
        }
      }

      mockAnalyticsService.getCompleteAnalytics.mockResolvedValue(mockCompleteAnalytics)

      await analyticsController.getCompleteAnalytics(mockReq as Request, mockRes as Response)

      expect(mockAnalyticsService.getCompleteAnalytics).toHaveBeenCalledWith(testUser.id, undefined)
      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockCompleteAnalytics,
        timestamp: expect.any(String)
      })
    })

    it('should apply comprehensive filters correctly', async () => {
      mockReq.query = {
        timePeriod: 'monthly',
        company: 'Meta',
        resumeId: 'resume-123',
        status: JobApplicationStatus.PHONE_SCREEN,
        startDate: '2024-06-01',
        endDate: '2024-12-31',
        includeArchived: 'false'
      }

      const expectedFilters = {
        timePeriod: 'monthly',
        company: 'Meta',
        resumeId: 'resume-123',
        status: JobApplicationStatus.PHONE_SCREEN,
        dateRange: {
          startDate: new Date('2024-06-01'),
          endDate: new Date('2024-12-31')
        },
        includeArchived: false
      }

      mockAnalyticsService.getCompleteAnalytics.mockResolvedValue({
        pipeline: expect.any(Object),
        resumePerformance: expect.any(Object),
        timeline: expect.any(Object),
        conversion: expect.any(Object),
        generatedAt: new Date(),
        dateRange: expectedFilters.dateRange
      } as any)

      await analyticsController.getCompleteAnalytics(mockReq as Request, mockRes as Response)

      expect(mockAnalyticsService.getCompleteAnalytics).toHaveBeenCalledWith(testUser.id, expectedFilters)
    })
  })

  describe('Query parameter validation', () => {
    it('should handle invalid date formats gracefully', async () => {
      mockReq.query = {
        startDate: 'invalid-date',
        endDate: '2024-12-31'
      }

      mockAnalyticsService.getPipelineAnalytics.mockResolvedValue({
        statusDistribution: [],
        applicationsTrends: [],
        summary: {
          totalApplications: 0,
          activeApplications: 0,
          completedApplications: 0,
          recentActivityCount: 0,
          averageTimeInPipeline: 0
        }
      })

      await analyticsController.getPipelineAnalytics(mockReq as Request, mockRes as Response)

      // Should call service with no dateRange filter due to invalid date
      expect(mockAnalyticsService.getPipelineAnalytics).toHaveBeenCalledWith(testUser.id, undefined)
    })

    it('should handle invalid boolean values gracefully', async () => {
      mockReq.query = {
        includeArchived: 'maybe' // Invalid boolean
      }

      mockAnalyticsService.getPipelineAnalytics.mockResolvedValue({
        statusDistribution: [],
        applicationsTrends: [],
        summary: {
          totalApplications: 0,
          activeApplications: 0,
          completedApplications: 0,
          recentActivityCount: 0,
          averageTimeInPipeline: 0
        }
      })

      await analyticsController.getPipelineAnalytics(mockReq as Request, mockRes as Response)

      // Should default to undefined/false for invalid boolean
      expect(mockAnalyticsService.getPipelineAnalytics).toHaveBeenCalledWith(testUser.id, undefined)
    })

    it('should validate JobApplicationStatus enum values', async () => {
      mockReq.query = {
        status: 'INVALID_STATUS'
      }

      mockAnalyticsService.getPipelineAnalytics.mockResolvedValue({
        statusDistribution: [],
        applicationsTrends: [],
        summary: {
          totalApplications: 0,
          activeApplications: 0,
          completedApplications: 0,
          recentActivityCount: 0,
          averageTimeInPipeline: 0
        }
      })

      await analyticsController.getPipelineAnalytics(mockReq as Request, mockRes as Response)

      // Should ignore invalid status
      expect(mockAnalyticsService.getPipelineAnalytics).toHaveBeenCalledWith(testUser.id, undefined)
    })
  })

  describe('Error handling', () => {
    it('should handle missing user context', async () => {
      mockReq.user = undefined

      await analyticsController.getPipelineAnalytics(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockAnalyticsService.getPipelineAnalytics).not.toHaveBeenCalled()
    })

    it('should handle service timeout errors', async () => {
      mockAnalyticsService.getCompleteAnalytics.mockRejectedValue(new Error('Service timeout'))

      await analyticsController.getCompleteAnalytics(mockReq as Request, mockRes as Response)

      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to retrieve complete analytics',
          timestamp: expect.any(String)
        }
      })
    })

    it('should log errors for debugging', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      mockAnalyticsService.getPipelineAnalytics.mockRejectedValue(new Error('Test error'))

      await analyticsController.getPipelineAnalytics(mockReq as Request, mockRes as Response)

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('Performance considerations', () => {
    it('should handle large datasets efficiently', async () => {
      // Mock a large analytics response
      const largePipelineAnalytics = {
        statusDistribution: Array.from({ length: 100 }, (_, i) => ({
          status: JobApplicationStatus.APPLIED,
          count: i + 1,
          percentage: (i + 1) / 100 * 100
        })),
        applicationsTrends: Array.from({ length: 365 }, (_, i) => ({
          period: `2024-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`,
          count: Math.floor(Math.random() * 10),
          newApplications: Math.floor(Math.random() * 5),
          statusChanges: Math.floor(Math.random() * 3)
        })),
        summary: {
          totalApplications: 1000,
          activeApplications: 800,
          completedApplications: 200,
          recentActivityCount: 50,
          averageTimeInPipeline: 25
        }
      }

      mockAnalyticsService.getPipelineAnalytics.mockResolvedValue(largePipelineAnalytics)

      const startTime = Date.now()
      await analyticsController.getPipelineAnalytics(mockReq as Request, mockRes as Response)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
      expect(mockRes.status).toHaveBeenCalledWith(200)
    })
  })
})