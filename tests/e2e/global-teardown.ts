import { FullConfig } from '@playwright/test'

async function globalTeardown(config: FullConfig) {
  // This global teardown runs once after all tests
  console.log('E2E Global Teardown: Cleaning up test environment...')
}

export default globalTeardown
