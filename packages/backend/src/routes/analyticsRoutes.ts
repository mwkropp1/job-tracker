/**
 * Analytics routes providing comprehensive analytics endpoints
 * All endpoints require authentication and implement proper validation
 */

import express, { Request, Response } from 'express'

import { AnalyticsController } from '../controllers/AnalyticsController'
import { authenticateToken } from '../middleware/auth'
import { validateAnalyticsQuery } from '../middleware/validation'

const router = express.Router()
const analyticsController = new AnalyticsController()

// Enforce authentication for all analytics operations
router.use(authenticateToken)

/**
 * GET /analytics/pipeline
 * Retrieve pipeline view analytics with status distribution and trends
 *
 * Query Parameters:
 * - timePeriod: 'daily' | 'weekly' | 'monthly' (optional)
 * - company: string (optional, partial match)
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - includeArchived: boolean (optional, default: false)
 *
 * Response: PipelineAnalytics object with status distribution, trends, and summary
 */
router.get(
  '/pipeline',
  validateAnalyticsQuery,
  (req: Request, res: Response) => analyticsController.getPipelineAnalytics(req, res)
)

/**
 * GET /analytics/resume-performance
 * Retrieve resume performance analytics with conversion rates and usage metrics
 *
 * Query Parameters:
 * - resumeId: string (optional, filter by specific resume)
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - includeArchived: boolean (optional, default: false)
 *
 * Response: ResumePerformanceAnalytics object with metrics per resume and summary
 */
router.get(
  '/resume-performance',
  validateAnalyticsQuery,
  (req: Request, res: Response) => analyticsController.getResumePerformanceAnalytics(req, res)
)

/**
 * GET /analytics/timeline
 * Retrieve timeline analytics with response times and application velocity
 *
 * Query Parameters:
 * - timePeriod: 'daily' | 'weekly' | 'monthly' (optional)
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - includeArchived: boolean (optional, default: false)
 *
 * Response: TimelineAnalytics object with response metrics, velocity, and summary
 */
router.get(
  '/timeline',
  validateAnalyticsQuery,
  (req: Request, res: Response) => analyticsController.getTimelineAnalytics(req, res)
)

/**
 * GET /analytics/conversion
 * Retrieve conversion analytics with success rates through hiring pipeline
 *
 * Query Parameters:
 * - timePeriod: 'daily' | 'weekly' | 'monthly' (optional)
 * - company: string (optional, partial match)
 * - resumeId: string (optional, filter by specific resume)
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - includeArchived: boolean (optional, default: false)
 *
 * Response: ConversionAnalytics object with conversion rates and insights
 */
router.get(
  '/conversion',
  validateAnalyticsQuery,
  (req: Request, res: Response) => analyticsController.getConversionAnalytics(req, res)
)

/**
 * GET /analytics/complete
 * Retrieve complete analytics combining all analytics types
 *
 * Query Parameters:
 * - timePeriod: 'daily' | 'weekly' | 'monthly' (optional)
 * - company: string (optional, partial match)
 * - resumeId: string (optional, filter by specific resume)
 * - status: JobApplicationStatus enum value (optional)
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - includeArchived: boolean (optional, default: false)
 *
 * Response: CompleteAnalytics object with all analytics combined
 */
router.get(
  '/complete',
  validateAnalyticsQuery,
  (req: Request, res: Response) => analyticsController.getCompleteAnalytics(req, res)
)

export default router