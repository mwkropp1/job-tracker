/**
 * Database test lifecycle management
 * Provides automatic database initialization, cleanup, and isolation between tests
 */

import { testDatabase } from './testDatabase'

beforeAll(async () => {
  await testDatabase.initialize()
})

afterAll(async () => {
  await testDatabase.close()
})

afterEach(async () => {
  await testDatabase.cleanup()
})

export { testDatabase }