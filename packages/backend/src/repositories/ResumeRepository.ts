import { DataSource, FindOptionsWhere, Like, MoreThan, IsNull } from 'typeorm'

import { BaseRepository } from '../core/BaseRepository'
import { Resume, ResumeSource } from '../entities/Resume'
import { sanitizeSearchQuery, sanitizePaginationParams } from '../utils/sanitization'
import { ANALYTICS_CONSTANTS } from '../constants/validation'
import { logger } from '../utils/logger'

export interface ResumeFilters {
  userId: string
  versionName?: string
  source?: ResumeSource
  hasRecentActivity?: boolean
  page?: number
  limit?: number
}

export interface ResumeWithPagination {
  resumes: Resume[]
  total: number
  totalPages: number
  currentPage: number
}

export interface ResumeAnalytics {
  totalResumes: number
  mostUsedResume: Resume | null
  recentlyUsedResumes: Resume[]
  resumesBySource: Record<ResumeSource, number>
  averageApplicationCount: number
}

/**
 * Repository for resume entity operations with user-scoped access and analytics.
 *
 * Features:
 * - User-scoped data access preventing unauthorized access
 * - Advanced filtering with pagination support
 * - Usage statistics tracking and analytics
 * - Atomic transaction management for relationship operations
 * - Recent activity detection based on configurable time windows
 *
 * Security: All operations are user-scoped to prevent data leakage between users.
 * Performance: Utilizes database indexes for efficient filtering and sorting.
 */
export class ResumeRepository extends BaseRepository<Resume> {
  constructor(dataSource: DataSource) {
    const repository = dataSource.getRepository(Resume)
    super(repository)
  }

  /**
   * Finds resume by ID with user ownership verification.
   * Includes job application relationships for comprehensive resume data.
   *
   * @param id Resume identifier
   * @param userId User identifier for ownership verification
   * @returns Resume with job applications or null if not found/unauthorized
   */
  async findByIdWithUser(id: string, userId: string): Promise<Resume | null> {
    return this.repository.findOne({
      where: {
        id,
        user: { id: userId }
      },
      relations: ['jobApplications', 'user']
    })
  }

  /**
   * Retrieves resumes with advanced filtering and pagination.
   * Implements secure search with SQL injection prevention and user scoping.
   *
   * @param filters Search and pagination parameters with user scoping
   * @returns Paginated resume results with metadata
   */
  async findWithFilters(filters: ResumeFilters): Promise<ResumeWithPagination> {
    const { userId, versionName, source, hasRecentActivity } = filters

    // Apply security sanitization for pagination inputs
    const { page, limit } = sanitizePaginationParams(filters.page, filters.limit)

    const whereConditions: FindOptionsWhere<Resume> = {
      user: { id: userId }
    }

    if (versionName) {
      // Apply SQL injection protection for version name search
      const sanitizedVersionName = sanitizeSearchQuery(versionName)
      whereConditions.versionName = Like(`%${sanitizedVersionName}%`)
    }

    if (source) {
      whereConditions.source = source
    }

    if (hasRecentActivity === true) {
      const recentActivityDate = new Date()
      recentActivityDate.setDate(recentActivityDate.getDate() - ANALYTICS_CONSTANTS.RECENT_ACTIVITY_DAYS)
      whereConditions.lastUsedDate = MoreThan(recentActivityDate)
    } else if (hasRecentActivity === false) {
      whereConditions.lastUsedDate = IsNull()
    }

    const [resumes, total] = await this.repository.findAndCount({
      where: whereConditions,
      relations: ['jobApplications'],
      order: {
        lastUsedDate: 'DESC',
        createdAt: 'DESC'
      },
      take: limit,
      skip: (page - 1) * limit
    })

    return {
      resumes,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    }
  }

  /**
   * Finds resumes by source type with user scoping.
   * Results are sorted by most recently used and creation date.
   *
   * @param source Resume source enum value
   * @param userId User identifier for scoping results
   * @returns Array of resumes from specified source
   */
  async findBySource(source: ResumeSource, userId: string): Promise<Resume[]> {
    return this.repository.find({
      where: {
        source,
        user: { id: userId }
      },
      relations: ['jobApplications'],
      order: {
        lastUsedDate: 'DESC',
        uploadDate: 'DESC'
      }
    })
  }

  /**
   * Finds resume by version name within user's resume collection.
   * Used for duplicate prevention and version management.
   *
   * @param versionName Resume version name
   * @param userId User identifier for scoping search
   * @returns Resume with matching version name or null if not found
   */
  async findByVersionName(versionName: string, userId: string): Promise<Resume | null> {
    return this.repository.findOne({
      where: {
        versionName,
        user: { id: userId }
      },
      relations: ['jobApplications']
    })
  }

  /**
   * Retrieves comprehensive analytics for user's resume collection.
   * Provides insights into usage patterns and resume effectiveness.
   *
   * @param userId User identifier for analytics scope
   * @returns Comprehensive resume analytics data
   */
  async getAnalytics(userId: string): Promise<ResumeAnalytics> {
    const allResumes = await this.repository.find({
      where: { user: { id: userId } },
      relations: ['jobApplications']
    })

    const totalResumes = allResumes.length

    // Most used resume
    const mostUsedResume = allResumes.length > 0
      ? allResumes.reduce((prev, current) =>
          current.applicationCount > prev.applicationCount ? current : prev
        )
      : null

    const recentUsageDate = new Date()
    recentUsageDate.setDate(recentUsageDate.getDate() - ANALYTICS_CONSTANTS.RECENT_ANALYTICS_DAYS)

    const recentlyUsedResumes = allResumes
      .filter(resume => resume.lastUsedDate && resume.lastUsedDate > recentUsageDate)
      .sort((a, b) => (b.lastUsedDate?.getTime() || 0) - (a.lastUsedDate?.getTime() || 0))
      .slice(0, ANALYTICS_CONSTANTS.RECENT_RESUMES_LIMIT)

    // Resume count by source
    const resumesBySource = allResumes.reduce((acc, resume) => {
      acc[resume.source] = (acc[resume.source] || 0) + 1
      return acc
    }, Object.create(null) as Record<ResumeSource, number>)

    // Ensure all sources have a count (defaulting to 0)
    Object.values(ResumeSource).forEach(source => {
      if (!(source in resumesBySource)) {
        resumesBySource[source] = 0
      }
    })

    // Average application count
    const averageApplicationCount = totalResumes > 0
      ? allResumes.reduce((sum, resume) => sum + resume.applicationCount, 0) / totalResumes
      : 0

    return {
      totalResumes,
      mostUsedResume,
      recentlyUsedResumes,
      resumesBySource,
      averageApplicationCount
    }
  }

  /**
   * Updates resume usage statistics when linked to job applications.
   * Increments application count and updates last used date.
   *
   * @param resumeId Resume identifier
   * @returns Success status of usage update
   */
  async updateUsageStats(resumeId: string): Promise<boolean> {
    try {
      const result = await this.repository
        .createQueryBuilder()
        .update(Resume)
        .set({
          applicationCount: () => 'application_count + 1',
          lastUsedDate: new Date()
        })
        .where('id = :id', { id: resumeId })
        .execute()

      return (result.affected ?? 0) > 0
    } catch (error) {
      logger.error('Error updating resume usage stats', {
        resumeId,
        error: error instanceof Error ? error.message : String(error)
      })
      return false
    }
  }

  /**
   * Decrements application count when resume is unlinked from job application.
   * Ensures count never goes below zero.
   *
   * @param resumeId Resume identifier
   * @returns Success status of usage decrement
   */
  async decrementUsageStats(resumeId: string): Promise<boolean> {
    try {
      const result = await this.repository
        .createQueryBuilder()
        .update(Resume)
        .set({
          applicationCount: () => 'GREATEST(application_count - 1, 0)'
        })
        .where('id = :id', { id: resumeId })
        .execute()

      return (result.affected ?? 0) > 0
    } catch (error) {
      logger.error('Error decrementing resume usage stats', {
        resumeId,
        error: error instanceof Error ? error.message : String(error)
      })
      return false
    }
  }

  /**
   * Links resume to job application and updates usage statistics.
   * Creates relationship and tracks usage in a single transaction.
   *
   * @param resumeId Resume identifier
   * @param jobApplicationId Job application identifier
   * @returns Success status of link and usage update
   */
  async linkToJobApplication(resumeId: string, jobApplicationId: string): Promise<boolean> {
    const queryRunner = this.repository.manager.connection.createQueryRunner()

    try {
      await queryRunner.startTransaction()

      // Create the relationship
      await queryRunner.manager
        .createQueryBuilder()
        .relation(Resume, 'jobApplications')
        .of(resumeId)
        .add(jobApplicationId)

      // Update usage statistics
      await queryRunner.manager
        .createQueryBuilder()
        .update(Resume)
        .set({
          applicationCount: () => 'application_count + 1',
          lastUsedDate: new Date()
        })
        .where('id = :id', { id: resumeId })
        .execute()

      await queryRunner.commitTransaction()
      return true
    } catch (error) {
      await queryRunner.rollbackTransaction()
      logger.error('Error linking resume to job application', {
        resumeId,
        jobApplicationId,
        error: error instanceof Error ? error.message : String(error)
      })
      return false
    } finally {
      await queryRunner.release()
    }
  }

  /**
   * Unlinks resume from job application and decrements usage statistics.
   * Removes relationship and updates usage in a single transaction.
   *
   * @param resumeId Resume identifier
   * @param jobApplicationId Job application identifier
   * @returns Success status of unlink and usage update
   */
  async unlinkFromJobApplication(resumeId: string, jobApplicationId: string): Promise<boolean> {
    const queryRunner = this.repository.manager.connection.createQueryRunner()

    try {
      await queryRunner.startTransaction()

      // Remove the relationship
      await queryRunner.manager
        .createQueryBuilder()
        .relation(Resume, 'jobApplications')
        .of(resumeId)
        .remove(jobApplicationId)

      // Decrement usage statistics
      await queryRunner.manager
        .createQueryBuilder()
        .update(Resume)
        .set({
          applicationCount: () => 'GREATEST(application_count - 1, 0)'
        })
        .where('id = :id', { id: resumeId })
        .execute()

      await queryRunner.commitTransaction()
      return true
    } catch (error) {
      await queryRunner.rollbackTransaction()
      logger.error('Error unlinking resume from job application', {
        resumeId,
        jobApplicationId,
        error: error instanceof Error ? error.message : String(error)
      })
      return false
    } finally {
      await queryRunner.release()
    }
  }

  /**
   * Gets the most used resume for a user.
   * Returns the resume with the highest application count.
   *
   * @param userId User identifier for scoping results
   * @returns Most used resume or null if no resumes exist
   */
  async getMostUsedResume(userId: string): Promise<Resume | null> {
    return this.repository.findOne({
      where: { user: { id: userId } },
      relations: ['jobApplications'],
      order: { applicationCount: 'DESC' }
    })
  }

  /**
   * Gets recently used resumes for quick access.
   * Returns resumes used within the specified number of days.
   *
   * @param userId User identifier for scoping results
   * @param days Number of days to look back (default: 30)
   * @param limit Maximum number of resumes to return (default: 10)
   * @returns Array of recently used resumes sorted by last used date
   */
  async getRecentlyUsedResumes(
    userId: string,
    days: number = ANALYTICS_CONSTANTS.RECENT_ANALYTICS_DAYS,
    limit: number = 10
  ): Promise<Resume[]> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    return this.repository.find({
      where: {
        user: { id: userId },
        lastUsedDate: MoreThan(cutoffDate)
      },
      relations: ['jobApplications'],
      order: { lastUsedDate: 'DESC' },
      take: limit
    })
  }

  /**
   * Updates file path when resume file is moved or renamed.
   * Used during file storage operations and migrations.
   *
   * @param resumeId Resume identifier
   * @param newFilePath New file path
   * @returns Success status of path update
   */
  async updateFilePath(resumeId: string, newFilePath: string): Promise<boolean> {
    try {
      const result = await this.repository.update(resumeId, {
        fileUrl: newFilePath
      })
      return (result.affected ?? 0) > 0
    } catch (error) {
      logger.error('Error updating resume file path', {
        resumeId,
        newFilePath,
        error: error instanceof Error ? error.message : String(error)
      })
      return false
    }
  }
}