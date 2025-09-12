import { Repository, DataSource } from 'typeorm'
import { JobApplication } from '../entities/JobApplication'
import { BaseRepository } from '../core/BaseRepository'

export class JobApplicationRepository extends BaseRepository<JobApplication> {
  private repository: Repository<JobApplication>

  constructor(dataSource: DataSource) {
    const repository = dataSource.getRepository(JobApplication)
    super(repository)
    this.repository = repository
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
}