import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { assertDisposableDatabaseUrl } from '../../scripts/test-database-guard'
import { authenticate, getTestUser, uniqueE2EValue } from './helpers/auth'

test('admin card deletion uses CSRF while invalid tokens and non-admin deletion remain forbidden', async ({ page }) => {
  const databaseUrl = process.env.E2E_DATABASE_URL
  if (!databaseUrl || !process.env.E2E_RUN_ID) throw new Error('Disposable E2E database is required')
  assertDisposableDatabaseUrl(databaseUrl, { databaseName: `diary_e2e_${process.env.E2E_RUN_ID}` })
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(databaseUrl) })
  try {
    await authenticate(page)
    const user = await prisma.user.findUniqueOrThrow({ where: { email: getTestUser().email } })
    const title = uniqueE2EValue('delete-card')
    const post = await prisma.post.create({ data: {
      authorId: user.id, title, slug: title, content: 'Synthetic deletion fixture',
      category: '市場觀察', status: 'PUBLISHED', publishedAt: new Date(),
    } })
    const url = `/api/blog/${post.id}`
    // Login redirects before Timeline's lazy API requests initialize CSRF.
    // A completed authenticated GET establishes the cookie deterministically.
    expect((await page.request.get('/api/auth/me')).status()).toBe(200)
    const csrf = (await page.context().cookies()).find(cookie => cookie.name === 'csrf-token')?.value
    expect(csrf).toBeTruthy()
    const nonAdmin = await page.request.delete(url, { headers: { 'x-csrf-token': csrf! } })
    expect(nonAdmin.status()).toBe(403)
    await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } })
    await page.goto('/articles')
    const card = page.locator('article.blog-card').filter({ hasText: title })
    await expect(card).toBeVisible()
    await expect(card.getByTitle('刪除')).toBeAttached()

    expect((await page.request.delete(url)).status()).toBe(403)
    expect((await page.request.delete(url, { headers: { 'x-csrf-token': 'invalid' } })).status()).toBe(403)
    expect(await prisma.post.findUnique({ where: { id: post.id } })).not.toBeNull()

    const deleteButton = card.getByTitle('刪除')
    // SSR renders the button before async setup hydrates its click handler.
    // data-hydrated flips on mount and survives production builds, unlike
    // Vue's dev-only internal component markers.
    await expect(card).toHaveAttribute('data-hydrated', 'true', { timeout: 15_000 })

    // Focus also exposes the control on touch devices without a hover state.
    await card.getByTitle('刪除').focus()
    const confirmed = page.waitForEvent('dialog').then(async dialog => {
      expect(dialog.type()).toBe('confirm')
      expect(dialog.message()).toContain(title)
      await dialog.accept()
    })
    const deleted = page.waitForResponse(response => response.url().endsWith(url) && response.request().method() === 'DELETE')
    await card.getByTitle('刪除').click()
    await confirmed
    const result = await deleted
    expect(result.status()).toBe(200)
    const currentCsrf = (await page.context().cookies()).find(cookie => cookie.name === 'csrf-token')?.value
    expect(result.request().headers()['x-csrf-token']).toBe(currentCsrf)
    await expect(card).toHaveCount(0)
    expect(await prisma.post.findUnique({ where: { id: post.id } })).toBeNull()
  } finally {
    await prisma.$disconnect()
  }
})
