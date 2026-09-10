import { test, expect, type Page } from '@playwright/test'

function futureDate() {
  const date = new Date()
  date.setDate(date.getDate() + 2)
  return date.toISOString().slice(0, 10)
}

async function clickNext(page: Page) {
  const button = page.getByRole('button', { name: /Next step/ })
  await button.scrollIntoViewIfNeeded()
  await button.click({ force: true })
}

test('patient can request an appointment and staff can review it', async ({ page, browserName, request }) => {
  test.skip(browserName !== 'chromium', 'The end-to-end workflow is run once in Chromium.')
  await request.post('http://localhost:3001/api/test/reset', { headers: { 'x-mab-test-reset': 'local-only' } })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Dental care, thoughtfully done.' })).toBeVisible()
  await page.getByRole('link', { name: /Book Appointment/ }).first().click()
  await page.waitForURL('**/book')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)
  await expect(page.getByRole('heading', { name: 'Choose a location' })).toBeVisible()
  const valleyChoice = page.getByRole('button', { name: /Valley 1 Branch/ })
  await valleyChoice.scrollIntoViewIfNeeded()
  await valleyChoice.click({ force: true })
  await page.waitForTimeout(100)
  await clickNext(page)
  await expect(page.getByText('STEP 2 OF 5')).toBeVisible()
  const cleaningChoice = page.getByRole('button', { name: /Oral Prophylaxis/ })
  await cleaningChoice.scrollIntoViewIfNeeded()
  await cleaningChoice.click({ force: true })
  await clickNext(page)
  await page.locator('input[type="date"]').fill(futureDate())
  await page.locator('select').selectOption('10:00')
  await clickNext(page)
  await page.getByLabel('Full name *').fill('E2E Patient')
  await page.getByLabel('Mobile number *').fill('09171234567')
  await page.getByLabel('Email optional').fill('e2e@example.com')
  await page.getByRole('checkbox').check()
  await clickNext(page)
  await expect(page.getByRole('heading', { name: 'Review your request' })).toBeVisible()
  await page.getByRole('button', { name: /Request Appointment/ }).click()
  await expect(page.getByText('Appointment request received.')).toBeVisible()

  const admin = await page.context().newPage()
  await admin.goto('http://localhost:3001/login')
  await admin.getByLabel('Email').fill('local-staff@example.com')
  await admin.getByLabel('Password').fill('local-only')
  await admin.getByRole('button', { name: /Sign in/ }).click()
  await expect(admin).toHaveURL(/dashboard/)
  await expect(admin.getByText('Needs your review')).toBeVisible()
  await expect(admin.getByText('E2E Patient')).toBeVisible()
  await admin.getByRole('button', { name: 'Confirm' }).first().click()
  await expect(admin.getByText(/Appointment updated/)).toBeVisible()
})

test('public site renders usable desktop and mobile navigation', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Dental care, thoughtfully done.' })).toBeVisible()
  const width = page.viewportSize()?.width || 1280
  if (width < 600) {
    await page.getByRole('button', { name: 'Open menu' }).click()
    await expect(page.getByRole('link', { name: 'Our Clinic' }).last()).toBeVisible()
  } else {
    await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Locations' }).first()).toBeVisible()
  }
})
