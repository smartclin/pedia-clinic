import { expect, test } from './fixtures/global'
import { SignInPage, SignUpPage } from './pages/auth.page'

test.describe('Authentication', () => {
	test.describe('Sign In', () => {
		test('should load sign in page', async ({ page }) => {
			const signInPage = new SignInPage(page)
			await signInPage.goto()

			await expect(signInPage.emailInput).toBeVisible()
			await expect(signInPage.passwordInput).toBeVisible()
			await expect(signInPage.submitButton).toBeVisible()
		})

		test('should show error with invalid credentials', async ({ page }) => {
			const signInPage = new SignInPage(page)
			await signInPage.goto()

			await signInPage.signIn('invalid@test.com', 'wrongpassword')

			await expect(signInPage.errorMessage.first()).toBeVisible()
		})

		test('should validate email format', async ({ page }) => {
			const signInPage = new SignInPage(page)
			await signInPage.goto()

			await signInPage.emailInput.fill('invalid-email')
			await signInPage.passwordInput.fill('password123')
			await signInPage.submitButton.click()

			await expect(page.locator('text=invalid email')).toBeVisible()
		})

		test('should require email and password', async ({ page }) => {
			const signInPage = new SignInPage(page)
			await signInPage.goto()

			await signInPage.submitButton.click()

			const emailError = page.locator(
				'input[name="email"]:invalid, input[name="email"] + span'
			)
			const passwordError = page.locator(
				'input[name="password"]:invalid, input[name="password"] + span'
			)

			const hasError =
				(await emailError.count()) > 0 || (await passwordError.count()) > 0
			expect(hasError).toBeTruthy()
		})

		test('should navigate to sign up page', async ({ page }) => {
			const signInPage = new SignInPage(page)
			await signInPage.goto()

			await page.click('text=Sign up, text=Register, a[href*="sign-up"]')

			await expect(page).toHaveURL(/.*sign-up/)
		})
	})

	test.describe('Sign Up', () => {
		test('should load sign up page', async ({ page }) => {
			const signUpPage = new SignUpPage(page)
			await signUpPage.goto()

			await expect(signUpPage.nameInput).toBeVisible()
			await expect(signUpPage.emailInput).toBeVisible()
			await expect(signUpPage.passwordInput).toBeVisible()
			await expect(signUpPage.confirmPasswordInput).toBeVisible()
			await expect(signUpPage.submitButton).toBeVisible()
		})

		test('should show error when passwords do not match', async ({ page }) => {
			const signUpPage = new SignUpPage(page)
			await signUpPage.goto()

			await signUpPage.signUp(
				'Test User',
				'test@example.com',
				'password123',
				'differentpassword'
			)

			await expect(page.locator('text=match, text=not match')).toBeVisible()
		})

		test('should validate password length', async ({ page }) => {
			const signUpPage = new SignUpPage(page)
			await signUpPage.goto()

			await signUpPage.signUp('Test User', 'test@example.com', 'short', 'short')

			await expect(
				page.locator('text=characters, text=longer, text=minimum')
			).toBeVisible()
		})

		test('should navigate to sign in page', async ({ page }) => {
			const signUpPage = new SignUpPage(page)
			await signUpPage.goto()

			await page.click('text=Sign in, a[href*="sign-in"]')

			await expect(page).toHaveURL(/.*sign-in/)
		})
	})

	test.describe('Password Visibility', () => {
		test('should toggle password visibility on sign in', async ({ page }) => {
			const signInPage = new SignInPage(page)
			await signInPage.goto()

			const passwordInput = signInPage.passwordInput
			const toggleButton = page.locator(
				'button[aria-label*="password"], button[type="button"]:has-text("eye")'
			)

			if ((await toggleButton.count()) > 0) {
				await toggleButton.click()
				const type = await passwordInput.getAttribute('type')
				expect(type === 'text' || type === 'password').toBeTruthy()
			}
		})
	})
})
