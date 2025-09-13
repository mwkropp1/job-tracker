import { Repository, DataSource } from 'typeorm'
import { User } from '../entities/User'
import { BaseRepository } from '../core/BaseRepository'

export class UserRepository extends BaseRepository<User> {
  constructor(dataSource: DataSource) {
    const repository = dataSource.getRepository(User)
    super(repository)
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: { email }
    })
  }

  async createUser(userData: {
    email: string
    password: string
    firstName?: string
    lastName?: string
  }): Promise<User> {
    const user = this.repository.create(userData)
    return this.repository.save(user)
  }

  async findActiveUsers(): Promise<User[]> {
    return this.repository.find({
      where: { isActive: true }
    })
  }
}