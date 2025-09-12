import { 
  Entity, 
  Column, 
  ManyToOne, 
  JoinColumn, 
  OneToMany,
  ManyToMany,
  Index
} from 'typeorm'
import { BaseEntity } from '../core/BaseEntity'
import { User } from './User'
import { JobApplication } from './JobApplication'

export enum ContactRole {
  RECRUITER = 'Recruiter',
  HIRING_MANAGER = 'Hiring Manager',
  REFERRAL = 'Referral',
  OTHER = 'Other'
}

export enum CommunicationChannel {
  EMAIL = 'Email',
  LINKEDIN = 'LinkedIn',
  PHONE = 'Phone',
  IN_PERSON = 'In-Person',
  OTHER = 'Other'
}

@Entity('contacts')
export class Contact extends BaseEntity {
  @Column()
  @Index()
  name: string

  @Column({ nullable: true })
  @Index()
  company?: string

  @Column({
    type: 'enum',
    enum: ContactRole,
    default: ContactRole.OTHER
  })
  role: ContactRole

  @Column({ nullable: true })
  @Index()
  email?: string

  @Column({ nullable: true })
  phoneNumber?: string

  @Column({ nullable: true })
  linkedInProfile?: string

  @Column({ type: 'jsonb', nullable: true })
  interactions?: {
    date: Date
    channel: CommunicationChannel
    notes?: string
  }[]

  @Column({ type: 'timestamp', nullable: true })
  lastInteractionDate?: Date

  @ManyToOne(() => User, user => user.contacts, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User

  @ManyToMany(() => JobApplication, jobApplication => jobApplication.contacts)
  jobApplications?: JobApplication[]
}