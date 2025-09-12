import { 
  Entity, 
  Column, 
  OneToMany,
  Index
} from 'typeorm'
import { BaseEntity } from '../core/BaseEntity'
import { JobApplication } from './JobApplication'
import { Contact } from './Contact'
import { Resume } from './Resume'

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  @Index({ unique: true })
  email: string

  @Column()
  password: string

  @Column({ nullable: true })
  firstName?: string

  @Column({ nullable: true })
  lastName?: string

  @Column({ default: true })
  isActive: boolean

  @OneToMany(() => JobApplication, jobApplication => jobApplication.user)
  jobApplications: JobApplication[]

  @OneToMany(() => Contact, contact => contact.user)
  contacts: Contact[]

  @OneToMany(() => Resume, resume => resume.user)
  resumes: Resume[]
}