import { Repository, DataSource } from 'typeorm'

import { BaseRepository } from '../core/BaseRepository'
import { User } from '../entities/User'

/**
 * Repository for user entity operations with authentication-specific methods.
 * Extends BaseRepository to provide user-specific database operations.
 */
export class UserRepository extends BaseRepository<User> {
  constructor(dataSource: DataSource) {
    const repository = dataSource.getRepository(User)
    super(repository)
  }

  /**
   * Finds user by email address for authentication purposes.
   * Used during login and registration to check email uniqueness.
   *
   * @param email User's email address
   * @returns User entity or null if not found
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: { email }
    })
  }

  /**
   * Creates a new user with provided registration data.
   * Assumes password is already hashed before calling this method.
   *
   * @param userData User registration information with hashed password
   * @returns Created user entity
   */
  async createUser(userData: {
    email: string
    password: string
    firstName?: string
    lastName?: string
  }): Promise<User> {
    const user = this.repository.create(userData)
    return this.repository.save(user)
  }

  /**
   * Retrieves all users with active status.
   * Used for administrative operations requiring active user lists.
   *
   * @returns Array of active user entities
   */
  async findActiveUsers(): Promise<User[]> {
    return this.repository.find({
      where: { isActive: true }
    })
  }
}