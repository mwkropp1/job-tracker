/**
 * Analytics Controller - RESTful endpoints for job application analytics
 * Provides comprehensive analytics with user-scoped access and proper validation
 */

import { Request, Response } from 'express'

import { AppDataSource } from '../config/database'
import { JobApplicationStatus } from '../entities/JobApplication'
import { AnalyticsService } from '../services/AnalyticsService'
import { AnalyticsFilters, TimePeriod } from '../types/analytics'
import { handleControllerError, ErrorResponses, SuccessResponses } from '../utils/errorResponse'
import { createLogContext } from '../utils/logger'

/**
 * Extended Request interface to include authenticated user context
 */
interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
  }
}

/**
 * Controller providing comprehensive job application analytics endpoints
 * All endpoints require authentication and provide user-scoped data access
 */
export class AnalyticsController {
  private analyticsService: AnalyticsService

  constructor() {
    this.analyticsService = new AnalyticsService(AppDataSource)
  }

  /**
   * GET /analytics/pipeline
   * Retrieve pipeline view analytics with status distribution and trends
   */
  async getPipelineAnalytics(req: AuthenticatedRequest, res: Response) {
    const context = createLogContext('AnalyticsController.getPipelineAnalytics', {
      userId: req.user?.id || 'unknown',
      query: JSON.stringify(req.query)
    })

    try {
      // Ensure user is authenticated
      if (!req.user?.id) {
        return ErrorResponses.unauthorized(res, 'User not authenticated', context.requestId)
      }

      // Parse and validate query filters
      const filters = this.parseAnalyticsFilters(req.query)

      // Get pipeline analytics from service
      const analytics = await this.analyticsService.getPipelineAnalytics(req.user.id, filters)

      return SuccessResponses.ok(res, analytics, context.requestId)
    } catch (error) {
      handleControllerError(res, error as Error, context, 'Failed to retrieve pipeline analytics')
    }
  }

  /**
   * GET /analytics/resume-performance
   * Retrieve resume performance analytics with conversion rates and usage metrics
   */
  async getResumePerformanceAnalytics(req: AuthenticatedRequest, res: Response) {
    const context = createLogContext('AnalyticsController.getResumePerformanceAnalytics', {
      userId: req.user?.id || 'unknown',
      query: JSON.stringify(req.query)
    })

    try {
      if (!req.user?.id) {
        return ErrorResponses.unauthorized(res, 'User not authenticated', context.requestId)
      }

      const filters = this.parseAnalyticsFilters(req.query)
      const analytics = await this.analyticsService.getResumePerformanceAnalytics(req.user.id, filters)

      return SuccessResponses.ok(res, analytics, context.requestId)
    } catch (error) {
      handleControllerError(res, error as Error, context, 'Failed to retrieve resume performance analytics')
    }
  }

  /**
   * GET /analytics/timeline
   * Retrieve timeline analytics with response times and application velocity
   */
  async getTimelineAnalytics(req: AuthenticatedRequest, res: Response) {
    const context = createLogContext('AnalyticsController.getTimelineAnalytics', {
      userId: req.user?.id || 'unknown',
      query: JSON.stringify(req.query)
    })

    try {
      if (!req.user?.id) {
        return ErrorResponses.unauthorized(res, 'User not authenticated', context.requestId)
      }

      const filters = this.parseAnalyticsFilters(req.query)
      const analytics = await this.analyticsService.getTimelineAnalytics(req.user.id, filters)

      return SuccessResponses.ok(res, analytics, context.requestId)
    } catch (error) {
      handleControllerError(res, error as Error, context, 'Failed to retrieve timeline analytics')
    }
  }

  /**
   * GET /analytics/conversion
   * Retrieve conversion analytics with success rates through hiring pipeline
   */
  async getConversionAnalytics(req: AuthenticatedRequest, res: Response) {
    const context = createLogContext('AnalyticsController.getConversionAnalytics', {
      userId: req.user?.id || 'unknown',
      query: JSON.stringify(req.query)
    })

    try {
      if (!req.user?.id) {
        return ErrorResponses.unauthorized(res, 'User not authenticated', context.requestId)
      }

      const filters = this.parseAnalyticsFilters(req.query)
      const analytics = await this.analyticsService.getConversionAnalytics(req.user.id, filters)

      return SuccessResponses.ok(res, analytics, context.requestId)
    } catch (error) {
      handleControllerError(res, error as Error, context, 'Failed to retrieve conversion analytics')
    }
  }

  /**
   * GET /analytics/complete
   * Retrieve complete analytics combining all analytics types
   */
  async getCompleteAnalytics(req: AuthenticatedRequest, res: Response) {
    const context = createLogContext('AnalyticsController.getCompleteAnalytics', {
      userId: req.user?.id || 'unknown',
      query: JSON.stringify(req.query)
    })

    try {
      if (!req.user?.id) {
        return ErrorResponses.unauthorized(res, 'User not authenticated', context.requestId)
      }

      const filters = this.parseAnalyticsFilters(req.query)
      const analytics = await this.analyticsService.getCompleteAnalytics(req.user.id, filters)

      return SuccessResponses.ok(res, analytics, context.requestId)
    } catch (error) {
      handleControllerError(res, error as Error, context, 'Failed to retrieve complete analytics')
    }
  }

  /**
   * Parse and validate query parameters into AnalyticsFilters
   * Provides safe parameter parsing with validation and sanitization
   */
  private parseAnalyticsFilters(query: any): AnalyticsFilters | undefined {
    const filters: AnalyticsFilters = {}
    let hasFilters = false

    // Parse time period
    if (query.timePeriod && this.isValidTimePeriod(query.timePeriod)) {
      filters.timePeriod = query.timePeriod as TimePeriod
      hasFilters = true
    }

    // Parse date range
    if (query.startDate || query.endDate) {
      const startDate = this.parseDate(query.startDate)
      const endDate = this.parseDate(query.endDate)

      if (startDate && endDate && startDate <= endDate) {
        filters.dateRange = { startDate, endDate }
        hasFilters = true
      }
    }

    // Parse company filter
    if (query.company && typeof query.company === 'string' && query.company.trim()) {
      filters.company = this.sanitizeString(query.company)
      hasFilters = true
    }

    // Parse resume ID filter
    if (query.resumeId && typeof query.resumeId === 'string' && query.resumeId.trim()) {
      filters.resumeId = this.sanitizeString(query.resumeId)
      hasFilters = true
    }

    // Parse status filter
    if (query.status && this.isValidJobApplicationStatus(query.status)) {
      filters.status = query.status as JobApplicationStatus
      hasFilters = true
    }

    // Parse include archived flag
    if (query.includeArchived !== undefined) {
      filters.includeArchived = this.parseBoolean(query.includeArchived)
      hasFilters = true
    }

    return hasFilters ? filters : undefined
  }

  /**
   * Validate time period parameter
   */
  private isValidTimePeriod(value: any): boolean {
    const validPeriods: TimePeriod[] = ['daily', 'weekly', 'monthly']
    return typeof value === 'string' && validPeriods.includes(value as TimePeriod)
  }

  /**
   * Validate job application status parameter
   */
  private isValidJobApplicationStatus(value: any): boolean {
    return typeof value === 'string' && Object.values(JobApplicationStatus).includes(value as JobApplicationStatus)
  }

  /**
   * Parse date string into Date object with validation
   */
  private parseDate(dateString: any): Date | null {
    if (!dateString || typeof dateString !== 'string') {
      return null
    }

    try {
      const date = new Date(dateString)
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return null
      }

      // Check if date is reasonable (not too far in past/future)
      const now = new Date()
      const minDate = new Date('2000-01-01')
      const maxDate = new Date(now.getFullYear() + 1, 11, 31)

      if (date < minDate || date > maxDate) {
        return null
      }

      return date
    } catch {
      return null
    }
  }

  /**
   * Parse boolean parameter with fallback
   */
  private parseBoolean(value: any): boolean {
    if (typeof value === 'boolean') {
      return value
    }

    if (typeof value === 'string') {
      const lower = value.toLowerCase().trim()
      return lower === 'true' || lower === '1' || lower === 'yes'
    }

    return false
  }

  /**
   * Sanitize string parameter to prevent injection attacks
   */
  private sanitizeString(value: string): string {
    return value
      .trim()
      .replace(/[<>\"'%;()&+]/g, '') // Remove potentially dangerous characters
      .substring(0, 255) // Limit length
  }
}