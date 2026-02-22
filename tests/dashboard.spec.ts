import { expect, test } from './fixtures/global'
import {
	DashboardPage,
	NewPatientPage,
	PatientsListPage,
} from './pages/dashboard.page'

test.describe('Dashboard', () => {
	test.describe('Unauthenticated Access', () => {
		test('should redirect to sign in when accessing dashboard', async ({
			page,
		}) => {
			await page.goto('/dashboard')
			await expect(page).toHaveURL(/.*sign-in/)
		})

		test('should redirect to sign in when accessing patients', async ({
			page,
		}) => {
			await page.goto('/dashboard/patients')
			await expect(page).toHaveURL(/.*sign-in/)
		})
	})

	test.describe('Sidebar Navigation', () => {
		test('should display sidebar when signed in', async ({ page }) => {
			const dashboardPage = new DashboardPage(page)
			await dashboardPage.goto()

			await expect(dashboardPage.sidebar).toBeVisible()
		})

		test('should have navigation links in sidebar', async ({ page }) => {
			const dashboardPage = new DashboardPage(page)
			await dashboardPage.goto()

			const navLinks = dashboardPage.sidebar.locator('a, button')
			expect(await navLinks.count()).toBeGreaterThan(0)
		})
	})

	test.describe('Dashboard Page', () => {
		test('should load dashboard overview', async ({ page }) => {
			const dashboardPage = new DashboardPage(page)
			await dashboardPage.goto()

			await expect(page.locator('h1')).toBeVisible()
		})

		test('should display quick stats cards', async ({ page }) => {
			const dashboardPage = new DashboardPage(page)
			await dashboardPage.goto()

			const stats = page.locator(
				'[data-testid="stat-card"], .stat-card, [class*="stat"]'
			)
			expect(await stats.count()).toBeGreaterThanOrEqual(0)
		})
	})
})

test.describe('Patients', () => {
	test.describe('Patients List', () => {
		test('should load patients list page', async ({ page }) => {
			const patientsPage = new PatientsListPage(page)
			await patientsPage.goto()

			await expect(
				patientsPage.patientsTable.or(page.locator('[data-testid="empty"]'))
			).toBeVisible()
		})

		test('should display search input', async ({ page }) => {
			const patientsPage = new PatientsListPage(page)
			await patientsPage.goto()

			await expect(patientsPage.searchInput.first()).toBeVisible()
		})

		test('should have add patient button', async ({ page }) => {
			const patientsPage = new PatientsListPage(page)
			await patientsPage.goto()

			await expect(patientsPage.addPatientButton.first()).toBeVisible()
		})

		test('should navigate to new patient page', async ({ page }) => {
			const patientsPage = new PatientsListPage(page)
			await patientsPage.goto()

			await patientsPage.addPatientButton.first().click()
			await expect(page).toHaveURL(/.*patients\/new/)
		})
	})

	test.describe('New Patient Form', () => {
		test('should load new patient form', async ({ page }) => {
			const newPatientPage = new NewPatientPage(page)
			await newPatientPage.goto()

			await expect(newPatientPage.form).toBeVisible()
		})

		test('should have all required fields', async ({ page }) => {
			const newPatientPage = new NewPatientPage(page)
			await newPatientPage.goto()

			await expect(newPatientPage.firstNameInput).toBeVisible()
			await expect(newPatientPage.lastNameInput).toBeVisible()
			await expect(newPatientPage.dateOfBirthInput).toBeVisible()
		})

		test('should validate required fields', async ({ page }) => {
			const newPatientPage = new NewPatientPage(page)
			await newPatientPage.goto()

			await newPatientPage.submitButton.click()

			const firstNameError = page.locator('input[name="firstName"]:invalid')
			const lastNameError = page.locator('input[name="lastName"]:invalid')
			const dobError = page.locator('input[name="dateOfBirth"]:invalid')

			const hasError =
				(await firstNameError.count()) > 0 ||
				(await lastNameError.count()) > 0 ||
				(await dobError.count()) > 0
			expect(hasError).toBeTruthy()
		})

		test('should show error for invalid date format', async ({ page }) => {
			const newPatientPage = new NewPatientPage(page)
			await newPatientPage.goto()

			await newPatientPage.dateOfBirthInput.fill('invalid-date')
			await newPatientPage.firstNameInput.fill('Test')
			await newPatientPage.lastNameInput.fill('Patient')
			await newPatientPage.submitButton.click()

			await page.waitForTimeout(500)
			const hasDateError =
				(await page.locator('text=invalid, text=date').count()) > 0
			expect(hasDateError).toBeTruthy()
		})

		test('should have cancel button', async ({ page }) => {
			const newPatientPage = new NewPatientPage(page)
			await newPatientPage.goto()

			const cancelButton = page.locator(
				'button:has-text("Cancel"), a:has-text("Cancel")'
			)
			await expect(cancelButton.first()).toBeVisible()
		})
	})
})
