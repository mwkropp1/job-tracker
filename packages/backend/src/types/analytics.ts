/**
 * TypeScript interfaces for Job Application Analytics API
 * Provides type safety for analytics responses and service layer
 */

import { JobApplicationStatus } from '../entities/JobApplication'

/**
 * Time period options for analytics aggregation
 */
export type TimePeriod = 'daily' | 'weekly' | 'monthly'

/**
 * Date range filter for analytics queries
 */
export interface DateRange {
  startDate: Date
  endDate: Date
}

/**
 * Pipeline View Analytics - Application status distribution and trends
 */
export interface PipelineAnalytics {
  /** Distribution of applications across different statuses */
  statusDistribution: StatusDistribution[]
  /** Applications count over time periods */
  applicationsTrends: ApplicationsTrend[]
  /** Summary statistics */
  summary: PipelineSummary
}

export interface StatusDistribution {
  status: JobApplicationStatus
  count: number
  percentage: number
}

export interface ApplicationsTrend {
  period: string // ISO date string or period identifier
  count: number
  newApplications: number
  statusChanges: number
}

export interface PipelineSummary {
  totalApplications: number
  activeApplications: number
  completedApplications: number
  recentActivityCount: number // Applications modified in last 7 days
  averageTimeInPipeline: number // Days
}

/**
 * Resume Performance Analytics - Effectiveness of different resume versions
 */
export interface ResumePerformanceAnalytics {
  /** Performance metrics per resume */
  resumeMetrics: ResumeMetrics[]
  /** Overall resume performance summary */
  summary: ResumePerformanceSummary
}

export interface ResumeMetrics {
  resumeId: string
  versionName: string
  usageCount: number
  conversionRates: ConversionRates
  lastUsedDate?: Date
  successRate: number // Percentage of applications that led to offers
}

export interface ConversionRates {
  applicationToPhoneScreen: number
  phoneScreenToTechnical: number
  technicalToOnsite: number
  onsiteToOffer: number
  offerToAccepted: number
  overallApplicationToOffer: number
}

export interface ResumePerformanceSummary {
  totalResumes: number
  mostUsedResume?: {
    id: string
    versionName: string
    usageCount: number
  }
  bestPerformingResume?: {
    id: string
    versionName: string
    successRate: number
  }
  averageUsagePerResume: number
}

/**
 * Application Timeline Analytics - Time-based metrics and velocity
 */
export interface TimelineAnalytics {
  /** Response time metrics */
  responseTimeMetrics: ResponseTimeMetrics
  /** Application velocity trends */
  velocityMetrics: VelocityMetrics
  /** Timeline summary statistics */
  summary: TimelineSummary
}

export interface ResponseTimeMetrics {
  averageResponseTime: number // Days
  responseTimeByStatus: StatusResponseTime[]
  responseTimeByCompany: CompanyResponseTime[]
}

export interface StatusResponseTime {
  fromStatus: JobApplicationStatus
  toStatus: JobApplicationStatus
  averageDays: number
  medianDays: number
  applications: number
}

export interface CompanyResponseTime {
  company: string
  averageResponseTime: number
  totalApplications: number
  statusBreakdown: StatusDistribution[]
}

export interface VelocityMetrics {
  applicationsPerWeek: number
  applicationsPerMonth: number
  velocityTrend: VelocityTrend[]
  peakApplicationPeriods: PeakPeriod[]
}

export interface VelocityTrend {
  period: string
  applicationCount: number
  weekNumber?: number
  month?: string
}

export interface PeakPeriod {
  period: string
  applicationCount: number
  rank: number
}

export interface TimelineSummary {
  oldestApplication: Date
  newestApplication: Date
  totalTimespan: number // Days
  averageApplicationsPerMonth: number
  mostActiveMonth: string
  leastActiveMonth: string
}

/**
 * Conversion Rate Analytics - Success rates through the hiring pipeline
 */
export interface ConversionAnalytics {
  /** Overall conversion rates */
  overallConversion: ConversionRates
  /** Conversion rates by company */
  conversionByCompany: CompanyConversion[]
  /** Conversion rates by resume */
  conversionByResume: ResumeConversion[]
  /** Conversion rates by time period */
  conversionByPeriod: PeriodConversion[]
  /** Conversion summary statistics */
  summary: ConversionSummary
}

export interface CompanyConversion {
  company: string
  applicationCount: number
  conversionRates: ConversionRates
  finalOutcomes: StatusDistribution[]
}

export interface ResumeConversion {
  resumeId: string
  versionName: string
  applicationCount: number
  conversionRates: ConversionRates
}

export interface PeriodConversion {
  period: string
  applicationCount: number
  conversionRates: ConversionRates
}

export interface ConversionSummary {
  bestConvertingCompany?: {
    company: string
    conversionRate: number
  }
  bestConvertingResume?: {
    id: string
    versionName: string
    conversionRate: number
  }
  bestConvertingPeriod?: {
    period: string
    conversionRate: number
  }
  improvementOpportunities: string[]
}

/**
 * Complete analytics response combining all analytics types
 */
export interface CompleteAnalytics {
  pipeline: PipelineAnalytics
  resumePerformance: ResumePerformanceAnalytics
  timeline: TimelineAnalytics
  conversion: ConversionAnalytics
  generatedAt: Date
  dateRange: DateRange
}

/**
 * Analytics request filters
 */
export interface AnalyticsFilters {
  dateRange?: DateRange
  timePeriod?: TimePeriod
  company?: string
  resumeId?: string
  status?: JobApplicationStatus
  includeArchived?: boolean
}

/**
 * Analytics service interface for dependency injection
 */
export interface IAnalyticsService {
  getPipelineAnalytics(userId: string, filters?: AnalyticsFilters): Promise<PipelineAnalytics>
  getResumePerformanceAnalytics(userId: string, filters?: AnalyticsFilters): Promise<ResumePerformanceAnalytics>
  getTimelineAnalytics(userId: string, filters?: AnalyticsFilters): Promise<TimelineAnalytics>
  getConversionAnalytics(userId: string, filters?: AnalyticsFilters): Promise<ConversionAnalytics>
  getCompleteAnalytics(userId: string, filters?: AnalyticsFilters): Promise<CompleteAnalytics>
}