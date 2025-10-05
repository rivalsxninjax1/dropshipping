import { test, expect } from '@playwright/test'

test('admin dashboard navigation (requires seeded admin@example.com)', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('admin@example.com')
  await page.getByLabel('Password').fill('admin123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.goto('/admin/dashboard')
  await expect(page.getByText('Sales overview')).toBeVisible()

  await page.getByRole('link', { name: 'Products', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/products/)

  await page.getByRole('link', { name: 'Suppliers', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/suppliers/)
})
