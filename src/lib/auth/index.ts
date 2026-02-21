import { passkey } from '@better-auth/passkey'
import bcrypt from 'bcryptjs'
import { APIError, betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { admin, customSession, organization } from 'better-auth/plugins'
import { magicLink } from 'better-auth/plugins/magic-link'

import { EmailService } from '@/lib/email/service'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

import { UserRoleSchema } from '../../schemas/user.schema'
import { prisma } from '../../server/db'
import type { User } from '../../types/prisma-types'
import { redisStorage } from '../redis'
import { ac, roles } from './roles'

/**
 * Creates a default workspace for a new user
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function createDefaultWorkspace(user: {
	id: string
	email: string
	name?: string | null
}) {
	try {
		logger.info('Creating default workspace for user', {
			userId: user.id,
			email: user.email,
		})

		// Check if user already has a workspace
		const existingMembership = await prisma.clinicMember.findFirst({
			where: { userId: user.id },
		})

		if (existingMembership) {
			logger.debug('User already has a workspace, skipping creation', {
				userId: user.id,
			})
			return
		}

		// Generate a unique slug from user's email or name
		const baseSlug = user.email
			.split('@')[0]
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '')
			.slice(0, 30)

		// Ensure slug is unique
		let slug = baseSlug
		let counter = 1
		while (
			await prisma.clinic.findUnique({
				where: { slug },
			})
		) {
			slug = `${baseSlug}-${counter}`
			counter++
		}

		// Create default workspace
		const workspaceName = user.name || `${user.email.split('@')[0]}'s Workspace`
		logger.info('Creating workspace', { name: workspaceName, slug })

		const workspace = await prisma.clinic.create({
			data: {
				name: workspaceName,
				slug,
				description: 'My default workspace',
			},
		})

		// Create the Owner role for this clinic
		const ownerRole = await prisma.role.create({
			data: {
				clinicId: workspace.id,
				name: 'Owner',
				description: 'Workspace owner with full access',
				permissions: ['*'],
				isSystem: true,
			},
		})

		// Create the membership linking user to clinic and role
		await prisma.clinicMember.create({
			data: {
				userId: user.id,
				clinicId: workspace.id,
				roleId: ownerRole.id,
			},
		})

		logger.info('Default workspace created successfully', {
			workspaceId: workspace.id,
		})
	} catch (error) {
		logger.error('Failed to create default workspace', error)
		// Don't fail signup if workspace creation fails
	}
}

// Validate Prisma client is properly initialized
if (!prisma) {
	throw new Error(
		'Prisma Client is not initialized. Please run `pnpm db:generate` to generate the Prisma client.'
	)
}

export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: 'postgresql', // or whatever provider is used, but likely just empty object is enough if not required
	}),
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.BETTER_AUTH_URL,
	basePath: '/api/auth',
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: env.NODE_ENV === 'production',
		password: {
			hash: async password => {
				return await bcrypt.hash(password, 10)
			},
			verify: async ({ hash, password }) => {
				return await bcrypt.compare(password, hash)
			},
		},
		sendVerificationEmail: async ({
			user,
			url,
		}: {
			user: User
			url: string
		}) => {
			try {
				if (env.RESEND_API_KEY) {
					await EmailService.sendVerification(user.email, url)
				} else {
					logger.debug('Verification email (RESEND_API_KEY not set)', {
						to: user.email,
						url,
					})
				}
			} catch (error) {
				logger.error('Failed to send verification email', error)
			}
		},
		sendResetPassword: async ({ user, url }) => {
			try {
				if (env.RESEND_API_KEY) {
					await EmailService.sendPasswordReset(
						user.email,
						user.name || 'User',
						url
					)
				} else {
					logger.debug(
						'Password reset email skipped (RESEND_API_KEY not set)',
						{
							to: user.email,
						}
					)
				}
			} catch (error) {
				logger.error('Failed to send password reset email', error)
			}
		},
	},
	experimental: { joins: true },
	logger: {
		disabled: false,
		level: process.env.NODE_ENV === 'production' ? 'error' : 'info',
		log: (level, message, ...args) => {
			const logObj = args.length > 0 ? { args } : {}
			switch (level) {
				case 'debug':
					logger.debug(message, logObj)
					break
				case 'info':
					logger.info(message, logObj)
					break
				case 'warn':
					logger.warn(message, logObj)
					break
				case 'error':
					logger.error(message, logObj)
					break
				default:
					logger.info(message, logObj)
			}
		},
	},
	rateLimit: {
		customRules: {
			'/forget-password': {
				max: 2, // Very strict
				window: 900, // 15 minutes
			},
			'/sign-in/email': {
				max: 5,
				window: 300, // 5 minutes
			},
			'/sign-up/email': {
				max: 3, // Stricter for signup
				window: 300,
			},
		},
		enabled: true,
		max: 100,
		storage: 'secondary-storage', // Use Redis for rate limiting
		window: 60,
	},
	secondaryStorage: redisStorage,
	socialProviders: {
		google:
			env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
				? {
						clientId: env.GOOGLE_CLIENT_ID,
						clientSecret: env.GOOGLE_CLIENT_SECRET,
					}
				: undefined,
		github:
			env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
				? {
						clientId: env.GITHUB_CLIENT_ID,
						clientSecret: env.GITHUB_CLIENT_SECRET,
					}
				: undefined,
	},
	user: {
		additionalFields: {
			isAdmin: {
				defaultValue: false,
				input: false,
				required: false,
				type: 'boolean',
			},
			phone: {
				input: true,
				required: false,
				type: 'string',
			},
			role: {
				defaultValue: 'PATIENT', // Should match one of the enum values
				input: false,
				required: false,
				type: ['OWNER', 'DOCTOR', 'PATIENT', 'ADMIN', 'STAFF'], // This is the correct syntax
				validator: {
					input: UserRoleSchema,
				},
			},
		},
		changeEmail: {
			enabled: true,
		},
		deleteUser: {
			beforeDelete: async user => {
				const fullUser = await prisma.user.findUnique({
					select: { isAdmin: true, role: true },
					where: { id: user.id },
				})

				if (fullUser?.role === 'ADMIN' || fullUser?.isAdmin) {
					throw new APIError('BAD_REQUEST', {
						message: "Admin accounts can't be deleted",
					})
				}
			},
			enabled: true,
		},
	},
	plugins: [
		admin({
			ac,
			roles,
		}),
		organization({
			schema: {
				clinic: {
					modelName: 'clinic',
				},
				member: {
					modelName: 'clinicMember',
					fields: {
						organizationId: 'clinicId',
					},
				},
				invitation: {
					modelName: 'clinicInvitation',
					fields: {
						organizationId: 'clinicId',
					},
				},
			},
		}),
		magicLink({
			sendMagicLink: async ({ email, url }) => {
				try {
					if (env.RESEND_API_KEY) {
						await EmailService.sendMagicLink(email, url)
					} else {
						logger.debug('Magic link email skipped (RESEND_API_KEY not set)', {
							to: email,
						})
					}
				} catch (error) {
					logger.error('Failed to send magic link email', error)
				}
			},
		}),
		passkey(),
		customSession(async ({ user, session }) => {
			logger.info('Creating default workspace for user', {
				userId: user.id,
				email: user.email,
			})
			await createDefaultWorkspace(user)

			const dbUser = await prisma.user.findUnique({
				select: {
					clinics: {
						select: {
							role: true,
							user: {
								select: {
									name: true,
								},
							},
							userId: true,
						},
					},
					role: true,
				},
				where: { id: user.id },
			})

			const primaryClinic = dbUser?.clinics?.length ? dbUser.clinics[0] : null

			return {
				...session,
				user: {
					...user,
					clinic: primaryClinic
						? {
								id: primaryClinic.userId,
								name: primaryClinic.user.name,
							}
						: undefined,
					role: dbUser?.role?.toLowerCase() ?? 'patient',
				},
			}
		}),
		nextCookies(),
	],
	databaseHooks: {
		user: {
			create: {
				// Fix 4: Remove unused context parameter
				after: async user => {
					try {
						// Your clinic member logic here
						const clinicMember = await prisma.clinicMember.findFirst({
							select: { clinicId: true },
							where: { userId: user.id },
						})

						if (!clinicMember) {
							const defaultClinic = await prisma.clinic.findFirst({
								select: { id: true },
							})
							if (defaultClinic) {
								await prisma.clinicMember.create({
									data: {
										clinicId: defaultClinic.id,
										userId: user.id,
										roleId: 'PATIENT',
									},
								})
							}
						}
					} catch (error) {
						// Log but don't throw - user creation should succeed
						console.error('Failed to assign default clinic:', error)
					}
				},
				// Fix 2: Correct the return type for database hooks
				before: async user => {
					const email = user.email?.trim().toLowerCase()
					if (!(email && EMAIL_REGEX.test(email))) {
						throw new APIError('BAD_REQUEST', {
							message: 'Invalid email format',
						})
					}

					return {
						data: {
							...user,
							email,
							isAdmin: false,
							name: user.name?.trim() || 'Unnamed User',
							role: 'PATIENT',
						},
					}
				},
			},
		},
	},
	otp: {
		enabled: true,
		sendEmail: async ({ email, otp }: { email: string; otp: string }) => {
			try {
				if (env.RESEND_API_KEY) {
					await EmailService.sendVerification(
						email,
						'',
						otp // Pass OTP as code
					)
				} else {
					logger.debug('OTP email skipped (RESEND_API_KEY not set)', {
						to: email,
					})
				}
			} catch (error) {
				logger.error('Failed to send OTP email', error)
			}
		},
	},
	twoFactor: {
		enabled: true,
		sendEmail: async ({
			email,
			otp,
			user,
		}: {
			email: string
			otp: string
			user?: User
		}) => {
			try {
				if (env.RESEND_API_KEY) {
					await EmailService.send2FACode(email, user?.name || 'User', otp)
				} else {
					logger.debug('2FA code email skipped (RESEND_API_KEY not set)', {
						to: email,
					})
				}
			} catch (error) {
				logger.error('Failed to send 2FA code email', error)
			}
		},
	},
	session: {
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60, // 5 minutes
		},
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		storeSessionInDatabase: false, // Use secondary storage if available
		updateAge: 60 * 60 * 24, // 1 day
	},
	account: {
		accountLinking: {
			enabled: true,
		},
		encryptOAuthTokens: true,
	},
	advanced: {
		cookiePrefix: 'auth',
		crossSubDomainCookies: {
			domain: 'localhost',
			enabled: true,
		},
		database: {
			defaultFindManyLimit: 100,
			generateId: false, // Let Better Auth handle this optimally
		},
		useSecureCookies: process.env.NODE_ENV === 'production', // Enable in production
	},
	crossSubDomainCookies: {
		domain:
			process.env.NODE_ENV === 'production' ? '.yourdomain.com' : 'localhost',
		enabled: process.env.NODE_ENV === 'production',
	},
})

export type Session = typeof auth.$Infer.Session
