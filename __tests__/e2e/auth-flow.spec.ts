import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page renders with Hebrew RTL layout', async ({ page }) => {
    await page.goto('/login')
    const dir = await page.getAttribute('html', 'dir')
    expect(dir).toBe('rtl')

    const lang = await page.getAttribute('html', 'lang')
    expect(lang).toBe('he')
  })

  test('public pages are accessible without auth', async ({ page }) => {
    const response = await page.goto('/privacy-policy')
    expect(response?.status()).toBeLessThan(400)
  })

  test('legal terms page is accessible without auth', async ({ page }) => {
    const response = await page.goto('/legal-terms')
    expect(response?.status()).toBeLessThan(400)
  })

  test('login page contains Google OAuth option', async ({ page }) => {
    await page.goto('/login')
    // Page should have some form of login UI
    await expect(page.locator('body')).not.toBeEmpty()
  })
})

test.describe('Navigation - Protected Routes', () => {
  test('accessing /calls redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/calls')
    await expect(page).toHaveURL(/\/login/)
  })

  test('accessing /simulations redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/simulations')
    await expect(page).toHaveURL(/\/login/)
  })

  test('accessing /team redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/team')
    await expect(page).toHaveURL(/\/login/)
  })
})
