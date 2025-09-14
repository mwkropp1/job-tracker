import { Repository, DataSource, Like, FindOptionsWhere } from 'typeorm'

import { BaseRepository } from '../core/BaseRepository'
import { JobApplication, JobApplicationStatus } from '../entities/JobApplication'
import { sanitizeSearchQuery, sanitizePaginationParams } from '../utils/sanitization'

/**
 * Repository for job application entity operations with user scoping and filtering.
 * Provides comprehensive search, pagination, and relationship management capabilities.
 */
export class JobApplicationRepository extends BaseRepository<JobApplication> {
  constructor(dataSource: DataSource) {
    const repository = dataSource.getRepository(JobApplication)
    super(repository)
  }

  /**
   * Finds job applications by company name with user scoping.
   * Includes resume and contact relationships for comprehensive data.
   *
   * @param company Exact company name match
   * @param userId User identifier for scoping results
   * @returns Array of job applications with related entities
   */
  async findByCompany(company: string, userId: string) {
    return this.repository.find({
      where: { 
        company, 
        user: { id: userId } 
      },
      relations: ['resume', 'contacts']
    })
  }

  /**
   * Retrieves job applications filtered by application status.
   * Results are user-scoped and ordered by application date.
   *
   * @param status Application status enum value
   * @param userId User identifier for scoping results
   * @returns Array of applications sorted by newest first
   */
  async findByStatus(status: JobApplicationStatus, userId: string) {
    return this.repository.find({
      where: {
        status,
        user: { id: userId }
      },
      order: { applicationDate: 'DESC' }
    })
  }

  /**
   * Advanced filtering and pagination for job applications.
   * Implements secure search with SQL injection protection and archive support.
   *
   * @param filters Comprehensive filtering and pagination parameters
   * @returns Paginated results with metadata and resume relationships
   */
  async findWithFilters(filters: {
    userId: string
    status?: JobApplicationStatus
    company?: string
    archived?: boolean
    page?: number
    limit?: number
  }) {
    const { userId, status, company, archived = false } = filters

    // Apply security sanitization for pagination inputs
    const { page, limit } = sanitizePaginationParams(filters.page, filters.limit)

    const where: FindOptionsWhere<JobApplication> = {
      user: { id: userId },
      isArchived: archived
    }

    if (status) {
      where.status = status
    }

    if (company) {
      // Apply SQL injection protection for company search
      const sanitizedCompany = sanitizeSearchQuery(company)
      where.company = Like(`%${sanitizedCompany}%`)
    }

    const [applications, total] = await this.repository.findAndCount({
      where,
      relations: ['resume'],
      take: limit,
      skip: (page - 1) * limit,
      order: { applicationDate: 'DESC' }
    })

    return {
      applications,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    }
  }

  /**
   * Finds single job application by ID with user ownership verification.
   * Ensures users can only access their own application data.
   *
   * @param id Job application identifier
   * @param userId User identifier for ownership verification
   * @returns Job application or null if not found/unauthorized
   */
  async findOneByIdAndUser(id: string, userId: string) {
    return this.repository.findOne({
      where: { 
        id,
        user: { id: userId }
      }
    })
  }

  /**
   * Persists job application entity changes to database.
   * Used for archive/restore operations and status updates.
   *
   * @param application Job application entity with modifications
   * @returns Saved job application entity
   */
  async save(application: JobApplication) {
    return this.repository.save(application)
  }
}