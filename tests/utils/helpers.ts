import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

export async function waitForPageReady(page: Page): Promise<void> {
	await page.waitForLoadState('domcontentloaded')
	await page.waitForLoadState('networkidle')
}

export async function takeScreenshot(page: Page, name: string): Promise<void> {
	await page.screenshot({
		path: `tests/screenshots/${name}.png`,
		fullPage: true,
	})
}

export async function dismissToasts(page: Page): Promise<void> {
	const toastCloseButtons = page.locator(
		'[data-sonner-toast] button[aria-label="Close"]'
	)
	const count = await toastCloseButtons.count()
	for (let i = 0; i < count; i++) {
		await toastCloseButtons.first().click()
		await page.waitForTimeout(100)
	}
}

export async function fillForm(
	form: Locator,
	data: Record<string, string>
): Promise<void> {
	for (const [field, value] of Object.entries(data)) {
		const input = form.locator(
			`[name="${field}"], [id="${field}"], [data-testid="${field}"]`
		)
		await input.fill(value)
	}
}

export async function submitForm(form: Locator): Promise<void> {
	const submitButton = form.locator('button[type="submit"]')
	await submitButton.click()
}

export async function assertNoCriticalErrors(page: Page): Promise<void> {
	const errors: string[] = []

	page.on('console', msg => {
		if (msg.type() === 'error') {
			errors.push(msg.text())
		}
	})

	await page.waitForTimeout(1000)

	const criticalErrors = errors.filter(
		e => !e.includes('favicon') && !e.includes('404') && !e.includes('Warning')
	)

	expect(criticalErrors).toHaveLength(0)
}

export async function navigateAndWait(
	page: Page,
	selector: string | Locator,
	options?: { timeout?: number }
): Promise<void> {
	if (typeof selector === 'string') {
		await page.click(selector, options)
	} else {
		await selector.click(options)
	}
	await waitForPageReady(page)
}
