async function globalTeardown() {
  // The globalSetup teardown closure owns the container lifecycle. Keep this
  // hook as a visible boundary for Playwright runs and future non-container
  // artifacts; it must never delete a developer database.
  console.log('E2E Global Teardown: setup-owned cleanup completed')
}

export default globalTeardown
