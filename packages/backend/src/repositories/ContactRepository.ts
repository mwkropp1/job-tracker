import { Repository, DataSource, FindOptionsWhere, Like, IsNull, Not } from 'typeorm'
import { Contact, ContactRole } from '../entities/Contact'
import { BaseRepository } from '../core/BaseRepository'

export interface ContactFilters {
  userId: string
  company?: string
  role?: ContactRole
  hasRecentInteractions?: boolean
  page?: number
  limit?: number
}

export interface ContactWithPagination {
  contacts: Contact[]
  total: number
  totalPages: number
  currentPage: number
}

export class ContactRepository extends BaseRepository<Contact> {
  constructor(dataSource: DataSource) {
    const repository = dataSource.getRepository(Contact)
    super(repository)
  }

  async findByIdWithUser(id: string, userId: string): Promise<Contact | null> {
    return this.repository.findOne({
      where: {
        id,
        user: { id: userId }
      },
      relations: ['jobApplications']
    })
  }

  async findWithFilters(filters: ContactFilters): Promise<ContactWithPagination> {
    const { userId, company, role, hasRecentInteractions, page = 1, limit = 10 } = filters

    const whereConditions: FindOptionsWhere<Contact> = {
      user: { id: userId }
    }

    if (company) {
      whereConditions.company = Like(`%${company}%`)
    }

    if (role) {
      whereConditions.role = role
    }

    if (hasRecentInteractions === true) {
      whereConditions.lastInteractionDate = Not(IsNull())
    } else if (hasRecentInteractions === false) {
      whereConditions.lastInteractionDate = IsNull()
    }

    const [contacts, total] = await this.repository.findAndCount({
      where: whereConditions,
      relations: ['jobApplications'],
      order: {
        lastInteractionDate: 'DESC',
        createdAt: 'DESC'
      },
      take: limit,
      skip: (page - 1) * limit
    })

    return {
      contacts,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    }
  }

  async findByCompany(company: string, userId: string): Promise<Contact[]> {
    return this.repository.find({
      where: {
        company: Like(`%${company}%`),
        user: { id: userId }
      },
      order: { lastInteractionDate: 'DESC', createdAt: 'DESC' }
    })
  }

  async findByRole(role: ContactRole, userId: string): Promise<Contact[]> {
    return this.repository.find({
      where: {
        role,
        user: { id: userId }
      },
      order: { lastInteractionDate: 'DESC', createdAt: 'DESC' }
    })
  }

  async findByEmail(email: string, userId: string): Promise<Contact | null> {
    return this.repository.findOne({
      where: {
        email: email.toLowerCase(),
        user: { id: userId }
      }
    })
  }

  async linkToJobApplication(contactId: string, jobApplicationId: string): Promise<boolean> {
    try {
      await this.repository
        .createQueryBuilder()
        .relation(Contact, 'jobApplications')
        .of(contactId)
        .add(jobApplicationId)
      return true
    } catch (error) {
      console.error('Error linking contact to job application:', error)
      return false
    }
  }

  async unlinkFromJobApplication(contactId: string, jobApplicationId: string): Promise<boolean> {
    try {
      await this.repository
        .createQueryBuilder()
        .relation(Contact, 'jobApplications')
        .of(contactId)
        .remove(jobApplicationId)
      return true
    } catch (error) {
      console.error('Error unlinking contact from job application:', error)
      return false
    }
  }
}