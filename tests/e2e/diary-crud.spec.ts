import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

async function login(page: Parameters<typeof test>[0]['page']) {
  // Mock the login API
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: {
          id: 'diary-e2e-user',
          email: 'test@example.com',
          name: 'Test User',
          role: 'USER',
        },
      }),
    })
  })

  // Mock /api/diaries for the redirect landing page
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
    page.waitForURL('**/diaries', { timeout: 45_000 }),
    page.locator('button.login-submit').click(),
  ])
}

test('create a new diary entry with content and submit', async ({ page }) => {
  await login(page)

  // Mock the POST /api/diaries to capture the request
  let createRequestBody: any = null
  await page.route('**/api/diaries', async (route) => {
    if (route.request().method() === 'POST') {
      createRequestBody = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'new-diary-e2e' }),
      })
    } else {
      // GET — return an empty list (already mocked in login; re-mock here)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      })
    }
  })

  await page.goto('/diaries/new', { waitUntil: 'domcontentloaded' })
  await expect(page.getByLabel('標題')).toBeVisible()

  // Fill the diary editor fields
  await page.getByLabel('標題').fill('E2E Test Diary')
  await page.getByLabel('內容 (Markdown)').fill('## Market Review\nHeld positions through volatility.')

  // Click save
  const saveButton = page.locator('button').filter({ hasText: '儲存日記' })
  await saveButton.click()

  // Wait for async request to complete and verify payload
  await expect.poll(() => createRequestBody).not.toBeNull()
  expect(createRequestBody).toMatchObject({
    title: 'E2E Test Diary',
    content: '## Market Review\nHeld positions through volatility.',
  })
})

test('view diary list after creation', async ({ page }) => {
  const mockDiaries = [
    {
      id: 'diary-1',
      title: 'First E2E Diary',
      content: 'Content of first diary',
      date: '2026-04-30T12:00:00.000Z',
      createdAt: '2026-04-30T12:00:00.000Z',
      transactions: [{ id: 'tx-1', symbol: 'TSLA', type: 'BUY', quantity: '10', price: '250', tradeDate: '2026-04-30T10:00:00.000Z' }],
      alerts: [],
    },
    {
      id: 'diary-2',
      title: 'Second E2E Diary',
      content: 'Content of second diary',
      date: '2026-04-29T12:00:00.000Z',
      createdAt: '2026-04-29T12:00:00.000Z',
      transactions: [],
      alerts: [{ id: 'alert-1', message: 'Review stop loss', triggerAt: '2026-05-01T12:00:00.000Z' }],
    },
  ]

  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: { id: 'diary-e2e-user', email: 'test@example.com', name: 'Test User', role: 'USER' },
      }),
    })
  })

  await page.route('**/api/diaries', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: mockDiaries }),
    })
  })

  await login(page)
  await expect(page).toHaveURL(/diaries/)

  // Verify list is populated
  await expect(page.getByText('First E2E Diary')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Second E2E Diary')).toBeVisible()

  // The list should show the transaction badge
  await expect(page.getByText('1 筆交易')).toBeVisible()
  // The list should show the alert badge
  await expect(page.getByText('1 個提醒')).toBeVisible()
})

test('view a single diary with transactions', async ({ page }) => {
  const singleDiary = {
    id: 'diary-single',
    title: 'Single Diary View',
    content: 'This diary has transactions.',
    date: '2026-04-28T12:00:00.000Z',
    createdAt: '2026-04-28T14:00:00.000Z',
    transactions: [
      { id: 'tx-10', symbol: 'NVDA', type: 'BUY', quantity: '50', price: '900', tradeDate: '2026-04-28T10:00:00.000Z' },
      { id: 'tx-11', symbol: 'AAPL', type: 'SELL', quantity: '20', price: '185', tradeDate: '2026-04-28T11:00:00.000Z' },
    ],
    alerts: [],
  }

  // Mock the single diary fetch
  await page.route('**/api/diaries/diary-single', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(singleDiary),
    })
  })

  // Also mock the login + list (we go to list first via login redirect)
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: { id: 'diary-e2e-user', email: 'test@example.com', name: 'Test User', role: 'USER' },
      }),
    })
  })

  await page.route('**/api/diaries', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: 'diary-single', title: 'Single Diary View', content: 'This diary has transactions.', date: '2026-04-28T12:00:00.000Z', createdAt: '2026-04-28T14:00:00.000Z', transactions: [], alerts: [] },
          ],
        }),
      })
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'diary-single' }) })
    }
  })

  await login(page)

  // Navigate to single diary page
  await page.goto('/diaries/diary-single', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1, name: 'Single Diary View' })).toBeVisible({ timeout: 15_000 })

  // Verify transaction table content
  await expect(page.getByText('NVDA')).toBeVisible()
  await expect(page.getByText('AAPL')).toBeVisible()
  await expect(page.getByText('交易記錄')).toBeVisible()
})

test('edit diary content via edit page', async ({ page }) => {
  const originalDiary = {
    id: 'diary-edit',
    title: 'Original Title',
    content: 'Original content.',
    date: '2026-04-27T12:00:00.000Z',
    createdAt: '2026-04-27T09:00:00.000Z',
    transactions: [],
    alerts: [],
  }

  let updateRequestBody: any = null

  // Mock GET single diary
  await page.route('**/api/diaries/diary-edit', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(originalDiary),
      })
    } else if (route.request().method() === 'PUT') {
      updateRequestBody = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'diary-edit', ...updateRequestBody }),
      })
    }
  })

  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: { id: 'diary-e2e-user', email: 'test@example.com', name: 'Test User', role: 'USER' },
      }),
    })
  })

  await page.route('**/api/diaries', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [originalDiary] }),
    })
  })

  await login(page)

  // Go to the edit page
  await page.goto('/diaries/diary-edit/edit', { waitUntil: 'domcontentloaded' })
  await expect(page.getByLabel('標題')).toBeVisible({ timeout: 15_000 })

  // Edit the title and content
  await page.getByLabel('標題').clear()
  await page.getByLabel('標題').fill('Updated Title')
  await page.getByLabel('內容 (Markdown)').clear()
  await page.getByLabel('內容 (Markdown)').fill('Updated content with additional notes.')

  // Submit the edit
  const saveButton = page.locator('button').filter({ hasText: '儲存變更' })
  await saveButton.click()

  // Verify the PUT payload
  await expect.poll(() => updateRequestBody).not.toBeNull()
  expect(updateRequestBody).toMatchObject({
    title: 'Updated Title',
    content: 'Updated content with additional notes.',
  })
})

test('delete diary with confirmation', async ({ page }) => {
  // Mock the single diary view
  await page.route('**/api/diaries/diary-delete', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'diary-delete',
          title: 'Diary To Delete',
          content: 'Will be deleted.',
          date: '2026-04-26T12:00:00.000Z',
          createdAt: '2026-04-26T08:00:00.000Z',
          transactions: [],
          alerts: [],
        }),
      })
    } else if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    }
  })

  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: { id: 'diary-e2e-user', email: 'test@example.com', name: 'Test User', role: 'USER' },
      }),
    })
  })

  await page.route('**/api/diaries', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{ id: 'diary-delete', title: 'Diary To Delete', content: 'Will be deleted.', date: '2026-04-26T12:00:00.000Z', createdAt: '2026-04-26T08:00:00.000Z', transactions: [], alerts: [] }],
      }),
    })
  })

  await login(page)

  // Go to the diary detail page
  await page.goto('/diaries/diary-delete', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1, name: 'Diary To Delete' })).toBeVisible({ timeout: 15_000 })

  // Click the delete button — it triggers a native confirm dialog
  // Accept the confirm dialog
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('刪除')
    await dialog.accept()
  })

  await page.locator('button').filter({ hasText: '刪除' }).click()
})

test('add transactions to a new diary entry', async ({ page }) => {
  let createRequestBody: any = null

  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: { id: 'diary-e2e-user', email: 'test@example.com', name: 'Test User', role: 'USER' },
      }),
    })
  })

  await page.route('**/api/diaries', async (route) => {
    if (route.request().method() === 'POST') {
      createRequestBody = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'tx-diary-e2e' }),
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      })
    }
  })

  await login(page)
  await page.goto('/diaries/new', { waitUntil: 'domcontentloaded' })
  await expect(page.getByLabel('標題')).toBeVisible()

  // Fill title
  await page.getByLabel('標題').fill('Diary With Transactions')

  // Add first transaction
  await page.locator('button').filter({ hasText: '新增交易' }).click()
  await page.locator('#symbol-0').fill('AAPL')
  await page.locator('#type-0').selectOption('BUY')
  await page.locator('#quantity-0').fill('50')
  await page.locator('#price-0').fill('190.50')

  // Add second transaction
  await page.locator('button').filter({ hasText: '新增交易' }).click()
  await page.locator('#symbol-1').fill('NVDA')
  await page.locator('#type-1').selectOption('SELL')
  await page.locator('#quantity-1').fill('10')
  await page.locator('#price-1').fill('920.00')

  // Save
  await page.locator('button').filter({ hasText: '儲存日記' }).click()

  await expect.poll(() => createRequestBody).not.toBeNull()
  expect(createRequestBody.title).toBe('Diary With Transactions')
  expect(createRequestBody.transactions).toHaveLength(2)
  expect(createRequestBody.transactions[0]).toMatchObject({
    symbol: 'AAPL',
    type: 'BUY',
    quantity: 50,
    price: 190.5,
  })
  expect(createRequestBody.transactions[1]).toMatchObject({
    symbol: 'NVDA',
    type: 'SELL',
    quantity: 10,
    price: 920,
  })
})

test('edit transactions in an existing diary', async ({ page }) => {
  const existingDiary = {
    id: 'diary-edit-tx',
    title: 'Diary For Tx Edit',
    content: 'Original content.',
    date: '2026-04-25T12:00:00.000Z',
    createdAt: '2026-04-25T10:00:00.000Z',
    transactions: [
      { id: 'tx-old-1', symbol: 'TSLA', type: 'BUY', quantity: '100', price: '220', tradeDate: '2026-04-25T10:00:00.000Z' },
      { id: 'tx-old-2', symbol: 'META', type: 'BUY', quantity: '30', price: '500', tradeDate: '2026-04-25T11:00:00.000Z' },
    ],
    alerts: [],
  }

  let updateRequestBody: any = null

  await page.route('**/api/diaries/diary-edit-tx', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(existingDiary),
      })
    } else if (route.request().method() === 'PUT') {
      updateRequestBody = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'diary-edit-tx', ...updateRequestBody }),
      })
    }
  })

  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: { id: 'diary-e2e-user', email: 'test@example.com', name: 'Test User', role: 'USER' },
      }),
    })
  })

  await page.route('**/api/diaries', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [existingDiary] }),
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'diary-edit-tx' }),
      })
    }
  })

  await login(page)

  // Navigate to edit page
  await page.goto('/diaries/diary-edit-tx/edit', { waitUntil: 'domcontentloaded' })
  await expect(page.getByLabel('標題')).toBeVisible({ timeout: 15_000 })

  // Verify existing transactions are loaded
  // TSLA and META symbol inputs should be pre-filled
  await expect(page.locator('#symbol-0')).toHaveValue('TSLA')
  await expect(page.locator('#symbol-1')).toHaveValue('META')

  // Add a new transaction (third)
  await page.locator('button').filter({ hasText: '新增交易' }).click()
  await page.locator('#symbol-2').fill('GOOGL')
  await page.locator('#type-2').selectOption('BUY')
  await page.locator('#quantity-2').fill('15')
  await page.locator('#price-2').fill('145.75')

  // Save
  await page.locator('button').filter({ hasText: '儲存變更' }).click()

  await expect.poll(() => updateRequestBody).not.toBeNull()
  expect(updateRequestBody.transactions).toHaveLength(3)
  expect(updateRequestBody.transactions[2]).toMatchObject({
    symbol: 'GOOGL',
    type: 'BUY',
    quantity: 15,
    price: 145.75,
  })
})
