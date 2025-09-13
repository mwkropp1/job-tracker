import { Repository, DataSource } from 'typeorm'
import { JobApplication } from '../entities/JobApplication'
import { BaseRepository } from '../core/BaseRepository'

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

  async findByStatus(status: string, userId: string) {
    return this.repository.find({
      where: { 
        status: status as any, 
        user: { id: userId } 
      },
      order: { applicationDate: 'DESC' }
    })
  }

  async findWithFilters(filters: {
    userId: string
    status?: string
    company?: string
    archived?: boolean
    page?: number
    limit?: number
  }) {
    const { userId, status, company, archived = false, page = 1, limit = 10 } = filters
    
    const where: any = {
      user: { id: userId },
      isArchived: archived
    }

    if (status) {
      where.status = status as any
    }

    if (company) {
      const { Like } = require('typeorm')
      where.company = Like(`%${company}%`)
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