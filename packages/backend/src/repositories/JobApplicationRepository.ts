import { Repository, DataSource, Like, FindOptionsWhere } from 'typeorm'
import { JobApplication, JobApplicationStatus } from '../entities/JobApplication'
import { BaseRepository } from '../core/BaseRepository'
import { sanitizeSearchQuery, sanitizePaginationParams } from '../utils/sanitization'

export class JobApplicationRepository extends BaseRepository<JobApplication> {
  constructor(dataSource: DataSource) {
    const repository = dataSource.getRepository(JobApplication)
    super(repository)
  }

  // Custom methods specific to job applications
  async findByCompany(company: string, userId: string) {
    return this.repository.find({
      where: { 
        company, 
        user: { id: userId } 
      },
      relations: ['resume', 'contacts']
    })
  }

  async findByStatus(status: JobApplicationStatus, userId: string) {
    return this.repository.find({
      where: {
        status,
        user: { id: userId }
      },
      order: { applicationDate: 'DESC' }
    })
  }

  async findWithFilters(filters: {
    userId: string
    status?: JobApplicationStatus
    company?: string
    archived?: boolean
    page?: number
    limit?: number
  }) {
    const { userId, status, company, archived = false } = filters

    // Sanitize pagination parameters
    const { page, limit } = sanitizePaginationParams(filters.page, filters.limit)

    const where: FindOptionsWhere<JobApplication> = {
      user: { id: userId },
      isArchived: archived
    }

    if (status) {
      where.status = status
    }

    if (company) {
      // Sanitize search query to prevent SQL injection
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

  async findOneByIdAndUser(id: string, userId: string) {
    return this.repository.findOne({
      where: { 
        id,
        user: { id: userId }
      }
    })
  }

  async save(application: JobApplication) {
    return this.repository.save(application)
  }
}