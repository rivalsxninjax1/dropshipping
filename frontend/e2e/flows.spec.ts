import { test, expect } from '@playwright/test'

test('home renders and search works', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Dropshipper')).toBeVisible()
  await page.getByLabel('Search').fill('Pro')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/search/)
})

test.skip('checkout flow + webhook (requires backend running with seed)', async ({ page, request }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('user0@example.com')
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  // Go to checkout and submit (requires address IDs exist)
  await page.goto('/checkout')
  await page.getByPlaceholder('Shipping Address ID').fill('1')
  await page.getByPlaceholder('Billing Address ID').fill('1')
  await page.getByRole('button', { name: 'Next' }).click() // shipping
  await page.getByRole('button', { name: 'Next' }).click() // payment
  await page.getByRole('button', { name: 'Next' }).click() // review
  await page.getByRole('button', { name: 'Place order' }).click()

  // Fetch latest order via API and simulate webhook
  const orders = await request.get('http://localhost:8000/api/orders/')
  if (orders.ok()) {
    const data = await orders.json()
    const orderId = data.results?.[0]?.id || data[0]?.id
    if (orderId) {
      const hook = await request.post('http://localhost:8000/api/payments/webhook/', { data: { provider: 'esewa', order_id: orderId, provider_payment_id: 'esewa_ok_e2e', status: 'success' } })
      expect(hook.ok()).toBeTruthy()
    }
  }
})

test.skip('checkout + khalti webhook success (requires backend running with seed)', async ({ page, request }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('user1@example.com')
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.goto('/checkout')
  await page.getByPlaceholder('Shipping Address ID').fill('1')
  await page.getByPlaceholder('Billing Address ID').fill('1')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Place order' }).click()

  const orders = await request.get('http://localhost:8000/api/orders/')
  if (orders.ok()) {
    const data = await orders.json()
    const orderId = data.results?.[0]?.id || data[0]?.id
    if (orderId) {
      const hook = await request.post('http://localhost:8000/api/payments/webhook/', { data: { provider: 'khalti', order_id: orderId, token: 'khalti_ok_tok', status: 'success' } })
      expect(hook.ok()).toBeTruthy()
    }
  }
})
