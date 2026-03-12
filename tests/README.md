# Testing Guide

This project uses **Vitest** for unit/integration tests and **@vue/test-utils** for component tests.

## Test Structure

```
tests/
├── api/                  # API route tests (handler-level)
├── components/           # Vue component tests
├── composables/          # Composable tests
├── integration/          # Cross-route auth flow tests
├── unit/                 # Unit tests for libs/composables
├── helpers/              # Test utilities
└── vi-setup.ts           # Global mocks and Nuxt test shims
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

## What We Test

- **API handlers** using mocked `prisma`, `readBody`, `getQuery`, and auth utilities.
- **Components** with `@vue/test-utils`, using stubs for Nuxt-specific components.
- **Composables** with real behavior (state changes, timers, and computed values).
- **Integration** flows like auth lifecycle and admin middleware.

## Conventions

- Use `tests/vi-setup.ts` for shared Nuxt/H3 mocks.
- Prefer handler-level tests over spinning up a Nuxt server.
- Use `vi.useFakeTimers()` when testing time-based behavior.
- Keep fixtures small and focused on behavior.

## Example: API Handler Test

```ts
import { describe, it, expect, vi } from 'vitest'
import { mockReadBody } from '../vi-setup'

vi.mock('~/lib/prisma', () => ({
  default: {
    diary: { findMany: vi.fn() },
  },
}))

it('returns diaries', async () => {
  mockReadBody.mockResolvedValue({})
  const { default: handler } = await import('~/server/api/diaries.get')
  const result = await handler({ context: { user: { id: '1' } } } as any)
  expect(result).toBeDefined()
})
```
