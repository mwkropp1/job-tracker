/**
 * Abstract base entity providing common fields for all database entities.
 * Includes UUID primary key and automatic timestamp management for auditing.
 */

import {
  BaseEntity as TypeOrmBaseEntity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

/**
 * Base class for all application entities with standard auditing fields.
 * Provides UUID primary key and automatic creation/update timestamps.
 * All domain entities should extend this class for consistency.
 */
export abstract class BaseEntity extends TypeOrmBaseEntity {
  /** UUID primary key generated automatically by database */
  @PrimaryGeneratedColumn('uuid')
  id: string

  /** Timestamp when entity was first created, set automatically */
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date

  /** Timestamp when entity was last modified, updated automatically */
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date
}
