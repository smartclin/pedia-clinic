import { expect, test } from '../fixtures/global'
import { HomePage } from '../pages/home.page'

test.describe('Public Pages', () => {
	test.describe('Home Page', () => {
		test('should load the home page successfully', async ({ page }) => {
			const homePage = new HomePage(page)
			await homePage.goto()

			await expect(page).toHaveTitle(/Pedia Clinic|Smart Clinic/i)
			await expect(homePage.navigation).toBeVisible()
		})

		test('should display hero section', async ({ page }) => {
			const homePage = new HomePage(page)
			await homePage.goto()

			await expect(homePage.hero).toBeVisible()
		})

		test('should navigate to about page', async ({ page }) => {
			const homePage = new HomePage(page)
			await homePage.goto()

			await homePage.navigateTo('/about')
			await expect(page).toHaveURL(/.*about/)
		})

		test('should navigate to services page', async ({ page }) => {
			const homePage = new HomePage(page)
			await homePage.goto()

			await homePage.navigateTo('/services')
			await expect(page).toHaveURL(/.*services/)
		})

		test('should navigate to contact page', async ({ page }) => {
			const homePage = new HomePage(page)
			await homePage.goto()

			await homePage.navigateTo('/contact')
			await expect(page).toHaveURL(/.*contact/)
		})

		test('should navigate to sign in page from CTA', async ({ page }) => {
			const homePage = new HomePage(page)
			await homePage.goto()

			const signInLink = page
				.locator('a:has-text("Sign in"), a:has-text("Get Started")')
				.first()
			await signInLink.click()

			await expect(page).toHaveURL(/.*sign-in/)
		})
	})

	test.describe('About Page', () => {
		test('should load about page', async ({ page }) => {
			await page.goto('/about')
			await expect(page.locator('h1')).toBeVisible()
		})
	})

	test.describe('Services Page', () => {
		test('should load services page', async ({ page }) => {
			await page.goto('/services')
			await expect(page.locator('h1')).toBeVisible()
		})

		test('should display services list', async ({ page }) => {
			await page.goto('/services')
			const services = page.locator(
				'[data-testid="service-card"], .service, article'
			)
			await expect(services.first()).toBeVisible()
		})
	})

	test.describe('Contact Page', () => {
		test('should load contact page', async ({ page }) => {
			await page.goto('/contact')
			await expect(page.locator('h1')).toBeVisible()
		})

		test('should display contact form', async ({ page }) => {
			await page.goto('/contact')
			const form = page.locator('form')
			await expect(form).toBeVisible()
		})
	})

	test.describe('Privacy & Terms Pages', () => {
		test('should load privacy page', async ({ page }) => {
			await page.goto('/privacy')
			await expect(page.locator('h1')).toBeVisible()
		})

		test('should load terms page', async ({ page }) => {
			await page.goto('/terms')
			await expect(page.locator('h1')).toBeVisible()
		})
	})

	test.describe('SEO & Accessibility', () => {
		test('should have valid meta description', async ({ page }) => {
			await page.goto('/')
			const description = page.locator('meta[name="description"]')
			await expect(description).toHaveAttribute('content', /.+/)

			const ogTitle = page.locator('meta[property="og:title"]')
			await expect(ogTitle).toHaveAttribute('content', /.+/)
		})

		test('should have proper heading hierarchy', async ({ page }) => {
			await page.goto('/')
			const h1 = page.locator('h1')
			await expect(h1).toHaveCount(1)
		})

		test('should have skip to main content link', async ({ page }) => {
			await page.goto('/')
			const skipLink = page.locator('a[href="#main"], a[href="#main-content"]')
			await expect(skipLink.first()).toBeVisible()
		})
	})
})
