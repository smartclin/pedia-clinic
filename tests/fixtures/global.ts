import { test as base, type Page } from '@playwright/test'

import { waitForPageReady } from '../utils/helpers'

export interface TestFixtures {
	page: Page
}

export const test = base.extend<TestFixtures>({
	page: async ({ page }, use) => {
		await page.goto('/')
		await waitForPageReady(page)
		await use(page)
	},
})

export { expect } from '@playwright/test'
