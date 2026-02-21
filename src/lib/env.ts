import { z } from 'zod'

const envSchema = z.object({
	// Database
	DATABASE_URL: z.string().url(),
	DIRECT_URL: z.string().url().optional(),

	// Better Auth
	BETTER_AUTH_SECRET: z.string().min(32),
	BETTER_AUTH_URL: z.string().url(),

	// OAuth Providers (Optional)
	GOOGLE_CLIENT_ID: z.string().optional(),
	GOOGLE_CLIENT_SECRET: z.string().optional(),
	GITHUB_CLIENT_ID: z.string().optional(),
	GITHUB_CLIENT_SECRET: z.string().optional(),
	// Supabase (Optional - required for storage and realtime features)
	REDIS_URL: z.url().optional(),
	REDIS_PORT: z.number().optional(),
	REDIS_DB: z.number().optional(),
	REDIS_HOST: z.string().optional(),
	REDIS_KEY_PREFIX: z.string().optional(),
	REDIS_PASSWORD: z.string().optional(),
	REDIS_TLS: z.enum(['true', 'false']).optional(),
	S3_ACCESS_KEY_ID: z.string().optional(),
	S3_SECRET_ACCESS_KEY: z.string().optional(),
	S3_ENDPOINT: z.string().optional(),
	S3_REGION: z.string().optional(),
	S3_BUCKET: z.string().optional(),
	// Email (Resend)
	RESEND_API_KEY: z.string().optional(),
	EMAIL_FROM_ADDRESS: z.string().email().optional(),
	EMAIL_FROM_NAME: z.string().optional(),

	// Marketing Email (Optional)
	MAILCHIMP_API_KEY: z.string().optional(),
	LOOPS_API_KEY: z.string().optional(),
	CONVERTKIT_API_KEY: z.string().optional(),

	// SSO (Optional)
	SAML_ENTITY_ID: z.string().optional(),
	SAML_SSO_URL: z.preprocess(val => {
		if (!val || val === '') return undefined
		try {
			new URL(val as string)
			return val
		} catch {
			return undefined
		}
	}, z.string().url().optional()),
	OKTA_CLIENT_ID: z.string().optional(),
	OKTA_CLIENT_SECRET: z.string().optional(),

	// Admin
	ADMIN_EMAILS: z.string().optional(),

	// App
	NEXT_PUBLIC_APP_URL: z.string().url(),
	NODE_ENV: z
		.enum(['development', 'production', 'test'])
		.default('development'),
})

export type Env = z.infer<typeof envSchema>

function getEnv(): Env {
	try {
		return envSchema.parse(process.env)
	} catch (error) {
		if (error instanceof z.ZodError) {
			// In production, don't expose specific variable names
			if (process.env.NODE_ENV === 'production') {
				console.error('Environment validation failed:', error.issues)
				throw new Error(
					'❌ Server configuration error. Please contact support.'
				)
			}

			// In development, provide helpful error messages
			const missingVars = error.issues.map(err => err.path.join('.')).join(', ')
			throw new Error(
				`❌ Invalid environment variables: ${missingVars}\n` +
					'Please check your .env.local file and ensure all required variables are set.'
			)
		}
		throw error
	}
}

export const env = getEnv()
