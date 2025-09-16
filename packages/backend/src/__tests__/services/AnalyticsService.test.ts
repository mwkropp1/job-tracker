/**
 * Comprehensive tests for AnalyticsService following TDD principles
 * Tests all analytics functionality with real database operations using Testcontainers
 */

import type { DataSource } from 'typeorm'

import { AnalyticsService } from '../../services/AnalyticsService'
import { JobApplication, JobApplicationStatus } from '../../entities/JobApplication'
import { Resume, ResumeSource } from '../../entities/Resume'
import { User } from '../../entities/User'
import {
  initializeTestDatabase,
  closeTestDatabase,
  cleanupTestDatabase,
} from '../../test/testDatabase'
import { TestDataFactory } from '../../test'
import {
  PipelineAnalytics,
  ResumePerformanceAnalytics,
  TimelineAnalytics,
  ConversionAnalytics,
  CompleteAnalytics,
  AnalyticsFilters
} from '../../types/analytics'

describe('AnalyticsService - Testcontainers PostgreSQL Integration', () => {
  let dataSource: DataSource
  let analyticsService: AnalyticsService
  let testUser: User
  let testResume1: Resume
  let testResume2: Resume

  beforeAll(async () => {
    dataSource = await initializeTestDatabase()
  }, 30000)

  afterAll(async () => {
    await closeTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()

    // Initialize service
    analyticsService = new AnalyticsService(dataSource)

    // Create test user and resumes
    testUser = await TestDataFactory.createUser()
    testResume1 = await TestDataFactory.createResume(testUser, {
      versionName: 'Software Engineer v1',
      fileName: 'resume_v1.pdf',
      source: ResumeSource.UPLOAD
    })
    testResume2 = await TestDataFactory.createResume(testUser, {
      versionName: 'Software Engineer v2',
      fileName: 'resume_v2.pdf',
      source: ResumeSource.UPLOAD
    })
  })

  describe('getPipelineAnalytics', () => {
    it('should return empty analytics for user with no applications', async () => {
      const analytics = await analyticsService.getPipelineAnalytics(testUser.id)

      expect(analytics).toEqual({
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
    })

    it('should calculate correct status distribution', async () => {
      // Create applications with different statuses
      await TestDataFactory.createJobApplication(testUser, {
        company: 'Company A',
        jobTitle: 'Software Engineer',
        status: JobApplicationStatus.APPLIED,
        resume: testResume1
      })

      await TestDataFactory.createJobApplication(testUser, {
        company: 'Company B',
        jobTitle: 'Full Stack Developer',
        status: JobApplicationStatus.PHONE_SCREEN,
        resume: testResume1
      })

      await TestDataFactory.createJobApplication(testUser, {
        company: 'Company C',
        jobTitle: 'Backend Engineer',
        status: JobApplicationStatus.APPLIED,
        resume: testResume2
      })

      const analytics = await analyticsService.getPipelineAnalytics(testUser.id)

      expect(analytics.statusDistribution).toHaveLength(2)
      expect(analytics.statusDistribution).toContainEqual({
        status: JobApplicationStatus.APPLIED,
        count: 2,
        percentage: 66.67
      })
      expect(analytics.statusDistribution).toContainEqual({
        status: JobApplicationStatus.PHONE_SCREEN,
        count: 1,
        percentage: 33.33
      })

      expect(analytics.summary.totalApplications).toBe(3)
      expect(analytics.summary.activeApplications).toBe(3)
      expect(analytics.summary.completedApplications).toBe(0)
    })

    it('should calculate applications trends by time period', async () => {
      const lastWeek = new Date()
      lastWeek.setDate(lastWeek.getDate() - 7)

      const twoWeeksAgo = new Date()
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

      // Create applications across different time periods
      await TestDataFactory.createJobApplication(testUser, {
        company: 'Recent Company',
        jobTitle: 'Recent Job',
        applicationDate: new Date(),
        status: JobApplicationStatus.APPLIED,
        resume: testResume1
      })

      await TestDataFactory.createJobApplication(testUser, {
        company: 'Last Week Company',
        jobTitle: 'Last Week Job',
        applicationDate: lastWeek,
        status: JobApplicationStatus.APPLIED,
        resume: testResume1
      })

      const analytics = await analyticsService.getPipelineAnalytics(testUser.id, {
        timePeriod: 'weekly'
      })

      expect(analytics.applicationsTrends.length).toBeGreaterThan(0)
      expect(analytics.summary.recentActivityCount).toBe(2) // Both applications within recent period
    })

    it('should respect date range filters', async () => {
      const oldDate = new Date('2023-01-01')
      const recentDate = new Date()

      await TestDataFactory.createJobApplication(testUser, {
        company: 'Old Company',
        jobTitle: 'Old Job',
        applicationDate: oldDate,
        status: JobApplicationStatus.APPLIED,
        resume: testResume1
      })

      await TestDataFactory.createJobApplication(testUser, {
        company: 'Recent Company',
        jobTitle: 'Recent Job',
        applicationDate: recentDate,
        status: JobApplicationStatus.APPLIED,
        resume: testResume1
      })

      const analytics = await analyticsService.getPipelineAnalytics(testUser.id, {
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date()
        }
      })

      expect(analytics.summary.totalApplications).toBe(1)
    })

    it('should exclude archived applications by default', async () => {
      await TestDataFactory.createJobApplication(testUser, {
        company: 'Active Company',
        jobTitle: 'Active Job',
        status: JobApplicationStatus.APPLIED,
        isArchived: false,
        resume: testResume1
      })

      await TestDataFactory.createJobApplication(testUser, {
        company: 'Archived Company',
        jobTitle: 'Archived Job',
        status: JobApplicationStatus.APPLIED,
        isArchived: true,
        resume: testResume1
      })

      const analytics = await analyticsService.getPipelineAnalytics(testUser.id)
      expect(analytics.summary.totalApplications).toBe(1)

      const analyticsWithArchived = await analyticsService.getPipelineAnalytics(testUser.id, {
        includeArchived: true
      })
      expect(analyticsWithArchived.summary.totalApplications).toBe(2)
    })
  })

  describe('getResumePerformanceAnalytics', () => {
    it('should return empty analytics for user with no resumes', async () => {
      // Remove test resumes
      await dataSource.getRepository(Resume).remove([testResume1, testResume2])

      const analytics = await analyticsService.getResumePerformanceAnalytics(testUser.id)

      expect(analytics).toEqual({
        resumeMetrics: [],
        summary: {
          totalResumes: 0,
          averageUsagePerResume: 0
        }
      })
    })

    it('should calculate resume usage and conversion rates', async () => {
      // Create applications using different resumes
      await TestDataFactory.createJobApplication(testUser, {
        company: 'Company A',
        jobTitle: 'Job A',
        status: JobApplicationStatus.APPLIED,
        resume: testResume1
      })

      await TestDataFactory.createJobApplication(testUser, {
        company: 'Company B',
        jobTitle: 'Job B',
        status: JobApplicationStatus.PHONE_SCREEN,
        resume: testResume1
      })

      await TestDataFactory.createJobApplication(testUser, {
        company: 'Company C',
        jobTitle: 'Job C',
        status: JobApplicationStatus.OFFER_RECEIVED,
        resume: testResume1
      })

      await TestDataFactory.createJobApplication(testUser, {
        company: 'Company D',
        jobTitle: 'Job D',
        status: JobApplicationStatus.APPLIED,
        resume: testResume2
      })

      const analytics = await analyticsService.getResumePerformanceAnalytics(testUser.id)

      expect(analytics.resumeMetrics).toHaveLength(2)

      const resume1Metrics = analytics.resumeMetrics.find(m => m.resumeId === testResume1.id)
      expect(resume1Metrics).toBeDefined()
      expect(resume1Metrics!.usageCount).toBe(3)
      expect(resume1Metrics!.conversionRates.applicationToPhoneScreen).toBe(33.33) // 1 of 3
      expect(resume1Metrics!.conversionRates.overallApplicationToOffer).toBe(33.33) // 1 of 3

      const resume2Metrics = analytics.resumeMetrics.find(m => m.resumeId === testResume2.id)
      expect(resume2Metrics).toBeDefined()
      expect(resume2Metrics!.usageCount).toBe(1)

      expect(analytics.summary.totalResumes).toBe(2)
      expect(analytics.summary.mostUsedResume?.versionName).toBe('Software Engineer v1')
      expect(analytics.summary.averageUsagePerResume).toBe(2)
    })

    it('should identify best performing resume', async () => {
      // Resume 1: 2 applications, 1 offer (50% success)
      await TestDataFactory.createJobApplication(testUser, {
        company: 'Company A',
        jobTitle: 'Job A',
        status: JobApplicationStatus.APPLIED,
        resume: testResume1
      })

      await TestDataFactory.createJobApplication(testUser, {
        company: 'Company B',
        jobTitle: 'Job B',
        status: JobApplicationStatus.OFFER_RECEIVED,
        resume: testResume1
      })

      // Resume 2: 3 applications, 0 offers (0% success)
      await TestDataFactory.createJobApplication(testUser, {
        company: 'Company C',
        jobTitle: 'Job C',
        status: JobApplicationStatus.APPLIED,
        resume: testResume2
      })

      await TestDataFactory.createJobApplication(testUser, {
        company: 'Company D',
        jobTitle: 'Job D',
        status: JobApplicationStatus.REJECTED,
        resume: testResume2
      })

      await TestDataFactory.createJobApplication(testUser, {
        company: 'Company E',
        jobTitle: 'Job E',
        status: JobApplicationStatus.APPLIED,
        resume: testResume2
      })

      const analytics = await analyticsService.getResumePerformanceAnalytics(testUser.id)

      expect(analytics.summary.bestPerformingResume?.versionName).toBe('Software Engineer v1')
      expect(analytics.summary.bestPerformingResume?.successRate).toBe(50)
      expect(analytics.summary.mostUsedResume?.versionName).toBe('Software Engineer v2')
      expect(analytics.summary.mostUsedResume?.usageCount).toBe(3)
    })
  })

  describe('getTimelineAnalytics', () => {
    it('should calculate response time metrics', async () => {
      const baseDate = new Date('2024-01-01')
      const phoneScreenDate = new Date('2024-01-08') // 7 days later
      const rejectionDate = new Date('2024-01-15') // 7 days after phone screen

      // Create application with status progression
      const application = await TestDataFactory.createJobApplication(testUser, {
        company: 'Test Company',
        jobTitle: 'Test Job',
        applicationDate: baseDate,
        status: JobApplicationStatus.APPLIED,
        resume: testResume1
      })

      // Simulate status updates (in real app, this would be tracked via status change history)
      // For testing, we'll create separate applications representing different stages
      await TestDataFactory.createJobApplication(testUser, {
        company: 'Test Company 2',
        jobTitle: 'Test Job 2',
        applicationDate: phoneScreenDate,
        status: JobApplicationStatus.PHONE_SCREEN,
        resume: testResume1
      })

      await TestDataFactory.createJobApplication(testUser, {
        company: 'Test Company 3',
        jobTitle: 'Test Job 3',
        applicationDate: rejectionDate,
        status: JobApplicationStatus.REJECTED,
        resume: testResume1
      })

      const analytics = await analyticsService.getTimelineAnalytics(testUser.id)

      expect(analytics.summary.totalTimespan).toBeGreaterThan(0)
      expect(analytics.velocityMetrics.applicationsPerWeek).toBeGreaterThan(0)
      expect(analytics.responseTimeMetrics.averageResponseTime).toBeGreaterThanOrEqual(0)
    })

    it('should calculate application velocity trends', async () => {
      // Create applications across different weeks
      const week1 = new Date()
      week1.setDate(week1.getDate() - 14)

      const week2 = new Date()
      week2.setDate(week2.getDate() - 7)

      const thisWeek = new Date()

      await TestDataFactory.createJobApplication(testUser, {
        company: 'Week 1 Company',
        jobTitle: 'Week 1 Job',
        applicationDate: week1,
        status: JobApplicationStatus.APPLIED,
        resume: testResume1
      })

      await TestDataFactory.createJobApplication(testUser, {
        company: 'Week 2 Company 1',
        jobTitle: 'Week 2 Job 1',
        applicationDate: week2,
        status: JobApplicationStatus.APPLIED,
        resume: testResume1
      })

      await TestDataFactory.createJobApplication(testUser, {
        company: 'Week 2 Company 2',
        jobTitle: 'Week 2 Job 2',
        applicationDate: week2,
        status: JobApplicationStatus.APPLIED,
        resume: testResume1
      })

      await TestDataFactory.createJobApplication(testUser, {
        company: 'This Week Company',
        jobTitle: 'This Week Job',
        applicationDate: thisWeek,
        status: JobApplicationStatus.APPLIED,
        resume: testResume1
      })

      const analytics = await analyticsService.getTimelineAnalytics(testUser.id, {
        timePeriod: 'weekly'
      })

      expect(analytics.velocityMetrics.velocityTrend.length).toBeGreaterThan(0)
      expect(analytics.velocityMetrics.applicationsPerWeek).toBeGreaterThan(0)
      expect(analytics.velocityMetrics.peakApplicationPeriods.length).toBeGreaterThan(0)
    })
  })

  describe('getConversionAnalytics', () => {
    it('should calculate overall conversion rates', async () => {
      // Create a complete funnel progression
      await TestDataFactory.createJobApplication(testUser, {
        company: 'Company A',
        jobTitle: 'Applied Only',
        status: JobApplicationStatus.APPLIED,
        resume: testResume1
      })

      await TestDataFactory.createJobApplication(testUser, {
        company: 'Company B',
        jobTitle: 'Phone Screen',
        status: JobApplicationStatus.PHONE_SCREEN,
        resume: testResume1
      })

      await TestDataFactory.createJobApplication(testUser, {
        company: 'Company C',
        jobTitle: 'Technical',
        status: JobApplicationStatus.TECHNICAL_INTERVIEW,
        resume: testResume1
      })

      await TestDataFactory.createJobApplication(testUser, {
        company: 'Company D',
        jobTitle: 'Onsite',
        status: JobApplicationStatus.ONSITE_INTERVIEW,
        resume: testResume1
      })

      await TestDataFactory.createJobApplication(testUser, {
        company: 'Company E',
        jobTitle: 'Offer',
        status: JobApplicationStatus.OFFER_RECEIVED,
        resume: testResume1
      })

      const analytics = await analyticsService.getConversionAnalytics(testUser.id)

      expect(analytics.overallConversion.applicationToPhoneScreen).toBe(80) // 4 of 5
      expect(analytics.overallConversion.phoneScreenToTechnical).toBe(75) // 3 of 4
      expect(analytics.overallConversion.technicalToOnsite).toBe(66.67) // 2 of 3
      expect(analytics.overallConversion.onsiteToOffer).toBe(50) // 1 of 2
      expect(analytics.overallConversion.overallApplicationToOffer).toBe(20) // 1 of 5
    })

    it('should calculate conversion rates by company', async () => {
      // Company A: Good conversion
      await TestDataFactory.createJobApplication(testUser, {
        company: 'Good Company',
        jobTitle: 'Job 1',
        status: JobApplicationStatus.APPLIED,
        resume: testResume1
      })

      await TestDataFactory.createJobApplication(testUser, {
        company: 'Good Company',
        jobTitle: 'Job 2',
        status: JobApplicationStatus.OFFER_RECEIVED,
        resume: testResume1
      })

      // Company B: Poor conversion
      await TestDataFactory.createJobApplication(testUser, {
        company: 'Poor Company',
        jobTitle: 'Job 3',
        status: JobApplicationStatus.APPLIED,
        resume: testResume1
      })

      await TestDataFactory.createJobApplication(testUser, {
        company: 'Poor Company',
        jobTitle: 'Job 4',
        status: JobApplicationStatus.REJECTED,
        resume: testResume1
      })

      const analytics = await analyticsService.getConversionAnalytics(testUser.id)

      expect(analytics.conversionByCompany).toHaveLength(2)

      const goodCompany = analytics.conversionByCompany.find(c => c.company === 'Good Company')
      expect(goodCompany).toBeDefined()
      expect(goodCompany!.conversionRates.overallApplicationToOffer).toBe(50) // 1 of 2

      const poorCompany = analytics.conversionByCompany.find(c => c.company === 'Poor Company')
      expect(poorCompany).toBeDefined()
      expect(poorCompany!.conversionRates.overallApplicationToOffer).toBe(0) // 0 of 2

      expect(analytics.summary.bestConvertingCompany?.company).toBe('Good Company')
    })
  })

  describe('getCompleteAnalytics', () => {
    it('should return all analytics combined', async () => {
      // Create test data
      await TestDataFactory.createJobApplication(testUser, {
        company: 'Test Company',
        jobTitle: 'Test Job',
        status: JobApplicationStatus.APPLIED,
        resume: testResume1
      })

      const analytics = await analyticsService.getCompleteAnalytics(testUser.id)

      expect(analytics).toHaveProperty('pipeline')
      expect(analytics).toHaveProperty('resumePerformance')
      expect(analytics).toHaveProperty('timeline')
      expect(analytics).toHaveProperty('conversion')
      expect(analytics).toHaveProperty('generatedAt')
      expect(analytics).toHaveProperty('dateRange')

      expect(analytics.pipeline.summary.totalApplications).toBe(1)
      expect(analytics.resumePerformance.summary.totalResumes).toBe(2)
    })

    it('should respect filters across all analytics', async () => {
      const oldDate = new Date('2023-01-01')
      const recentDate = new Date()

      await TestDataFactory.createJobApplication(testUser, {
        company: 'Old Company',
        jobTitle: 'Old Job',
        applicationDate: oldDate,
        status: JobApplicationStatus.APPLIED,
        resume: testResume1
      })

      await TestDataFactory.createJobApplication(testUser, {
        company: 'Recent Company',
        jobTitle: 'Recent Job',
        applicationDate: recentDate,
        status: JobApplicationStatus.APPLIED,
        resume: testResume1
      })

      const analytics = await analyticsService.getCompleteAnalytics(testUser.id, {
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date()
        }
      })

      expect(analytics.pipeline.summary.totalApplications).toBe(1)
      expect(analytics.dateRange.startDate).toEqual(new Date('2024-01-01'))
    })
  })

  describe('Error handling and edge cases', () => {
    describe('Invalid Input Handling', () => {
      it('should handle invalid user ID gracefully', async () => {
        const analytics = await analyticsService.getPipelineAnalytics('invalid-user-id')

        expect(analytics.summary.totalApplications).toBe(0)
        expect(analytics.statusDistribution).toEqual([])
      })

      it('should handle null and undefined user IDs', async () => {
        const nullAnalytics = await analyticsService.getPipelineAnalytics(null as any)
        expect(nullAnalytics.summary.totalApplications).toBe(0)

        const undefinedAnalytics = await analyticsService.getPipelineAnalytics(undefined as any)
        expect(undefinedAnalytics.summary.totalApplications).toBe(0)
      })

      it('should handle invalid date ranges gracefully', async () => {
        const invalidFilters: AnalyticsFilters = {
          dateRange: {
            startDate: new Date('2025-01-01'),
            endDate: new Date('2024-01-01') // End before start
          }
        }

        const analytics = await analyticsService.getPipelineAnalytics(testUser.id, invalidFilters)
        expect(analytics.summary.totalApplications).toBe(0)
      })

      it('should handle invalid date objects', async () => {
        const invalidDateFilters: AnalyticsFilters = {
          dateRange: {
            startDate: new Date('invalid-date'),
            endDate: new Date()
          }
        }

        const analytics = await analyticsService.getPipelineAnalytics(testUser.id, invalidDateFilters)
        expect(analytics.summary.totalApplications).toBe(0)
      })
    })

    describe('Boundary Conditions', () => {
      it('should handle user with no applications', async () => {
        const pipeline = await analyticsService.getPipelineAnalytics(testUser.id)
        const resume = await analyticsService.getResumePerformanceAnalytics(testUser.id)
        const timeline = await analyticsService.getTimelineAnalytics(testUser.id)
        const conversion = await analyticsService.getConversionAnalytics(testUser.id)

        expect(pipeline.summary.totalApplications).toBe(0)
        expect(pipeline.statusDistribution).toEqual([])
        expect(resume.resumeMetrics).toEqual([])
        expect(timeline.summary.totalTimespan).toBe(0)
        expect(conversion.overallConversion.overallApplicationToOffer).toBe(0)
      })

      it('should handle single application scenarios', async () => {
        await TestDataFactory.createJobApplication(testUser, {
          company: 'Single Company',
          jobTitle: 'Single Job',
          status: JobApplicationStatus.APPLIED,
          resume: testResume1
        })

        const analytics = await analyticsService.getPipelineAnalytics(testUser.id)
        expect(analytics.summary.totalApplications).toBe(1)
        expect(analytics.statusDistribution).toHaveLength(1)
        expect(analytics.statusDistribution[0].percentage).toBe(100)
      })

      it('should handle applications with extreme dates', async () => {
        // Very old application
        await TestDataFactory.createJobApplication(testUser, {
          company: 'Ancient Company',
          jobTitle: 'Ancient Job',
          applicationDate: new Date('1900-01-01'),
          status: JobApplicationStatus.APPLIED,
          resume: testResume1
        })

        // Future application (edge case)
        await TestDataFactory.createJobApplication(testUser, {
          company: 'Future Company',
          jobTitle: 'Future Job',
          applicationDate: new Date('2030-01-01'),
          status: JobApplicationStatus.APPLIED,
          resume: testResume1
        })

        const analytics = await analyticsService.getPipelineAnalytics(testUser.id, {
          dateRange: {
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-12-31')
          }
        })

        // Should exclude both extreme dates from the range
        expect(analytics.summary.totalApplications).toBe(0)
      })

      it('should handle applications with very long text fields', async () => {
        const longText = 'A'.repeat(10000) // 10KB text

        await TestDataFactory.createJobApplication(testUser, {
          company: 'Long Text Company',
          jobTitle: 'Long Text Job',
          jobDescription: longText,
          notes: longText,
          status: JobApplicationStatus.APPLIED,
          resume: testResume1
        })

        const analytics = await analyticsService.getPipelineAnalytics(testUser.id)
        expect(analytics.summary.totalApplications).toBe(1)
      })
    })

    describe('Calculation Edge Cases', () => {
      it('should handle division by zero in percentage calculations', async () => {
        // Test with no applications
        const analytics = await analyticsService.getConversionAnalytics(testUser.id)

        expect(analytics.overallConversion.applicationToPhoneScreen).toBe(0)
        expect(analytics.overallConversion.overallApplicationToOffer).toBe(0)
      })

      it('should handle floating point precision in percentage calculations', async () => {
        // Create 3 applications for 33.333...% calculations
        await Promise.all([
          TestDataFactory.createJobApplication(testUser, {
            company: 'Company 1',
            jobTitle: 'Job 1',
            status: JobApplicationStatus.APPLIED,
            resume: testResume1
          }),
          TestDataFactory.createJobApplication(testUser, {
            company: 'Company 2',
            jobTitle: 'Job 2',
            status: JobApplicationStatus.APPLIED,
            resume: testResume1
          }),
          TestDataFactory.createJobApplication(testUser, {
            company: 'Company 3',
            jobTitle: 'Job 3',
            status: JobApplicationStatus.APPLIED,
            resume: testResume1
          })
        ])

        const analytics = await analyticsService.getPipelineAnalytics(testUser.id)
        const percentage = analytics.statusDistribution[0].percentage

        expect(percentage).toBeCloseTo(100, 1)
        expect(Number.isFinite(percentage)).toBe(true)
        expect(percentage).not.toBeNaN()
      })

      it('should handle extreme usage counts in resume analytics', async () => {
        // Create application with resume having very high usage count
        const highUsageResume = await TestDataFactory.createResume(testUser, {
          versionName: 'High Usage Resume',
          fileName: 'high_usage.pdf',
          source: ResumeSource.UPLOAD,
          applicationCount: 999999
        })

        await TestDataFactory.createJobApplication(testUser, {
          company: 'Test Company',
          jobTitle: 'Test Job',
          status: JobApplicationStatus.APPLIED,
          resume: highUsageResume
        })

        const analytics = await analyticsService.getResumePerformanceAnalytics(testUser.id)
        expect(analytics.resumeMetrics.length).toBeGreaterThan(0)
        expect(analytics.summary.mostUsedResume?.applicationCount).toBe(999999)
      })
    })

    describe('Data Consistency Issues', () => {
      it('should handle orphaned data relationships', async () => {
        // Create application, then remove its resume to simulate orphaned data
        const application = await TestDataFactory.createJobApplication(testUser, {
          company: 'Orphaned Company',
          jobTitle: 'Orphaned Job',
          status: JobApplicationStatus.APPLIED,
          resume: testResume1
        })

        // Remove the resume to create orphaned relationship
        await dataSource.getRepository(Resume).remove(testResume1)

        // Should handle gracefully without crashing
        const resumeAnalytics = await analyticsService.getResumePerformanceAnalytics(testUser.id)
        expect(resumeAnalytics).toBeDefined()
      })

      it('should handle duplicate applications consistently', async () => {
        const baseApplication = {
          company: 'Duplicate Corp',
          jobTitle: 'Software Engineer',
          applicationDate: new Date('2024-01-15'),
          status: JobApplicationStatus.APPLIED,
          resume: testResume1
        }

        // Create multiple identical applications
        await Promise.all([
          TestDataFactory.createJobApplication(testUser, baseApplication),
          TestDataFactory.createJobApplication(testUser, baseApplication),
          TestDataFactory.createJobApplication(testUser, baseApplication)
        ])

        const analytics = await analyticsService.getPipelineAnalytics(testUser.id)
        expect(analytics.summary.totalApplications).toBe(3)
      })

      it('should handle timeline inconsistencies', async () => {
        // Create application with future date but completed status
        await TestDataFactory.createJobApplication(testUser, {
          company: 'Future Company',
          jobTitle: 'Future Job',
          applicationDate: new Date('2030-01-01'),
          status: JobApplicationStatus.OFFER_ACCEPTED,
          resume: testResume1
        })

        const timelineAnalytics = await analyticsService.getTimelineAnalytics(testUser.id)
        expect(timelineAnalytics.summary.totalTimespan).toBeGreaterThanOrEqual(0)
      })
    })

    describe('Performance and Resource Management', () => {
      it('should handle large datasets efficiently', async () => {
        const startTime = Date.now()

        // Create moderate dataset for testing
        const applications = Array(100).fill(null).map((_, i) =>
          TestDataFactory.createJobApplication(testUser, {
            company: `Company ${i}`,
            jobTitle: `Job ${i}`,
            status: JobApplicationStatus.APPLIED,
            resume: testResume1
          })
        )

        await dataSource.getRepository(JobApplication).save(applications)

        const analytics = await analyticsService.getPipelineAnalytics(testUser.id)
        const endTime = Date.now()
        const executionTime = endTime - startTime

        expect(analytics.summary.totalApplications).toBe(100)
        expect(executionTime).toBeLessThan(5000) // Should complete within 5 seconds
      })

      it('should handle concurrent analytics requests', async () => {
        // Create test data
        await TestDataFactory.createJobApplication(testUser, {
          company: 'Concurrent Test Company',
          jobTitle: 'Concurrent Test Job',
          status: JobApplicationStatus.APPLIED,
          resume: testResume1
        })

        // Make multiple concurrent requests
        const concurrentRequests = Array(5).fill(null).map(() =>
          Promise.all([
            analyticsService.getPipelineAnalytics(testUser.id),
            analyticsService.getResumePerformanceAnalytics(testUser.id),
            analyticsService.getTimelineAnalytics(testUser.id)
          ])
        )

        const results = await Promise.all(concurrentRequests)
        expect(results).toHaveLength(5)

        // All requests should return consistent results
        const firstResult = results[0]
        results.forEach(result => {
          expect(result[0].summary.totalApplications).toBe(firstResult[0].summary.totalApplications)
        })
      })
    })
  })
})