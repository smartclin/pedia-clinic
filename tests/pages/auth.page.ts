import type { Locator, Page } from '@playwright/test'

export class SignInPage {
	readonly page: Page

	constructor(page: Page) {
		this.page = page
	}

	async goto(): Promise<void> {
		await this.page.goto('/sign-in')
	}

	get emailInput(): Locator {
		return this.page.locator('input[name="email"]')
	}

	get passwordInput(): Locator {
		return this.page.locator('input[name="password"]')
	}

	get submitButton(): Locator {
		return this.page.locator('button[type="submit"]')
	}

	get errorMessage(): Locator {
		return this.page.locator('[role="alert"], .error, [data-testid="error"]')
	}

	async signIn(email: string, password: string): Promise<void> {
		await this.emailInput.fill(email)
		await this.passwordInput.fill(password)
		await this.submitButton.click()
	}
}

export class SignUpPage {
	readonly page: Page

	constructor(page: Page) {
		this.page = page
	}

	async goto(): Promise<void> {
		await this.page.goto('/sign-up')
	}

	get nameInput(): Locator {
		return this.page.locator('input[name="name"]')
	}

	get emailInput(): Locator {
		return this.page.locator('input[name="email"]')
	}

	get passwordInput(): Locator {
		return this.page.locator('input[name="password"]')
	}

	get confirmPasswordInput(): Locator {
		return this.page.locator('input[name="confirmPassword"]')
	}

	get submitButton(): Locator {
		return this.page.locator('button[type="submit"]')
	}

	get errorMessage(): Locator {
		return this.page.locator('[role="alert"], .error, [data-testid="error"]')
	}

	async signUp(
		name: string,
		email: string,
		password: string,
		confirmPassword?: string
	): Promise<void> {
		await this.nameInput.fill(name)
		await this.emailInput.fill(email)
		await this.passwordInput.fill(password)
		if (confirmPassword) {
			await this.confirmPasswordInput.fill(confirmPassword)
		}
		await this.submitButton.click()
	}
}
