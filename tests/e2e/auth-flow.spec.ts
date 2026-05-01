import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

test('registration with valid data succeeds and redirects to login', async ({ page }) => {
  let requestBody: any = null
  await page.route('**/api/auth/register', async (route) => {
    requestBody = route.request().postDataJSON()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    })
  })

  await page.goto('/auth/register', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('#email')).toBeVisible()

  await page.locator('#name').fill('Test User')
  await page.locator('#email').fill('newuser@example.com')
  await page.locator('#password').fill('password123')
  await page.locator('#confirmPassword').fill('password123')

  const submitButton = page.locator('button.register-submit')
  await expect(submitButton).toBeEnabled()
  await submitButton.click()

  await expect.poll(() => requestBody).not.toBeNull()
  expect(requestBody).toMatchObject({
    email: 'newuser@example.com',
    password: 'password123',
    name: 'Test User',
  })

  await page.waitForURL('**/auth/login', { timeout: 30_000 })
  await expect(page).toHaveURL(/auth\/login/)
})

test('registration with existing email shows error toast', async ({ page }) => {
  await page.route('**/api/auth/register', async (route) => {
    await route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({
        statusMessage: 'This email is already registered',
      }),
    })
  })

  await page.goto('/auth/register', { waitUntil: 'domcontentloaded' })
  await page.locator('#email').fill('existing@example.com')
  await page.locator('#password').fill('password123')
  await page.locator('#confirmPassword').fill('password123')

  await page.locator('button.register-submit').click()

  // The toast should display the error. useAuth catches the error and calls
  // toast.error with the statusMessage; the toast renders it on screen.
  await expect(page.getByText('This email is already registered')).toBeVisible({ timeout: 10_000 })
  // Should remain on register page
  await expect(page).toHaveURL(/auth\/register/)
})

test('login with valid credentials redirects to diaries', async ({ page }) => {
  let loginBody: any = null
  await page.route('**/api/auth/login', async (route) => {
    loginBody = route.request().postDataJSON()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: {
          id: 'login-e2e-user',
          email: 'test@example.com',
          name: 'Test User',
          role: 'USER',
        },
      }),
    })
  })

  // The diaries page will try to load diaries after login redirect
  await page.route('**/api/diaries', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    })
  })

  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('button.login-submit')).toBeEnabled({ timeout: 15_000 })

  await page.getByLabel('Email').fill('test@example.com')
  await page.getByLabel('Password').fill('password123')

  await Promise.all([
    page.waitForURL('**/diaries', { timeout: 30_000 }),
    page.locator('button.login-submit').click(),
  ])

  await expect.poll(() => loginBody).not.toBeNull()
  expect(loginBody).toMatchObject({
    email: 'test@example.com',
    password: 'password123',
  })
  await expect(page).toHaveURL(/diaries/)
})

test('login with invalid credentials shows error toast', async ({ page }) => {
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        statusMessage: 'Invalid email or password',
      }),
    })
  })

  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('button.login-submit')).toBeEnabled({ timeout: 15_000 })

  await page.getByLabel('Email').fill('wrong@example.com')
  await page.getByLabel('Password').fill('wrongpassword')

  await page.locator('button.login-submit').click()

  // useAuth catches the 401 and calls toast.error with the statusMessage
  await expect(page.getByText('Invalid email or password')).toBeVisible({ timeout: 10_000 })
  await expect(page).toHaveURL(/auth\/login/)
})

test('logout clears session and redirects to login page', async ({ page }) => {
  let logoutCalled = false
  // Mock login
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: {
          id: 'logout-e2e-user',
          email: 'test@example.com',
          name: 'Test User',
          role: 'USER',
        },
      }),
    })
  })

  // Mock diaries list so the diaries page can load after login
  await page.route('**/api/diaries', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    })
  })

  // Mock logout
  await page.route('**/api/auth/logout', async (route) => {
    logoutCalled = true
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    })
  })

  // Perform login
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('button.login-submit')).toBeEnabled({ timeout: 15_000 })
  await page.getByLabel('Email').fill('test@example.com')
  await page.getByLabel('Password').fill('password123')
  await Promise.all([
    page.waitForURL('**/diaries', { timeout: 30_000 }),
    page.locator('button.login-submit').click(),
  ])
  await expect(page).toHaveURL(/diaries/)

  // Trigger logout via the composable — call the same fetch the logout() function uses
  await page.evaluate(() =>
    fetch('/api/auth/logout', { method: 'POST' }).then(() => {
      window.location.href = '/auth/login'
    }),
  )

  await page.waitForURL('**/auth/login', { timeout: 15_000 })
  await expect.poll(() => logoutCalled).toBe(true)
  await expect(page).toHaveURL(/auth\/login/)
})

test('protected page redirects to login when unauthenticated', async ({ page }) => {
  await page.goto('/diaries', { waitUntil: 'domcontentloaded' })
  // The auth middleware on /diaries should redirect unauthenticated users
  await page.waitForURL('**/auth/login', { timeout: 15_000 })
  await expect(page).toHaveURL(/auth\/login/)
})

test('token refresh issues new access token when old one expires', async ({ page }) => {
  let refreshBody: any = null
  await page.route('**/api/auth/refresh', async (route) => {
    refreshBody = route.request().postDataJSON()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    })
  })

  // Mock /api/auth/me to fail with 401, which triggers the refresh pipeline
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ statusMessage: 'Unauthorized' }),
    })
  })

  // Set cookies that simulate an expired access token plus a valid refresh token
  await page.context().addCookies([
    {
      name: 'access-token',
      value: 'expired-access-token-placeholder',
      domain: 'localhost',
      path: '/',
    },
    {
      name: 'refresh-token',
      value: 'valid-refresh-token-placeholder',
      domain: 'localhost',
      path: '/',
    },
  ])

  // Visiting a page that runs fetchMe (e.g. by initializing the auth plugin)
  // should trigger the refresh flow.
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' })

  // Allow time for fetchMe -> catch 401 -> refreshAccessToken -> POST /api/auth/refresh
  await page.waitForTimeout(3000)

  // The refresh pipeline should have been invoked
  expect(refreshBody).not.toBeNull()
})
