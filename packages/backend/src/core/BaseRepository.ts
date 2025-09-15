/**
 * Generic repository base class providing common CRUD operations for all entities.
 * Implements standard database operations with consistent error handling and type safety.
 */

import { Repository, FindOptionsWhere, DeepPartial } from 'typeorm'

import { BaseEntity } from './BaseEntity'

/**
 * Abstract repository providing CRUD operations for entities extending BaseEntity.
 * Encapsulates common database patterns and provides type-safe operations.
 * Specific repositories should extend this class for domain-specific methods.
 *
 * @template T Entity type extending BaseEntity
 */
export class BaseRepository<T extends BaseEntity> {
  constructor(protected repository: Repository<T>) {}

  /**
   * Finds entity by its UUID primary key.
   *
   * @param id UUID of the entity to find
   * @returns Promise resolving to entity or null if not found
   */
  async findById(id: string): Promise<T | null> {
    return this.repository.findOne({
      where: { id } as FindOptionsWhere<T>
    })
  }

  /**
   * Creates new entity with provided data.
   * Automatically sets audit timestamps via BaseEntity.
   *
   * @param data Partial entity data for creation
   * @returns Promise resolving to created entity with generated ID
   */
  async create(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(data)
    return this.repository.save(entity)
  }

  /**
   * Updates existing entity by ID with partial data.
   * Updates modification timestamp automatically.
   *
   * @param id UUID of entity to update
   * @param data Partial entity data for update
   * @returns Promise resolving to updated entity or null if not found
   */
  async update(id: string, data: DeepPartial<T>): Promise<T | null> {
    await this.repository.update(id, data as any)
    return this.findById(id)
  }

  /**
   * Permanently removes entity from database by ID.
   *
   * @param id UUID of entity to delete
   * @returns Promise resolving to true if entity was deleted, false if not found
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id)
    return (result.affected ?? 0) > 0
  }

  /**
   * Retrieves all entities matching optional criteria.
   *
   * @param options TypeORM find options for filtering, sorting, relations
   * @returns Promise resolving to array of matching entities
   */
  async findAll(options?: any): Promise<T[]> {
    return this.repository.find(options)
  }

  /**
   * Counts entities matching optional criteria.
   *
   * @param options TypeORM find options for filtering
   * @returns Promise resolving to count of matching entities
   */
  async count(options?: any): Promise<number> {
    return this.repository.count(options)
  }
}