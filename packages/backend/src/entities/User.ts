/**
 * User entity representing authenticated users in the job tracking system.
 * Manages user credentials, profile information, and relationships to job-related data.
 */

import {
  Entity,
  Column,
  OneToMany,
  Index
} from 'typeorm'

import { BaseEntity } from '../core/BaseEntity'

import { Contact } from './Contact'
import { JobApplication } from './JobApplication'
import { Resume } from './Resume'

/**
 * User entity with authentication and profile management.
 * Extends BaseEntity for UUID primary key and audit timestamps.
 */
@Entity('users')
export class User extends BaseEntity {
  /** Unique email address for authentication and communication */
  @Column({ unique: true })
  @Index({ unique: true })
  email: string

  /** Bcrypt hashed password for secure authentication */
  @Column()
  password: string

  @Column({ nullable: true })
  firstName?: string

  @Column({ nullable: true })
  lastName?: string

  /** Account status flag for deactivation without deletion */
  @Column({ default: true })
  isActive: boolean

  /** User's job applications with cascade delete behavior */
  @OneToMany(() => JobApplication, jobApplication => jobApplication.user)
  jobApplications: JobApplication[]

  /** User's professional contacts with cascade delete behavior */
  @OneToMany(() => Contact, contact => contact.user)
  contacts: Contact[]

  /** User's resume versions with cascade delete behavior */
  @OneToMany(() => Resume, resume => resume.user)
  resumes: Resume[]
}