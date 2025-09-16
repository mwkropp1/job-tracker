/**
 * Analytics Service - Business logic for job application analytics
 * Provides comprehensive analytics calculations with user-scoped data access
 */

import { DataSource, Repository, Between, In } from 'typeorm'

import { JobApplication, JobApplicationStatus } from '../entities/JobApplication'
import { Resume } from '../entities/Resume'
import {
  IAnalyticsService,
  PipelineAnalytics,
  ResumePerformanceAnalytics,
  TimelineAnalytics,
  ConversionAnalytics,
  CompleteAnalytics,
  AnalyticsFilters,
  StatusDistribution,
  ApplicationsTrend,
  PipelineSummary,
  ResumeMetrics,
  ConversionRates,
  ResumePerformanceSummary,
  ResponseTimeMetrics,
  VelocityMetrics,
  TimelineSummary,
  CompanyConversion,
  ConversionSummary,
  TimePeriod,
  DateRange
} from '../types/analytics'
import { logger, createLogContext } from '../utils/logger'

/**
 * Service providing comprehensive job application analytics
 * All methods are user-scoped for security and data isolation
 */
export class AnalyticsService implements IAnalyticsService {
  private jobApplicationRepository: Repository<JobApplication>
  private resumeRepository: Repository<Resume>

  constructor(dataSource: DataSource) {
    this.jobApplicationRepository = dataSource.getRepository(JobApplication)
    this.resumeRepository = dataSource.getRepository(Resume)
  }

  /**
   * Get pipeline view analytics - status distribution and trends
   */
  async getPipelineAnalytics(userId: string, filters?: AnalyticsFilters): Promise<PipelineAnalytics> {
    const context = createLogContext('AnalyticsService.getPipelineAnalytics', { userId })

    try {
      const applications = await this.getFilteredApplications(userId, filters)

      const statusDistribution = this.calculateStatusDistribution(applications)
      const applicationsTrends = await this.calculateApplicationsTrends(userId, filters)
      const summary = this.calculatePipelineSummary(applications)

      return {
        statusDistribution,
        applicationsTrends,
        summary
      }
    } catch (error) {
      logger.error('Failed to get pipeline analytics', context, error)
      return this.getEmptyPipelineAnalytics()
    }
  }

  /**
   * Get resume performance analytics - effectiveness metrics by resume
   */
  async getResumePerformanceAnalytics(userId: string, filters?: AnalyticsFilters): Promise<ResumePerformanceAnalytics> {
    const context = createLogContext('AnalyticsService.getResumePerformanceAnalytics', { userId })

    try {
      const resumes = await this.getUserResumes(userId, filters)
      const applications = await this.getFilteredApplications(userId, filters)

      const resumeMetrics = await this.calculateResumeMetrics(resumes, applications)
      const summary = this.calculateResumePerformanceSummary(resumeMetrics)

      return {
        resumeMetrics,
        summary
      }
    } catch (error) {
      logger.error('Failed to get resume performance analytics', context, error)
      return this.getEmptyResumePerformanceAnalytics()
    }
  }

  /**
   * Get timeline analytics - time-based metrics and velocity
   */
  async getTimelineAnalytics(userId: string, filters?: AnalyticsFilters): Promise<TimelineAnalytics> {
    const context = createLogContext('AnalyticsService.getTimelineAnalytics', { userId })

    try {
      const applications = await this.getFilteredApplications(userId, filters)

      const responseTimeMetrics = this.calculateResponseTimeMetrics(applications)
      const velocityMetrics = this.calculateVelocityMetrics(applications, filters?.timePeriod)
      const summary = this.calculateTimelineSummary(applications)

      return {
        responseTimeMetrics,
        velocityMetrics,
        summary
      }
    } catch (error) {
      logger.error('Failed to get timeline analytics', context, error)
      return this.getEmptyTimelineAnalytics()
    }
  }

  /**
   * Get conversion analytics - success rates through hiring pipeline
   */
  async getConversionAnalytics(userId: string, filters?: AnalyticsFilters): Promise<ConversionAnalytics> {
    const context = createLogContext('AnalyticsService.getConversionAnalytics', { userId })

    try {
      const applications = await this.getFilteredApplications(userId, filters)

      const overallConversion = this.calculateOverallConversionRates(applications)
      const conversionByCompany = this.calculateConversionByCompany(applications)
      const conversionByResume = this.calculateConversionByResume(applications)
      const conversionByPeriod = this.calculateConversionByPeriod(applications, filters?.timePeriod)
      const summary = this.calculateConversionSummary(conversionByCompany, conversionByResume, conversionByPeriod)

      return {
        overallConversion,
        conversionByCompany,
        conversionByResume,
        conversionByPeriod,
        summary
      }
    } catch (error) {
      logger.error('Failed to get conversion analytics', context, error)
      return this.getEmptyConversionAnalytics()
    }
  }

  /**
   * Get complete analytics combining all analytics types
   */
  async getCompleteAnalytics(userId: string, filters?: AnalyticsFilters): Promise<CompleteAnalytics> {
    const context = createLogContext('AnalyticsService.getCompleteAnalytics', { userId })

    try {
      const [pipeline, resumePerformance, timeline, conversion] = await Promise.all([
        this.getPipelineAnalytics(userId, filters),
        this.getResumePerformanceAnalytics(userId, filters),
        this.getTimelineAnalytics(userId, filters),
        this.getConversionAnalytics(userId, filters)
      ])

      const dateRange = this.getEffectiveDateRange(filters)

      return {
        pipeline,
        resumePerformance,
        timeline,
        conversion,
        generatedAt: new Date(),
        dateRange
      }
    } catch (error) {
      logger.error('Failed to get complete analytics', context, error)
      throw error
    }
  }

  /**
   * Get filtered job applications for a user
   */
  private async getFilteredApplications(userId: string, filters?: AnalyticsFilters): Promise<JobApplication[]> {
    const queryBuilder = this.jobApplicationRepository
      .createQueryBuilder('application')
      .leftJoinAndSelect('application.resume', 'resume')
      .where('application.userId = :userId', { userId })

    // Apply archive filter (exclude by default)
    if (!filters?.includeArchived) {
      queryBuilder.andWhere('application.isArchived = false')
    }

    // Apply date range filter
    if (filters?.dateRange) {
      const { startDate, endDate } = filters.dateRange
      if (startDate <= endDate) {
        queryBuilder.andWhere('application.applicationDate BETWEEN :startDate AND :endDate', {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        })
      }
    }

    // Apply company filter
    if (filters?.company) {
      queryBuilder.andWhere('application.company ILIKE :company', {
        company: `%${filters.company}%`
      })
    }

    // Apply resume filter
    if (filters?.resumeId) {
      queryBuilder.andWhere('application.resumeId = :resumeId', {
        resumeId: filters.resumeId
      })
    }

    // Apply status filter
    if (filters?.status) {
      queryBuilder.andWhere('application.status = :status', {
        status: filters.status
      })
    }

    return queryBuilder.orderBy('application.applicationDate', 'DESC').getMany()
  }

  /**
   * Get user resumes with optional filtering
   */
  private async getUserResumes(userId: string, filters?: AnalyticsFilters): Promise<Resume[]> {
    const queryBuilder = this.resumeRepository
      .createQueryBuilder('resume')
      .leftJoinAndSelect('resume.jobApplications', 'application')
      .where('resume.userId = :userId', { userId })

    if (filters?.resumeId) {
      queryBuilder.andWhere('resume.id = :resumeId', { resumeId: filters.resumeId })
    }

    return queryBuilder.getMany()
  }

  /**
   * Calculate status distribution with percentages
   */
  private calculateStatusDistribution(applications: JobApplication[]): StatusDistribution[] {
    if (applications.length === 0) {return []}

    const statusCounts = new Map<JobApplicationStatus, number>()

    applications.forEach(app => {
      const current = statusCounts.get(app.status) || 0
      statusCounts.set(app.status, current + 1)
    })

    return Array.from(statusCounts.entries()).map(([status, count]) => ({
      status,
      count,
      percentage: this.roundToDecimal((count / applications.length) * 100, 2)
    }))
  }

  /**
   * Calculate applications trends over time periods
   */
  private async calculateApplicationsTrends(userId: string, filters?: AnalyticsFilters): Promise<ApplicationsTrend[]> {
    const timePeriod = filters?.timePeriod || 'weekly'
    const applications = await this.getFilteredApplications(userId, filters)

    const trends: ApplicationsTrend[] = []
    const groupedByPeriod = this.groupApplicationsByPeriod(applications, timePeriod)

    for (const [period, apps] of groupedByPeriod.entries()) {
      trends.push({
        period,
        count: apps.length,
        newApplications: apps.filter(app => app.status === JobApplicationStatus.APPLIED).length,
        statusChanges: apps.filter(app => app.status !== JobApplicationStatus.APPLIED).length
      })
    }

    return trends.sort((a, b) => a.period.localeCompare(b.period))
  }

  /**
   * Calculate pipeline summary statistics
   */
  private calculatePipelineSummary(applications: JobApplication[]): PipelineSummary {
    const totalApplications = applications.length
    const activeStatuses = [
      JobApplicationStatus.APPLIED,
      JobApplicationStatus.PHONE_SCREEN,
      JobApplicationStatus.TECHNICAL_INTERVIEW,
      JobApplicationStatus.ONSITE_INTERVIEW
    ]
    const completedStatuses = [
      JobApplicationStatus.OFFER_RECEIVED,
      JobApplicationStatus.OFFER_ACCEPTED,
      JobApplicationStatus.DECLINED,
      JobApplicationStatus.REJECTED
    ]

    const activeApplications = applications.filter(app => activeStatuses.includes(app.status)).length
    const completedApplications = applications.filter(app => completedStatuses.includes(app.status)).length

    // Recent activity: applications created or modified in last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentActivityCount = applications.filter(app =>
      app.applicationDate >= sevenDaysAgo || app.updatedAt >= sevenDaysAgo
    ).length

    // Average time in pipeline (simplified calculation)
    const averageTimeInPipeline = this.calculateAverageTimeInPipeline(applications)

    return {
      totalApplications,
      activeApplications,
      completedApplications,
      recentActivityCount,
      averageTimeInPipeline
    }
  }

  /**
   * Calculate resume metrics including usage and conversion rates
   */
  private async calculateResumeMetrics(resumes: Resume[], applications: JobApplication[]): Promise<ResumeMetrics[]> {
    return resumes.map(resume => {
      const resumeApplications = applications.filter(app => app.resume?.id === resume.id)
      const conversionRates = this.calculateOverallConversionRates(resumeApplications)
      const successRate = this.calculateSuccessRate(resumeApplications)

      return {
        resumeId: resume.id,
        versionName: resume.versionName,
        usageCount: resumeApplications.length,
        conversionRates,
        lastUsedDate: resume.lastUsedDate,
        successRate
      }
    })
  }

  /**
   * Calculate resume performance summary
   */
  private calculateResumePerformanceSummary(resumeMetrics: ResumeMetrics[]): ResumePerformanceSummary {
    if (resumeMetrics.length === 0) {
      return {
        totalResumes: 0,
        averageUsagePerResume: 0
      }
    }

    const totalUsage = resumeMetrics.reduce((sum, metric) => sum + metric.usageCount, 0)
    const averageUsagePerResume = this.roundToDecimal(totalUsage / resumeMetrics.length, 2)

    const mostUsedResume = resumeMetrics.reduce((max, current) =>
      current.usageCount > max.usageCount ? current : max
    )

    const bestPerformingResume = resumeMetrics.reduce((best, current) =>
      current.successRate > best.successRate ? current : best
    )

    return {
      totalResumes: resumeMetrics.length,
      mostUsedResume: mostUsedResume ? {
        id: mostUsedResume.resumeId,
        versionName: mostUsedResume.versionName,
        usageCount: mostUsedResume.usageCount
      } : undefined,
      bestPerformingResume: bestPerformingResume ? {
        id: bestPerformingResume.resumeId,
        versionName: bestPerformingResume.versionName,
        successRate: bestPerformingResume.successRate
      } : undefined,
      averageUsagePerResume
    }
  }

  /**
   * Calculate response time metrics
   */
  private calculateResponseTimeMetrics(applications: JobApplication[]): ResponseTimeMetrics {
    // Simplified implementation - in real app would track status change history
    const averageResponseTime = this.calculateAverageResponseTime(applications)

    return {
      averageResponseTime,
      responseTimeByStatus: [],
      responseTimeByCompany: []
    }
  }

  /**
   * Calculate velocity metrics
   */
  private calculateVelocityMetrics(applications: JobApplication[], timePeriod: TimePeriod = 'weekly'): VelocityMetrics {
    if (applications.length === 0) {
      return {
        applicationsPerWeek: 0,
        applicationsPerMonth: 0,
        velocityTrend: [],
        peakApplicationPeriods: []
      }
    }

    const groupedByPeriod = this.groupApplicationsByPeriod(applications, timePeriod)
    const velocityTrend = Array.from(groupedByPeriod.entries()).map(([period, apps]) => ({
      period,
      applicationCount: apps.length
    }))

    const peakApplicationPeriods = velocityTrend
      .sort((a, b) => b.applicationCount - a.applicationCount)
      .slice(0, 5)
      .map((item, index) => ({
        period: item.period,
        applicationCount: item.applicationCount,
        rank: index + 1
      }))

    // Calculate rates
    const timespan = this.calculateTimespan(applications)
    const weeksInTimespan = Math.max(timespan / 7, 1)
    const monthsInTimespan = Math.max(timespan / 30, 1)

    return {
      applicationsPerWeek: this.roundToDecimal(applications.length / weeksInTimespan, 2),
      applicationsPerMonth: this.roundToDecimal(applications.length / monthsInTimespan, 2),
      velocityTrend,
      peakApplicationPeriods
    }
  }

  /**
   * Calculate timeline summary
   */
  private calculateTimelineSummary(applications: JobApplication[]): TimelineSummary {
    if (applications.length === 0) {
      const now = new Date()
      return {
        oldestApplication: now,
        newestApplication: now,
        totalTimespan: 0,
        averageApplicationsPerMonth: 0,
        mostActiveMonth: '',
        leastActiveMonth: ''
      }
    }

    const dates = applications.map(app => app.applicationDate).sort()
    const oldestApplication = dates[0]
    const newestApplication = dates[dates.length - 1]
    const totalTimespan = this.calculateTimespan(applications)

    const monthlyGroups = this.groupApplicationsByPeriod(applications, 'monthly')
    const monthlyCounts = Array.from(monthlyGroups.values()).map(apps => apps.length)
    const averageApplicationsPerMonth = this.roundToDecimal(
      monthlyCounts.reduce((sum, count) => sum + count, 0) / monthlyCounts.length, 2
    )

    const mostActiveEntry = Array.from(monthlyGroups.entries())
      .reduce((max, [month, apps]) => apps.length > max.count ? { month, count: apps.length } : max,
        { month: '', count: 0 })

    const leastActiveEntry = Array.from(monthlyGroups.entries())
      .reduce((min, [month, apps]) => apps.length < min.count ? { month, count: apps.length } : min,
        { month: '', count: Infinity })

    return {
      oldestApplication,
      newestApplication,
      totalTimespan,
      averageApplicationsPerMonth,
      mostActiveMonth: mostActiveEntry.month,
      leastActiveMonth: leastActiveEntry.month
    }
  }

  /**
   * Calculate overall conversion rates through the hiring funnel
   */
  private calculateOverallConversionRates(applications: JobApplication[]): ConversionRates {
    const statusCounts = this.countApplicationsByStatus(applications)

    const total = applications.length
    const phoneScreens = statusCounts.get(JobApplicationStatus.PHONE_SCREEN) || 0
    const technical = statusCounts.get(JobApplicationStatus.TECHNICAL_INTERVIEW) || 0
    const onsite = statusCounts.get(JobApplicationStatus.ONSITE_INTERVIEW) || 0
    const offers = statusCounts.get(JobApplicationStatus.OFFER_RECEIVED) || 0
    const accepted = statusCounts.get(JobApplicationStatus.OFFER_ACCEPTED) || 0

    // Calculate progressive funnel rates
    const phoneScreenTotal = phoneScreens + technical + onsite + offers + accepted
    const technicalTotal = technical + onsite + offers + accepted
    const onsiteTotal = onsite + offers + accepted
    const offerTotal = offers + accepted

    return {
      applicationToPhoneScreen: this.calculatePercentage(phoneScreenTotal, total),
      phoneScreenToTechnical: this.calculatePercentage(technicalTotal, phoneScreenTotal),
      technicalToOnsite: this.calculatePercentage(onsiteTotal, technicalTotal),
      onsiteToOffer: this.calculatePercentage(offerTotal, onsiteTotal),
      offerToAccepted: this.calculatePercentage(accepted, offerTotal),
      overallApplicationToOffer: this.calculatePercentage(offerTotal, total)
    }
  }

  /**
   * Calculate conversion rates by company
   */
  private calculateConversionByCompany(applications: JobApplication[]): CompanyConversion[] {
    const companyGroups = this.groupBy(applications, app => app.company)

    return Array.from(companyGroups.entries()).map(([company, apps]) => ({
      company,
      applicationCount: apps.length,
      conversionRates: this.calculateOverallConversionRates(apps),
      finalOutcomes: this.calculateStatusDistribution(apps)
    }))
  }

  /**
   * Calculate conversion rates by resume
   */
  private calculateConversionByResume(applications: JobApplication[]): any[] {
    const resumeGroups = this.groupBy(applications.filter(app => app.resume), app => app.resume!.id)

    return Array.from(resumeGroups.entries()).map(([resumeId, apps]) => ({
      resumeId,
      versionName: apps[0].resume!.versionName,
      applicationCount: apps.length,
      conversionRates: this.calculateOverallConversionRates(apps)
    }))
  }

  /**
   * Calculate conversion rates by time period
   */
  private calculateConversionByPeriod(applications: JobApplication[], timePeriod: TimePeriod = 'monthly'): any[] {
    const periodGroups = this.groupApplicationsByPeriod(applications, timePeriod)

    return Array.from(periodGroups.entries()).map(([period, apps]) => ({
      period,
      applicationCount: apps.length,
      conversionRates: this.calculateOverallConversionRates(apps)
    }))
  }

  /**
   * Calculate conversion summary with insights
   */
  private calculateConversionSummary(
    companyConversions: CompanyConversion[],
    resumeConversions: any[],
    periodConversions: any[]
  ): ConversionSummary {
    const bestConvertingCompany = companyConversions
      .reduce((best, current) =>
        current.conversionRates.overallApplicationToOffer > (best?.conversionRates.overallApplicationToOffer || 0)
          ? current : best, null as CompanyConversion | null)

    const bestConvertingResume = resumeConversions
      .reduce((best, current) =>
        current.conversionRates.overallApplicationToOffer > (best?.conversionRates.overallApplicationToOffer || 0)
          ? current : best, null)

    const bestConvertingPeriod = periodConversions
      .reduce((best, current) =>
        current.conversionRates.overallApplicationToOffer > (best?.conversionRates.overallApplicationToOffer || 0)
          ? current : best, null)

    return {
      bestConvertingCompany: bestConvertingCompany ? {
        company: bestConvertingCompany.company,
        conversionRate: bestConvertingCompany.conversionRates.overallApplicationToOffer
      } : undefined,
      bestConvertingResume: bestConvertingResume ? {
        id: bestConvertingResume.resumeId,
        versionName: bestConvertingResume.versionName,
        conversionRate: bestConvertingResume.conversionRates.overallApplicationToOffer
      } : undefined,
      bestConvertingPeriod: bestConvertingPeriod ? {
        period: bestConvertingPeriod.period,
        conversionRate: bestConvertingPeriod.conversionRates.overallApplicationToOffer
      } : undefined,
      improvementOpportunities: this.generateImprovementOpportunities(companyConversions, resumeConversions)
    }
  }

  // Helper methods

  private groupApplicationsByPeriod(applications: JobApplication[], timePeriod: TimePeriod): Map<string, JobApplication[]> {
    const groups = new Map<string, JobApplication[]>()

    applications.forEach(app => {
      let periodKey: string

      switch (timePeriod) {
        case 'daily':
          periodKey = app.applicationDate.toISOString().split('T')[0]
          break
        case 'weekly':
          const weekStart = new Date(app.applicationDate)
          weekStart.setDate(weekStart.getDate() - weekStart.getDay())
          periodKey = weekStart.toISOString().split('T')[0]
          break
        case 'monthly':
          periodKey = `${app.applicationDate.getFullYear()}-${String(app.applicationDate.getMonth() + 1).padStart(2, '0')}`
          break
        default:
          periodKey = app.applicationDate.toISOString().split('T')[0]
      }

      if (!groups.has(periodKey)) {
        groups.set(periodKey, [])
      }
      groups.get(periodKey)!.push(app)
    })

    return groups
  }

  private groupBy<T, K>(array: T[], keyFn: (item: T) => K): Map<K, T[]> {
    const groups = new Map<K, T[]>()
    array.forEach(item => {
      const key = keyFn(item)
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(item)
    })
    return groups
  }

  private countApplicationsByStatus(applications: JobApplication[]): Map<JobApplicationStatus, number> {
    const counts = new Map<JobApplicationStatus, number>()
    applications.forEach(app => {
      counts.set(app.status, (counts.get(app.status) || 0) + 1)
    })
    return counts
  }

  private calculateSuccessRate(applications: JobApplication[]): number {
    if (applications.length === 0) {return 0}
    const successfulApplications = applications.filter(app =>
      app.status === JobApplicationStatus.OFFER_RECEIVED ||
      app.status === JobApplicationStatus.OFFER_ACCEPTED
    ).length
    return this.roundToDecimal((successfulApplications / applications.length) * 100, 2)
  }

  private calculateAverageTimeInPipeline(applications: JobApplication[]): number {
    if (applications.length === 0) {return 0}

    // Simplified calculation - in real app would track status progression dates
    const totalDays = applications.reduce((sum, app) => {
      const daysSinceApplication = Math.floor((new Date().getTime() - app.applicationDate.getTime()) / (1000 * 60 * 60 * 24))
      return sum + daysSinceApplication
    }, 0)

    return this.roundToDecimal(totalDays / applications.length, 2)
  }

  private calculateAverageResponseTime(applications: JobApplication[]): number {
    // Simplified - would need status change tracking for accurate calculation
    return this.calculateAverageTimeInPipeline(applications)
  }

  private calculateTimespan(applications: JobApplication[]): number {
    if (applications.length < 2) {return 0}

    const dates = applications.map(app => app.applicationDate).sort()
    const oldestDate = dates[0]
    const newestDate = dates[dates.length - 1]

    return Math.floor((newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24))
  }

  private calculatePercentage(numerator: number, denominator: number): number {
    if (denominator === 0) {return 0}
    return this.roundToDecimal((numerator / denominator) * 100, 2)
  }

  private roundToDecimal(value: number, decimals: number): number {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
  }

  private generateImprovementOpportunities(companyConversions: CompanyConversion[], resumeConversions: any[]): string[] {
    const opportunities: string[] = []

    // Analyze conversion rates for opportunities
    const averageConversion = companyConversions.length > 0
      ? companyConversions.reduce((sum, company) => sum + company.conversionRates.overallApplicationToOffer, 0) / companyConversions.length
      : 0

    if (averageConversion < 10) {
      opportunities.push('Overall conversion rate is low - consider improving resume or application strategy')
    }

    if (resumeConversions.length > 1) {
      const resumeRates = resumeConversions.map(r => r.conversionRates.overallApplicationToOffer)
      const maxRate = Math.max(...resumeRates)
      const minRate = Math.min(...resumeRates)

      if (maxRate - minRate > 20) {
        opportunities.push('Significant difference in resume performance - focus on best performing resume format')
      }
    }

    return opportunities
  }

  private getEffectiveDateRange(filters?: AnalyticsFilters): DateRange {
    if (filters?.dateRange) {
      return filters.dateRange
    }

    // Default to last 90 days
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 90)

    return { startDate, endDate }
  }

  // Empty analytics for error cases

  private getEmptyPipelineAnalytics(): PipelineAnalytics {
    return {
      statusDistribution: [],
      applicationsTrends: [],
      summary: {
        totalApplications: 0,
        activeApplications: 0,
        completedApplications: 0,
        recentActivityCount: 0,
        averageTimeInPipeline: 0
      }
    }
  }

  private getEmptyResumePerformanceAnalytics(): ResumePerformanceAnalytics {
    return {
      resumeMetrics: [],
      summary: {
        totalResumes: 0,
        averageUsagePerResume: 0
      }
    }
  }

  private getEmptyTimelineAnalytics(): TimelineAnalytics {
    return {
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
    }
  }

  private getEmptyConversionAnalytics(): ConversionAnalytics {
    return {
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
    }
  }
}