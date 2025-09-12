import { 
  Entity, 
  Column, 
  ManyToOne, 
  JoinColumn, 
  ManyToMany,
  JoinTable,
  Index
} from 'typeorm'
import { BaseEntity } from '../core/BaseEntity'
import { User } from './User'
import { Resume } from './Resume'
import { Contact } from './Contact'

export enum JobApplicationStatus {
  APPLIED = 'Applied',
  PHONE_SCREEN = 'Phone Screen',
  TECHNICAL_INTERVIEW = 'Technical Interview',
  ONSITE_INTERVIEW = 'Onsite Interview',
  OFFER_RECEIVED = 'Offer Received',
  OFFER_ACCEPTED = 'Offer Accepted',
  DECLINED = 'Declined',
  REJECTED = 'Rejected'
}

@Entity('job_applications')
export class JobApplication extends BaseEntity {
  @Column()
  @Index()
  company: string

  @Column()
  @Index()
  jobTitle: string

  @Column({ type: 'text', nullable: true })
  jobDescription?: string

  @Column({ type: 'date' })
  applicationDate: Date

  @Column({
    type: 'enum',
    enum: JobApplicationStatus,
    default: JobApplicationStatus.APPLIED
  })
  status: JobApplicationStatus

  @Column({ nullable: true })
  jobListingUrl?: string

  @Column({ type: 'text', nullable: true })
  notes?: string

  @Column({ default: false })
  isArchived: boolean

  @ManyToOne(() => User, user => user.jobApplications, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User

  @ManyToOne(() => Resume, resume => resume.jobApplications, { nullable: true })
  @JoinColumn({ name: 'resume_id' })
  resume?: Resume

  @ManyToMany(() => Contact, contact => contact.jobApplications, { nullable: true })
  @JoinTable({
    name: 'job_application_contacts',
    joinColumn: { name: 'job_application_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'contact_id', referencedColumnName: 'id' }
  })
  contacts?: Contact[]
}