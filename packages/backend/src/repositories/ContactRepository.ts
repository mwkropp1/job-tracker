import { Repository, DataSource } from 'typeorm'
import { Contact } from '../entities/Contact'
import { BaseRepository } from '../core/BaseRepository'

export class ContactRepository extends BaseRepository<Contact> {
  constructor(dataSource: DataSource) {
    const repository = dataSource.getRepository(Contact)
    super(repository)
  }

  // Custom methods specific to contacts
  async findByCompany(company: string, userId: string) {
    return this.repository.find({
      where: { 
        company, 
        user: { id: userId } 
      }
    })
  }

  async findByRole(role: string, userId: string) {
    return this.repository.find({
      where: { 
        role: role as any, 
        user: { id: userId } 
      },
      order: { lastInteractionDate: 'DESC' }
    })
  }
}