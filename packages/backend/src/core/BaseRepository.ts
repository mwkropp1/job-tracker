import { Repository, FindOptionsWhere, DeepPartial } from 'typeorm'
import { BaseEntity } from './BaseEntity'

export class BaseRepository<T extends BaseEntity> {
  constructor(protected repository: Repository<T>) {}

  async findById(id: string): Promise<T | null> {
    return this.repository.findOne({ 
      where: { id } as FindOptionsWhere<T> 
    })
  }

  async create(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(data)
    return this.repository.save(entity)
  }

  async update(id: string, data: DeepPartial<T>): Promise<T | null> {
    await this.repository.update(id, data as any)
    return this.findById(id)
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id)
    return (result.affected ?? 0) > 0
  }

  async findAll(options?: any): Promise<T[]> {
    return this.repository.find(options)
  }

  async count(options?: any): Promise<number> {
    return this.repository.count(options)
  }
}