# Test-Driven Development Guide for Job Tracker Backend

## Overview

This document provides comprehensive guidance for implementing Test-Driven Development (TDD) in the Job Tracker backend application. The test suite is designed to ensure code reliability, maintainability, and comprehensive coverage across all application layers.

## Testing Architecture

### Test Structure

```
src/
├── __tests__/
│   ├── controllers/           # Controller unit tests
│   ├── entities/              # Entity/model tests
│   ├── integration/           # API integration tests
│   ├── middleware/            # Middleware tests
│   ├── repositories/          # Repository layer tests
│   ├── services/              # Service layer tests
│   ├── utils/                 # Utility function tests
│   └── README.md              # This guide
├── test/
│   ├── testUtils.ts           # Test utilities and factories
│   ├── testDatabase.ts        # Database test configuration
│   ├── databaseTestSetup.ts   # Database setup for tests
│   └── setup.ts               # Global test setup
```

### Testing Layers

1. **Unit Tests**: Test individual components in isolation
   - Entities/Models
   - Repositories
   - Services
   - Controllers
   - Middleware
   - Utilities

2. **Integration Tests**: Test component interactions
   - API endpoints
   - Database operations
   - Authentication flows

3. **End-to-End Tests**: Test complete user workflows
   - Full authentication cycle
   - Complete CRUD operations
   - Complex business processes

## TDD Workflow

### The Red-Green-Refactor Cycle

#### 1. RED: Write a Failing Test

Start by writing a test that describes the desired behavior:

```typescript
// Example: Adding a new feature
describe('JobApplication', () => {
  it('should archive job application when user marks it as archived', async () => {
    const user = await dbHelpers.createTestUser()
    const jobApp = await dbHelpers.createTestJobApplication(user, {
      isArchived: false
    })

    const result = await jobAppService.archiveApplication(jobApp.id, user.id)

    expect(result.isArchived).toBe(true)
    expect(result.updatedAt).toBeAfter(result.createdAt)
  })
})
```

#### 2. GREEN: Write Minimal Implementation

Write just enough code to make the test pass:

```typescript
// In JobApplicationService
async archiveApplication(id: string, userId: string): Promise<JobApplication> {
  const jobApp = await this.repository.findOneByIdAndUser(id, userId)
  if (!jobApp) throw new Error('Job application not found')

  jobApp.isArchived = true
  return await this.repository.save(jobApp)
}
```

#### 3. REFACTOR: Improve the Code

Enhance the implementation while keeping tests green:

```typescript
// Refactored version with better error handling
async archiveApplication(id: string, userId: string): Promise<JobApplication> {
  const jobApp = await this.repository.findOneByIdAndUser(id, userId)

  if (!jobApp) {
    throw new ApplicationNotFoundError(`Job application ${id} not found for user ${userId}`)
  }

  if (jobApp.isArchived) {
    throw new ApplicationAlreadyArchivedError(`Job application ${id} is already archived`)
  }

  jobApp.isArchived = true
  jobApp.updatedAt = new Date()

  return await this.repository.save(jobApp)
}
```

## Test Categories and Examples

### 1. Entity Tests

Test business logic, validation, and relationships:

```typescript
// entities/JobApplication.test.ts
describe('JobApplication Entity', () => {
  it('should default to APPLIED status', () => {
    const jobApp = new JobApplication()
    expect(jobApp.status).toBe(JobApplicationStatus.APPLIED)
  })

  it('should enforce required fields', async () => {
    const jobApp = new JobApplication()
    // Test validation
  })
})
```

### 2. Repository Tests

Test data access patterns and queries:

```typescript
// repositories/JobApplicationRepository.test.ts
describe('JobApplicationRepository', () => {
  it('should find applications by company with user scoping', async () => {
    const apps = await repository.findByCompany('Google', userId)
    expect(apps.every(app => app.userId === userId)).toBe(true)
  })
})
```

### 3. Service Tests

Test business logic and workflows:

```typescript
// services/JobApplicationService.test.ts
describe('JobApplicationService', () => {
  it('should update usage count when resume is used', async () => {
    const result = await service.createApplication(data)
    // Verify resume usage tracking
  })
})
```

### 4. Controller Tests

Test HTTP request/response handling:

```typescript
// controllers/authController.test.ts
describe('AuthController', () => {
  it('should exclude password from registration response', async () => {
    await controller.register(mockReq, mockRes)
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.not.objectContaining({ password: expect.anything() })
    )
  })
})
```

### 5. Integration Tests

Test complete request flows:

```typescript
// integration/auth.integration.test.ts
describe('Authentication Integration', () => {
  it('should complete full registration -> login -> profile flow', async () => {
    const registerRes = await request(app).post('/auth/register').send(userData)
    const loginRes = await request(app).post('/auth/login').send(credentials)
    const profileRes = await request(app).get('/auth/profile')
      .set('Authorization', `Bearer ${loginRes.body.token}`)

    expect(profileRes.body.user.id).toBe(registerRes.body.user.id)
  })
})
```

## Best Practices

### Test Naming Conventions

```typescript
describe('FeatureName', () => {
  describe('specific functionality', () => {
    it('should [expected behavior] when [condition]', () => {
      // Test implementation
    })

    it('should handle [error case] gracefully', () => {
      // Error handling test
    })
  })
})
```

### Test Organization

1. **Group related tests** using `describe` blocks
2. **Use descriptive test names** that explain the expected behavior
3. **Arrange-Act-Assert** pattern for test structure
4. **One assertion per test** when possible

### Data Management

```typescript
// Use test factories for consistent data creation
const user = TestDataFactory.createMockUser({ email: 'test@example.com' })

// Use database helpers for integration tests
const savedUser = await dbHelpers.createTestUser(userData)

// Clean up after each test
beforeEach(async () => {
  await testDatabase.cleanup()
})
```

### Mocking Strategy

```typescript
// Mock external dependencies
jest.mock('../../services/EmailService')

// Use dependency injection for better testing
class Controller {
  constructor(private emailService: EmailService) {}
}

// Mock at the module level for integration tests
const mockEmailService = {
  sendEmail: jest.fn().mockResolvedValue({ success: true })
}
```

## Test Utilities

### TestDataFactory

Creates consistent mock data:

```typescript
const user = TestDataFactory.createMockUser({
  email: 'custom@example.com',
  firstName: 'Custom'
})

const jobApp = TestDataFactory.createMockJobApplication({
  company: 'Test Company',
  status: JobApplicationStatus.APPLIED
})
```

### Database Helpers

Manages test database operations:

```typescript
// Create test data in database
const user = await dbHelpers.createTestUser()
const jobApp = await dbHelpers.createTestJobApplication(user)

// Assert record counts
await dbHelpers.assertRecordCount(User, 1)
```

### Assertions Helpers

Common assertion patterns:

```typescript
TestAssertions.assertUserResponse(response.body, expectedUser)
TestAssertions.assertPaginationResponse(response.body)
TestAssertions.assertErrorResponse(response.body, 400, 'Validation failed')
```

## Running Tests

### Command Scripts

```bash
# Run all tests
npm test

# Run backend tests only
npm run test:backend

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --testPathPattern="auth.test.ts"

# Run tests matching pattern
npm test -- --testNamePattern="should handle validation"
```

### Test Configuration

Key Jest configuration options:

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
}
```

## Coverage Goals

### Target Coverage Metrics

- **Lines**: 70%+ (aim for 80%+)
- **Functions**: 70%+ (aim for 85%+)
- **Branches**: 70%+ (aim for 75%+)
- **Statements**: 70%+ (aim for 80%+)

### Coverage Focus Areas

1. **Critical business logic**: 95%+ coverage
2. **Authentication/security**: 90%+ coverage
3. **Data validation**: 85%+ coverage
4. **Error handling**: 80%+ coverage
5. **Utility functions**: 90%+ coverage

## Debugging Tests

### Common Issues

1. **Database connection errors**:
   ```bash
   # Install sqlite3 if missing
   npm install --save-dev sqlite3
   ```

2. **Timeout errors**:
   ```typescript
   jest.setTimeout(30000) // Increase timeout for async operations
   ```

3. **Mock interference**:
   ```typescript
   afterEach(() => {
     jest.clearAllMocks()
   })
   ```

### Debug Commands

```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test in debug mode
npm run test:debug -- --testNamePattern="specific test"

# Generate detailed coverage report
npm run test:coverage -- --verbose
```

## Continuous Integration

### Pre-commit Hooks

Tests run automatically before commits via husky:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test && npm run lint"
    }
  }
}
```

### CI/CD Pipeline

Tests should run on:
- Pull request creation
- Code push to main branches
- Before deployment

## Adding New Tests

### For New Features

1. **Start with failing tests** describing the desired behavior
2. **Write minimal implementation** to pass tests
3. **Add edge cases and error handling tests**
4. **Refactor with tests as safety net**

### For Bug Fixes

1. **Write a test that reproduces the bug**
2. **Verify the test fails**
3. **Fix the bug**
4. **Verify the test now passes**
5. **Add related edge case tests**

### Test Checklist

- [ ] Test covers happy path scenarios
- [ ] Test covers error conditions
- [ ] Test covers edge cases and boundary conditions
- [ ] Test names clearly describe expected behavior
- [ ] Test setup and teardown is proper
- [ ] Test is isolated and doesn't depend on other tests
- [ ] Test uses appropriate mocking strategy
- [ ] Test assertions are specific and meaningful

## Common Patterns

### Testing Async Operations

```typescript
it('should handle async operations', async () => {
  const result = await someAsyncOperation()
  expect(result).toBeDefined()
})
```

### Testing Error Conditions

```typescript
it('should throw error for invalid input', async () => {
  await expect(service.invalidOperation()).rejects.toThrow('Expected error message')
})
```

### Testing Database Operations

```typescript
it('should save entity to database', async () => {
  const entity = await repository.save(testData)

  expect(entity.id).toBeDefined()

  const found = await repository.findById(entity.id)
  expect(found).toMatchObject(testData)
})
```

### Testing HTTP Endpoints

```typescript
it('should return 200 for valid request', async () => {
  const response = await request(app)
    .post('/api/endpoint')
    .send(validData)
    .expect(200)

  expect(response.body).toMatchObject(expectedResponse)
})
```

This comprehensive testing strategy ensures code reliability, maintainability, and provides confidence for continuous development and deployment.