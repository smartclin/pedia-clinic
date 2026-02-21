import { createHash, randomBytes } from 'node:crypto'

import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { createTRPCRouter, protectedProcedure } from '../trpc'

/**
 * Hash an API key for secure storage
 */
function hashKey(key: string): string {
	return createHash('sha256').update(key).digest('hex')
}

/**
 * Generate a random API key
 */
function generateAPIKey(): string {
	// Generate a key in the format: sk_live_[32 random chars]
	const randomPart = randomBytes(32).toString('hex')
	return `sk_live_${randomPart}`
}

export const apiKeysRouter = createTRPCRouter({
	// List all API keys for an clinic
	list: protectedProcedure
		.input(z.object({ clinicId: z.string() }))
		.query(async ({ ctx, input }) => {
			if (!ctx.user) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			// Check if user is member
			const membership = await ctx.prisma.clinicMember.findFirst({
				where: {
					clinicId: input.clinicId,
					userId: ctx.user.id,
				},
				include: {
					role: true,
				},
			})

			if (!membership) {
				throw new TRPCError({ code: 'FORBIDDEN' })
			}

			// Only return non-sensitive data (not the actual key or hashed key)
			const apiKeys = await ctx.prisma.aPIKey.findMany({
				where: { clinicId: input.clinicId },
				select: {
					id: true,
					name: true,
					lastUsedAt: true,
					expiresAt: true,
					createdAt: true,
					createdBy: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
				},
				orderBy: { createdAt: 'desc' },
			})

			return apiKeys
		}),

	// Create a new API key
	create: protectedProcedure
		.input(
			z.object({
				clinicId: z.string(),
				name: z.string().min(1).max(100),
				expiresInDays: z.number().min(1).max(365).optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.user) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			// Check permissions
			const membership = await ctx.prisma.clinicMember.findFirst({
				where: {
					clinicId: input.clinicId,
					userId: ctx.user.id,
				},
				include: {
					role: true,
				},
			})

			if (!membership) {
				throw new TRPCError({ code: 'FORBIDDEN' })
			}

			const hasPermission =
				(membership.role.permissions as string).includes('*') ||
				(membership.role.permissions as string).includes('settings:update')

			if (!hasPermission) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'Insufficient permissions to create API keys',
				})
			}

			// Generate API key
			const key = generateAPIKey()
			const hashedKey = hashKey(key)

			// Calculate expiration date
			let expiresAt: Date | null = null
			if (input.expiresInDays) {
				expiresAt = new Date()
				expiresAt.setDate(expiresAt.getDate() + input.expiresInDays)
			}

			// Create API key in database
			const apiKey = await ctx.prisma.aPIKey.create({
				data: {
					clinicId: input.clinicId,
					name: input.name,
					key: key.slice(-8), // Store last 8 characters for identification
					hashedKey,
					createdById: ctx.user.id,
					expiresAt,
				},
			})

			// Create audit log
			await ctx.prisma.auditLog.create({
				data: {
					userId: ctx.user.id,
					clinicId: input.clinicId,
					action: 'api_key_created',
					level: 'info',
					model: 'api_key',
					resource: 'api_key',
					resourceId: apiKey.id,
					metadata: JSON.stringify({
						apiKeyId: apiKey.id,
						apiKeyName: input.name,
						expiresInDays: input.expiresInDays,
					}),
				},
			})

			// Return the full key ONLY this one time
			return {
				id: apiKey.id,
				name: apiKey.name,
				key, // Full key returned only on creation
				expiresAt: apiKey.expiresAt,
				createdAt: apiKey.createdAt,
			}
		}),

	// Revoke (delete) an API key
	revoke: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (!ctx.user) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			// Get API key
			const apiKey = await ctx.prisma.aPIKey.findUnique({
				where: { id: input.id },
			})

			if (!apiKey) {
				throw new TRPCError({ code: 'NOT_FOUND' })
			}

			// Check permissions
			const membership = await ctx.prisma.clinicMember.findFirst({
				where: {
					clinicId: apiKey.clinicId,
					userId: ctx.user.id,
				},
				include: {
					role: true,
				},
			})

			if (!membership) {
				throw new TRPCError({ code: 'FORBIDDEN' })
			}

			const hasPermission =
				(membership.role.permissions as string).includes('*') ||
				(membership.role.permissions as string).includes('settings:update')

			if (!hasPermission) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'Insufficient permissions to revoke API keys',
				})
			}

			// Delete API key
			await ctx.prisma.aPIKey.delete({
				where: { id: input.id },
			})

			// Create audit log
			await ctx.prisma.auditLog.create({
				data: {
					userId: ctx.user.id,
					level: 'info',
					model: 'api_key',
					resource: 'api_key',
					resourceId: apiKey.id,
					clinicId: apiKey.clinicId,
					action: 'api_key_revoked',
					metadata: JSON.stringify({
						apiKeyId: apiKey.id,
						apiKeyName: apiKey.name,
					}),
				},
			})

			return { success: true }
		}),

	// Validate an API key (for API authentication)
	validate: protectedProcedure
		.input(z.object({ key: z.string() }))
		.query(async ({ ctx, input }) => {
			const hashedKey = hashKey(input.key)

			const apiKey = await ctx.prisma.aPIKey.findFirst({
				where: {
					hashedKey,
				},
				include: {
					clinic: true,
				},
			})

			if (!apiKey) {
				throw new TRPCError({
					code: 'UNAUTHORIZED',
					message: 'Invalid API key',
				})
			}

			// Check if expired
			if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
				throw new TRPCError({
					code: 'UNAUTHORIZED',
					message: 'API key has expired',
				})
			}

			// Update last used timestamp
			await ctx.prisma.aPIKey.update({
				where: { id: apiKey.id },
				data: { lastUsedAt: new Date() },
			})

			return {
				clinicId: apiKey.clinicId,
				clinic: apiKey.clinic,
			}
		}),
})
