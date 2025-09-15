/**
 * Database test lifecycle management
 * Provides automatic database initialization, cleanup, and isolation between tests
 */

import { testDatabase } from './testDatabase'
import { TEST_CONSTANTS } from './constants'

beforeAll(async () => {
  await testDatabase.initialize()
}, TEST_CONSTANTS.TIMEOUTS.INTEGRATION)

afterAll(async () => {
  await testDatabase.close()
}, TEST_CONSTANTS.TIMEOUTS.DATABASE_OPERATION)

afterEach(async () => {
  await testDatabase.cleanup()
}, TEST_CONSTANTS.TIMEOUTS.DATABASE_OPERATION)

export { testDatabase }