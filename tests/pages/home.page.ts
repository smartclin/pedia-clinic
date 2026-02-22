import type { Locator, Page } from '@playwright/test'

export class HomePage {
	readonly page: Page

	constructor(page: Page) {
		this.page = page
	}

	async goto(): Promise<void> {
		await this.page.goto('/')
	}

	get hero(): Locator {
		return this.page.locator('h1').first()
	}

	get navigation(): Locator {
		return this.page.locator('nav')
	}

	async navigateTo(path: string): Promise<void> {
		await this.page.click(`a[href="${path}"]`)
	}
}
