/**
 * Contact entity for managing professional relationships and networking.
 * Supports interaction tracking and job application associations.
 */

import { Entity, Column, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm'

import { BaseEntity } from '../core/BaseEntity'

import { JobApplication } from './JobApplication'
import { JobApplicationContact } from './JobApplicationContact'
import { User } from './User'

/** Professional roles for contact categorization */
export enum ContactRole {
  RECRUITER = 'Recruiter',
  HIRING_MANAGER = 'Hiring Manager',
  REFERRAL = 'Referral',
  OTHER = 'Other',
}

/** Communication channels for interaction tracking */
export enum CommunicationChannel {
  EMAIL = 'Email',
  LINKEDIN = 'LinkedIn',
  PHONE = 'Phone',
  IN_PERSON = 'In-Person',
  OTHER = 'Other',
}

/**
 * Professional contact entity with interaction tracking and job linking.
 * Supports many-to-many relationships with job applications.
 */
@Entity('contacts')
export class Contact extends BaseEntity {
  /** Contact's full name with search index */
  @Column()
  @Index()
  name: string

  /** Associated company with search index for filtering */
  @Column({ nullable: true })
  @Index()
  company?: string

  /** Professional role for categorization and filtering */
  @Column({
    type: 'enum',
    enum: ContactRole,
    default: ContactRole.OTHER,
  })
  role: ContactRole

  /** Contact email with index for uniqueness validation */
  @Column({ nullable: true })
  @Index()
  email?: string

  @Column({ nullable: true })
  phoneNumber?: string

  @Column({ nullable: true })
  linkedInProfile?: string

  /** Structured interaction history using JSONB for querying */
  @Column({ type: 'jsonb', nullable: true })
  interactions?: {
    date: Date
    channel: CommunicationChannel
    notes?: string
  }[]

  /** Most recent interaction timestamp for sorting and filtering */
  @Column({ type: 'timestamp with time zone', nullable: true })
  lastInteractionDate?: Date

  /** Owning user relationship for data scoping */
  @ManyToOne(() => User, user => user.contacts, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User

  /** Application interactions through junction table for rich tracking */
  @OneToMany(() => JobApplicationContact, applicationContact => applicationContact.contact)
  applicationInteractions?: JobApplicationContact[]

  /** Computed property: Associated job applications for backward compatibility */
  get jobApplications(): JobApplication[] | undefined {
    return this.applicationInteractions?.map(interaction => interaction.jobApplication)
  }
}
