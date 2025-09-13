import { Repository, DataSource } from 'typeorm'
import { Resume } from '../entities/Resume'
import { BaseRepository } from '../core/BaseRepository'

export class ResumeRepository extends BaseRepository<Resume> {
  constructor(dataSource: DataSource) {
    const repository = dataSource.getRepository(Resume)
    super(repository)
  }

  // Custom methods specific to resumes
  async findBySource(source: string, userId: string) {
    return this.repository.find({
      where: { 
        source: source as any, 
        user: { id: userId } 
      },
      order: { uploadDate: 'DESC' }
    })
  }

  async getMostUsedResume(userId: string) {
    return this.repository.findOne({
      where: { user: { id: userId } },
      order: { applicationCount: 'DESC' }
    })
  }
}