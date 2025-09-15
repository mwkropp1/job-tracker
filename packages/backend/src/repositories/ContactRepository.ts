import { Repository, DataSource, FindOptionsWhere, Like, IsNull, Not } from 'typeorm'

import { BaseRepository } from '../core/BaseRepository'
import { Contact, ContactRole } from '../entities/Contact'
import { sanitizeSearchQuery, sanitizePaginationParams } from '../utils/sanitization'

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

/**
 * Repository for contact entity operations with user-scoped access and security.
 * Implements advanced filtering, search capabilities, and job application linking.
 */
export class ContactRepository extends BaseRepository<Contact> {
  constructor(dataSource: DataSource) {
    const repository = dataSource.getRepository(Contact)
    super(repository)
  }

  /**
   * Finds contact by ID with user ownership verification.
   * Includes job application relationships for comprehensive contact data.
   *
   * @param id Contact identifier
   * @param userId User identifier for ownership verification
   * @returns Contact with job applications or null if not found/unauthorized
   */
  async findByIdWithUser(id: string, userId: string): Promise<Contact | null> {
    return this.repository.findOne({
      where: {
        id,
        user: { id: userId }
      },
      relations: ['applicationInteractions', 'applicationInteractions.jobApplication']
    })
  }

  /**
   * Retrieves contacts with advanced filtering and pagination.
   * Implements secure search with SQL injection prevention and user scoping.
   *
   * @param filters Search and pagination parameters with user scoping
   * @returns Paginated contact results with metadata
   */
  async findWithFilters(filters: ContactFilters): Promise<ContactWithPagination> {
    const { userId, company, role, hasRecentInteractions } = filters

    // Apply security sanitization for pagination inputs
    const { page, limit } = sanitizePaginationParams(filters.page, filters.limit)

    const whereConditions: FindOptionsWhere<Contact> = {
      user: { id: userId }
    }

    if (company) {
      // Apply SQL injection protection for company search
      const sanitizedCompany = sanitizeSearchQuery(company)
      whereConditions.company = Like(`%${sanitizedCompany}%`)
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
      relations: ['applicationInteractions', 'applicationInteractions.jobApplication'],
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

  /**
   * Finds contacts by company name with fuzzy matching.
   * Implements secure search with user scoping and SQL injection protection.
   *
   * @param company Company name for fuzzy search
   * @param userId User identifier for scoping results
   * @returns Array of matching contacts sorted by interaction date
   */
  async findByCompany(company: string, userId: string): Promise<Contact[]> {
    // Apply SQL injection protection for company search
    const sanitizedCompany = sanitizeSearchQuery(company)

    return this.repository.find({
      where: {
        company: Like(`%${sanitizedCompany}%`),
        user: { id: userId }
      },
      order: { lastInteractionDate: 'DESC', createdAt: 'DESC' }
    })
  }

  /**
   * Finds contacts by their professional role.
   * Results are user-scoped and sorted by interaction recency.
   *
   * @param role Professional role enum value
   * @param userId User identifier for scoping results
   * @returns Array of contacts with specified role
   */
  async findByRole(role: ContactRole, userId: string): Promise<Contact[]> {
    return this.repository.find({
      where: {
        role,
        user: { id: userId }
      },
      order: { lastInteractionDate: 'DESC', createdAt: 'DESC' }
    })
  }

  /**
   * Finds contact by email within user's contact list.
   * Used for duplicate prevention during contact creation and updates.
   *
   * @param email Contact's email address (normalized to lowercase)
   * @param userId User identifier for scoping search
   * @returns Contact with matching email or null if not found
   */
  async findByEmail(email: string, userId: string): Promise<Contact | null> {
    return this.repository.findOne({
      where: {
        email: email.toLowerCase(),
        user: { id: userId }
      }
    })
  }

  /**
   * @deprecated Use JobApplicationContactRepository.createInteraction instead
   * This method is kept for backward compatibility but will be removed in a future version.
   * Creates many-to-many relationship between contact and job application.
   * Uses TypeORM query builder for efficient relationship management.
   *
   * @param contactId Contact identifier
   * @param jobApplicationId Job application identifier
   * @returns Success status of link operation
   */
  async linkToJobApplication(contactId: string, jobApplicationId: string): Promise<boolean> {
    // Note: This method is deprecated and should not be used for new development
    try {
      await this.repository
        .createQueryBuilder()
        .relation(Contact, 'applicationInteractions')
        .of(contactId)
        .add(jobApplicationId)
      return true
    } catch (error) {
      console.error('Error linking contact to job application:', error)
      return false
    }
  }

  /**
   * @deprecated Use JobApplicationContactRepository.removeInteraction instead
   * This method is kept for backward compatibility but will be removed in a future version.
   * Removes many-to-many relationship between contact and job application.
   * Maintains referential integrity while breaking the association.
   *
   * @param contactId Contact identifier
   * @param jobApplicationId Job application identifier
   * @returns Success status of unlink operation
   */
  async unlinkFromJobApplication(contactId: string, jobApplicationId: string): Promise<boolean> {
    // Note: This method is deprecated and should not be used for new development
    try {
      await this.repository
        .createQueryBuilder()
        .relation(Contact, 'applicationInteractions')
        .of(contactId)
        .remove(jobApplicationId)
      return true
    } catch (error) {
      console.error('Error unlinking contact from job application:', error)
      return false
    }
  }
}