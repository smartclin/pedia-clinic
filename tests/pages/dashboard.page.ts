import type { Locator, Page } from '@playwright/test'

export class DashboardPage {
	readonly page: Page

	constructor(page: Page) {
		this.page = page
	}

	async goto(): Promise<void> {
		await this.page.goto('/dashboard')
	}

	get sidebar(): Locator {
		return this.page.locator('aside, [data-testid="sidebar"]')
	}

	get header(): Locator {
		return this.page.locator('header, [data-testid="header"]')
	}

	get userMenu(): Locator {
		return this.page.locator(
			'[data-testid="user-menu"], [aria-label="User menu"]'
		)
	}

	get notifications(): Locator {
		return this.page.locator(
			'[data-testid="notifications"], [aria-label="Notifications"]'
		)
	}

	async logout(): Promise<void> {
		await this.userMenu.click()
		await this.page.click('text=Sign out, text=Logout')
	}
}

export class PatientsListPage {
	readonly page: Page

	constructor(page: Page) {
		this.page = page
	}

	async goto(): Promise<void> {
		await this.page.goto('/dashboard/patients')
	}

	get searchInput(): Locator {
		return this.page.locator(
			'input[type="search"], input[placeholder*="search" i]'
		)
	}

	get addPatientButton(): Locator {
		return this.page.locator(
			'a[href*="/patients/new"], button:has-text("Add Patient")'
		)
	}

	get patientsTable(): Locator {
		return this.page.locator('table, [data-testid="patients-table"]')
	}

	getPatientRow(name: string): Locator {
		return this.page.locator(`tr:has-text("${name}")`)
	}

	async searchPatient(query: string): Promise<void> {
		await this.searchInput.fill(query)
		await this.page.waitForTimeout(300)
	}
}

export class PatientDetailPage {
	readonly page: Page

	constructor(page: Page) {
		this.page = page
	}

	async goto(patientId: string): Promise<void> {
		await this.page.goto(`/dashboard/patients/${patientId}`)
	}

	get patientName(): Locator {
		return this.page.locator('h1, [data-testid="patient-name"]')
	}

	get editButton(): Locator {
		return this.page.locator('button:has-text("Edit"), a:has-text("Edit")')
	}

	get deleteButton(): Locator {
		return this.page.locator(
			'button:has-text("Delete"), button:has-text("Remove")'
		)
	}

	get appointmentsSection(): Locator {
		return this.page.locator('[data-testid="appointments"]')
	}

	get medicalHistorySection(): Locator {
		return this.page.locator('[data-testid="medical-history"]')
	}
}

export class NewPatientPage {
	readonly page: Page

	constructor(page: Page) {
		this.page = page
	}

	async goto(): Promise<void> {
		await this.page.goto('/dashboard/patients/new')
	}

	get form(): Locator {
		return this.page.locator('form')
	}

	get firstNameInput(): Locator {
		return this.page.locator('input[name="firstName"]')
	}

	get lastNameInput(): Locator {
		return this.page.locator('input[name="lastName"]')
	}

	get dateOfBirthInput(): Locator {
		return this.page.locator('input[name="dateOfBirth"]')
	}

	get genderSelect(): Locator {
		return this.page.locator('select[name="gender"]')
	}

	get phoneInput(): Locator {
		return this.page.locator('input[name="phone"]')
	}

	get parentNameInput(): Locator {
		return this.page.locator('input[name="parentName"]')
	}

	get addressInput(): Locator {
		return this.page.locator('textarea[name="address"], input[name="address"]')
	}

	get submitButton(): Locator {
		return this.page.locator('button[type="submit"]')
	}

	get errorMessage(): Locator {
		return this.page.locator('[role="alert"], .error, [data-testid="error"]')
	}

	async fillPatientForm(data: {
		firstName: string
		lastName: string
		dateOfBirth: string
		gender?: string
		phone?: string
		parentName?: string
		address?: string
	}): Promise<void> {
		await this.firstNameInput.fill(data.firstName)
		await this.lastNameInput.fill(data.lastName)
		await this.dateOfBirthInput.fill(data.dateOfBirth)

		if (data.gender) {
			await this.genderSelect.selectOption(data.gender)
		}
		if (data.phone) {
			await this.phoneInput.fill(data.phone)
		}
		if (data.parentName) {
			await this.parentNameInput.fill(data.parentName)
		}
		if (data.address) {
			await this.addressInput.fill(data.address)
		}
	}

	async submit(): Promise<void> {
		await this.submitButton.click()
	}
}
