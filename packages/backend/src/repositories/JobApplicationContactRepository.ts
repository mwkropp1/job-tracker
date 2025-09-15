import { DataSource } from 'typeorm'

import { BaseRepository } from '../core/BaseRepository'
import { JobApplicationContact, InteractionType } from '../entities/JobApplicationContact'
import { sanitizePaginationParams } from '../utils/sanitization'

export interface CreateJobApplicationContactData {
  jobApplicationId: string
  contactId: string
  interactionType: InteractionType
  interactionDate: Date
  notes?: string
}

export interface UpdateJobApplicationContactData {
  interactionType?: InteractionType
  interactionDate?: Date
  notes?: string
}

export interface CreateInteractionResult {
  success: boolean
  interaction?: JobApplicationContact
  error?: 'ALREADY_EXISTS' | 'UNAUTHORIZED' | 'VALIDATION_ERROR'
}

export interface InteractionFilters {
  jobApplicationId?: string
  contactId?: string
  interactionType?: InteractionType
  userId?: string // For user scoping validation
  page?: number
  limit?: number
}

export interface InteractionWithPagination {
  interactions: JobApplicationContact[]
  total: number
  totalPages: number
  currentPage: number
}

/**
 * Repository for JobApplicationContact entity operations with comprehensive interaction tracking.
 * Implements secure user-scoped access through related entities and rich filtering capabilities.
 */
export class JobApplicationContactRepository extends BaseRepository<JobApplicationContact> {
  constructor(dataSource: DataSource) {
    const repository = dataSource.getRepository(JobApplicationContact)
    super(repository)
  }

  /**
   * Creates a new interaction between a contact and job application.
   * Validates user ownership through related entities before creation.
   *
   * @param data Interaction data including IDs and metadata
   * @param userId User ID for ownership validation
   * @returns Result object with success status and detailed error information
   */
  async createInteraction(
    data: CreateJobApplicationContactData,
    userId: string
  ): Promise<CreateInteractionResult> {
    // Check if job application exists and belongs to user
    const jobAppRepository = this.repository.manager.getRepository('JobApplication')
    const jobApp = await jobAppRepository.findOne({
      where: { id: data.jobApplicationId, user: { id: userId } }
    })

    if (!jobApp) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    // Check if contact exists and belongs to user
    const contactRepository = this.repository.manager.getRepository('Contact')
    const contact = await contactRepository.findOne({
      where: { id: data.contactId, user: { id: userId } }
    })

    if (!contact) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    // Check if interaction already exists
    const existingInteraction = await this.repository.findOne({
      where: {
        jobApplication: { id: data.jobApplicationId },
        contact: { id: data.contactId }
      }
    })

    if (existingInteraction) {
      return { success: false, error: 'ALREADY_EXISTS' }
    }

    try {
      const interaction = await this.repository.save({
        jobApplication: { id: data.jobApplicationId },
        contact: { id: data.contactId },
        interactionType: data.interactionType,
        interactionDate: data.interactionDate,
        notes: data.notes
      } as JobApplicationContact)

      return { success: true, interaction }
    } catch {
      return { success: false, error: 'VALIDATION_ERROR' }
    }
  }

  /**
   * Finds interaction by ID with user ownership verification.
   * Includes full job application and contact relationships.
   *
   * @param id Interaction identifier
   * @param userId User identifier for ownership verification
   * @returns Interaction with relationships or null if not found/unauthorized
   */
  async findByIdWithUser(id: string, userId: string): Promise<JobApplicationContact | null> {
    return this.repository
      .createQueryBuilder('jac')
      .leftJoinAndSelect('jac.jobApplication', 'ja')
      .leftJoinAndSelect('jac.contact', 'c')
      .leftJoinAndSelect('ja.user', 'u')
      .where('jac.id = :id', { id })
      .andWhere('u.id = :userId', { userId })
      .andWhere('c.user_id = :userId', { userId })
      .getOne()
  }

  /**
   * Retrieves interactions with advanced filtering and pagination.
   * Implements secure user-scoped access and comprehensive filtering options.
   *
   * @param filters Search and pagination parameters with user scoping
   * @returns Paginated interaction results with metadata
   */
  async findWithFilters(filters: InteractionFilters): Promise<InteractionWithPagination> {
    const { jobApplicationId, contactId, interactionType, userId } = filters

    // Apply security sanitization for pagination inputs
    const { page, limit } = sanitizePaginationParams(filters.page, filters.limit)

    let query = this.repository
      .createQueryBuilder('jac')
      .leftJoinAndSelect('jac.jobApplication', 'ja')
      .leftJoinAndSelect('jac.contact', 'c')
      .leftJoinAndSelect('ja.user', 'u')

    // Apply user scoping for security
    if (userId) {
      query = query
        .where('u.id = :userId', { userId })
        .andWhere('c.user_id = :userId', { userId })
    }

    if (jobApplicationId) {
      query = query.andWhere('ja.id = :jobApplicationId', { jobApplicationId })
    }

    if (contactId) {
      query = query.andWhere('c.id = :contactId', { contactId })
    }

    if (interactionType) {
      query = query.andWhere('jac.interactionType = :interactionType', { interactionType })
    }

    const [interactions, total] = await query
      .orderBy('jac.interactionDate', 'DESC')
      .addOrderBy('jac.createdAt', 'DESC')
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount()

    return {
      interactions,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    }
  }

  /**
   * Updates an existing interaction with new data.
   * Validates user ownership before allowing updates.
   *
   * @param id Interaction identifier
   * @param updateData Updated interaction data
   * @param userId User identifier for ownership verification
   * @returns Updated interaction or null if not found/unauthorized
   */
  async updateInteraction(
    id: string,
    updateData: UpdateJobApplicationContactData,
    userId: string
  ): Promise<JobApplicationContact | null> {
    const interaction = await this.findByIdWithUser(id, userId)
    if (!interaction) {
      return null
    }

    Object.assign(interaction, updateData)
    return this.repository.save(interaction)
  }

  /**
   * Removes an interaction between contact and job application.
   * Validates user ownership before allowing deletion.
   *
   * @param id Interaction identifier
   * @param userId User identifier for ownership verification
   * @returns Success status of removal operation
   */
  async removeInteraction(id: string, userId: string): Promise<boolean> {
    const interaction = await this.findByIdWithUser(id, userId)
    if (!interaction) {
      return false
    }

    const result = await this.repository.delete(id)
    return result.affected !== undefined && result.affected > 0
  }

  /**
   * Finds interaction by job application and contact IDs.
   * Used for checking if a relationship already exists.
   *
   * @param jobApplicationId Job application identifier
   * @param contactId Contact identifier
   * @param userId User identifier for ownership verification
   * @returns Existing interaction or null if not found
   */
  async findByApplicationAndContact(
    jobApplicationId: string,
    contactId: string,
    userId: string
  ): Promise<JobApplicationContact | null> {
    return this.repository
      .createQueryBuilder('jac')
      .leftJoinAndSelect('jac.jobApplication', 'ja')
      .leftJoinAndSelect('jac.contact', 'c')
      .leftJoinAndSelect('ja.user', 'u')
      .where('ja.id = :jobApplicationId', { jobApplicationId })
      .andWhere('c.id = :contactId', { contactId })
      .andWhere('u.id = :userId', { userId })
      .andWhere('c.user_id = :userId', { userId })
      .getOne()
  }

  /**
   * Gets interaction statistics for analytics.
   * Returns counts by interaction type for a specific user.
   *
   * @param userId User identifier for scoping statistics
   * @returns Object with interaction type counts
   */
  async getInteractionStats(userId: string): Promise<Record<InteractionType, number>> {
    const stats = await this.repository
      .createQueryBuilder('jac')
      .select('jac.interactionType', 'type')
      .addSelect('COUNT(*)', 'count')
      .leftJoin('jac.jobApplication', 'ja')
      .leftJoin('jac.contact', 'c')
      .where('ja.userId = :userId', { userId })
      .andWhere('c.user_id = :userId', { userId })
      .groupBy('jac.interactionType')
      .getRawMany()

    // Initialize all interaction types with 0
    const result: Record<InteractionType, number> = Object.values(InteractionType).reduce(
      (acc, type) => ({ ...acc, [type]: 0 }),
      {} as Record<InteractionType, number>
    )

    // Fill in actual counts
    stats.forEach(stat => {
      result[stat.type as InteractionType] = parseInt(stat.count)
    })

    return result
  }
}