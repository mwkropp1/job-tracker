import { 
  Entity, 
  Column, 
  ManyToOne, 
  JoinColumn,
  OneToMany,
  Index
} from 'typeorm'

import { BaseEntity } from '../core/BaseEntity'

import { JobApplication } from './JobApplication'
import { User } from './User'

export enum ResumeSource {
  UPLOAD = 'Upload',
  GOOGLE_DRIVE = 'Google Drive',
  GENERATED = 'Generated'
}

@Entity('resumes')
export class Resume extends BaseEntity {
  @Column()
  @Index()
  versionName: string

  @Column()
  fileName: string

  @Column()
  fileUrl: string

  @Column({
    type: 'enum',
    enum: ResumeSource,
    default: ResumeSource.UPLOAD
  })
  source: ResumeSource

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  uploadDate: Date

  @Column({ type: 'date', nullable: true })
  lastUsedDate?: Date

  @Column({ default: 0 })
  applicationCount: number

  @Column({ type: 'text', nullable: true })
  notes?: string

  @Column({ nullable: true })
  externalId?: string

  @ManyToOne(() => User, user => user.resumes, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User

  @OneToMany(() => JobApplication, jobApplication => jobApplication.resume)
  jobApplications: JobApplication[]
}