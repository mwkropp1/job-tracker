# Testing Guide

This document outlines the testing strategy and setup for the Job Tracker frontend application.

## Overview

Our testing strategy follows industry best practices with a comprehensive approach covering:

- **Unit Tests**: Individual functions, components, and utilities
- **Integration Tests**: Component interactions and API integrations
- **End-to-End Tests**: Complete user workflows and scenarios

## Testing Stack

### Core Technologies

- **[Vitest](https://vitest.dev/)**: Fast unit test runner with native ESM and TypeScript support
- **[React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)**: Testing utilities focused on user interactions
- **[Playwright](https://playwright.dev/)**: Cross-browser end-to-end testing
- **[MSW](https://mswjs.io/)**: API mocking for isolated testing
- **[Jest DOM](https://github.com/testing-library/jest-dom)**: Extended matchers for DOM assertions

### Testing Philosophy

We follow the **Testing Trophy** approach:
1. **Static Analysis** (ESLint, TypeScript)
2. **Unit Tests** (70% of our tests)
3. **Integration Tests** (20% of our tests)
4. **E2E Tests** (10% of our tests)

## Project Structure

```
frontend/
├── __tests__/                    # Test files organized by type
│   ├── setup/                    # Test configuration and utilities
│   │   ├── test-utils.tsx         # Custom render with providers
│   │   └── vitest-setup.ts        # Global test setup
│   ├── fixtures/                  # Test data and mock objects
│   │   └── test-data.ts           # Shared test fixtures
│   ├── mocks/                     # API mocking setup
│   │   ├── handlers.ts            # MSW request handlers
│   │   └── server.ts              # MSW server configuration
│   ├── components/                # Component unit tests
│   │   └── HelloWorld.test.tsx    # Example component test
│   ├── store/                     # Redux store tests
│   │   └── slices/
│   │       └── uiSlice.test.ts    # Redux slice tests
│   ├── services/                  # Service layer tests
│   │   └── api.test.ts            # API service tests
│   └── integration/               # Integration tests
│       └── app.test.tsx           # App-level integration tests
├── e2e/                          # End-to-end tests
│   └── app.spec.ts               # E2E test scenarios
├── src/                          # Application source code
└── coverage/                     # Test coverage reports (generated)
```

## Running Tests

### Unit & Integration Tests (Vitest)

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### End-to-End Tests (Playwright)

```bash
# Run E2E tests
npm run e2e

# Run E2E tests with UI
npm run e2e:ui

# Debug E2E tests
npm run e2e:debug
```

## Writing Tests

### Component Testing

```typescript
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../setup/test-utils';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should handle user interactions', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Clicked!')).toBeInTheDocument();
  });
});
```

### Redux Store Testing

```typescript
import { describe, it, expect } from 'vitest';
import { mySlice, myAction } from '@/store/slices/mySlice';

describe('mySlice', () => {
  it('should handle actions correctly', () => {
    const initialState = { value: 0 };
    const action = myAction(5);
    const result = mySlice.reducer(initialState, action);

    expect(result.value).toBe(5);
  });
});
```

### API Mocking with MSW

```typescript
import { http, HttpResponse } from 'msw';
import { server } from '../setup/vitest-setup';

// In your test file
beforeEach(() => {
  server.use(
    http.get('/api/data', () => {
      return HttpResponse.json({ data: 'mock data' });
    })
  );
});
```

### E2E Testing

```typescript
import { test, expect } from '@playwright/test';

test('user can complete a workflow', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Start' }).click();
  await page.getByLabel('Input field').fill('test data');
  await page.getByRole('button', { name: 'Submit' }).click();

  await expect(page.getByText('Success!')).toBeVisible();
});
```

## Test Organization Guidelines

### File Naming

- Unit tests: `ComponentName.test.tsx` or `functionName.test.ts`
- Integration tests: `featureName.test.tsx`
- E2E tests: `workflow.spec.ts`

### Test Structure

Follow the **AAA** pattern:
- **Arrange**: Set up test data and conditions
- **Act**: Execute the action being tested
- **Assert**: Verify the expected outcomes

```typescript
describe('Feature', () => {
  describe('Specific behavior', () => {
    it('should do something when condition is met', () => {
      // Arrange
      const initialState = setupTestState();

      // Act
      const result = performAction(initialState);

      // Assert
      expect(result).toBe(expectedValue);
    });
  });
});
```

### Best Practices

1. **Test behavior, not implementation**
   - Focus on what the user sees and does
   - Avoid testing internal component state

2. **Use descriptive test names**
   - Good: `should display error message when login fails`
   - Bad: `test login error`

3. **Keep tests independent**
   - Each test should be able to run in isolation
   - Use proper setup/teardown

4. **Test edge cases and error conditions**
   - Happy path, sad path, and edge cases
   - Network failures, empty states, etc.

5. **Use realistic test data**
   - Mirror production data structures
   - Test with various data sizes and types

## Coverage Goals

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

Focus on meaningful coverage rather than just hitting percentages.

## Debugging Tests

### VSCode Integration

Our VSCode configuration provides:

- **Test Explorer**: View and run tests from the sidebar
- **Debug Configuration**: Debug tests with breakpoints
- **Integrated Terminal**: Run tests directly in VSCode

### Debugging Commands

```bash
# Debug specific test file
npm run test -- --debug ComponentName.test.tsx

# Debug with browser tools (Playwright)
npm run e2e:debug

# Run single test
npm run test -- --run -t "test name"
```

## Continuous Integration

Tests are configured to run on:

- **Pre-commit**: Fast unit tests only
- **Pull Requests**: Full test suite including E2E
- **Deployment**: Complete test suite with coverage reports

## Common Patterns

### Testing Async Components

```typescript
import { waitFor } from '@testing-library/react';

it('should load data asynchronously', async () => {
  render(<AsyncComponent />);

  expect(screen.getByText('Loading...')).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument();
  });
});
```

### Testing Error Boundaries

```typescript
it('should handle errors gracefully', () => {
  const ThrowError = () => {
    throw new Error('Test error');
  };

  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );

  expect(screen.getByText('Something went wrong')).toBeInTheDocument();
});
```

### Testing Custom Hooks

```typescript
import { renderHook, act } from '@testing-library/react';

it('should handle hook state changes', () => {
  const { result } = renderHook(() => useCustomHook());

  act(() => {
    result.current.updateValue('new value');
  });

  expect(result.current.value).toBe('new value');
});
```

## Troubleshooting

### Common Issues

1. **Tests timing out**: Increase timeout or use proper async/await
2. **MSW not intercepting**: Check handler setup and server configuration
3. **React Query issues**: Use proper test utilities with QueryClient
4. **Redux state issues**: Use proper store setup in test utilities

### Performance

- Use `test.concurrent` for independent tests
- Mock heavy dependencies
- Use `--run` flag for single test execution
- Consider test parallelization limits

## Resources

- [Testing Library Docs](https://testing-library.com/)
- [Vitest Guide](https://vitest.dev/guide/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [MSW Documentation](https://mswjs.io/docs/)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)