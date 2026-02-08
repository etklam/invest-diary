# Testing Guide

This project uses **Vitest** for unit testing and **@nuxt/test-utils** for component testing.

## Test Structure

```
tests/
├── setup.ts              # Database test utilities
├── lib/                  # Utility function tests
│   └── utils.test.ts
├── api/                  # API route tests (structure ready)
│   └── diaries.test.ts
└── components/           # Component tests (to be added)
```

## Running Tests

```bash
# Run all tests once
npm test

# Watch mode (re-run on file changes)
npm run test:watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Current Test Coverage

### ✅ Completed
- **Utility Functions** (`tests/lib/utils.test.ts`)
  - `calculateHoldings()` - FIFO cost calculation
  - `getHoldingBySymbol()` - Symbol lookup
  - `formatDate()` - Date formatting
  - `formatCurrency()` - Currency formatting

- **Test Infrastructure**
  - Vitest configuration with happy-dom
  - Database test utilities (`tests/setup.ts`)
  - Test scripts in package.json

### ⏳ In Progress
- **API Routes** (`tests/api/diaries.test.ts`)
  - Test structure created
  - Needs full Nuxt test server setup to run actual requests

### 📋 To Be Done
- **Component Tests**
  - DiaryForm, DiaryList components
  - AlertNotification component
  - TransactionForm component
  - StockHolding component

- **Complete API Integration Tests**
  - Requires `@nuxt/test-utils` setup with test server
  - See notes in `tests/api/diaries.test.ts`

## Writing New Tests

### Unit Tests (Pure Functions)

```typescript
import { describe, it, expect } from 'vitest'
import { yourFunction } from '~/lib/utils'

describe('yourFunction', () => {
  it('should do something', () => {
    const result = yourFunction(input)
    expect(result).toBe(expected)
  })
})
```

### Database Tests

```typescript
import { cleanDatabase, createTestDiary } from '../setup'

describe('Database Tests', () => {
  afterEach(async () => {
    await cleanDatabase()
  })

  it('should create diary', async () => {
    const diary = await createTestDiary({
      title: 'Test Diary'
    })
    expect(diary.title).toBe('Test Diary')
  })
})
```

### API Integration Tests (Future)

```typescript
import { $fetch, setup } from '@nuxt/test-utils/e2e'

await setup({ server: true })

it('should fetch diaries', async () => {
  const diaries = await $fetch('/api/diaries')
  expect(diaries).toBeDefined()
})
```

## Notes

- Tests use `happy-dom` as the test environment (lightweight than jsdom)
- Database tests use the same Prisma client as the app
- API route tests provide structure but need Nuxt test server for execution
- Coverage reports are generated in `coverage/` directory
