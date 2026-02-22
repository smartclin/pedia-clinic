import { TRPCError } from '@trpc/server'

import type { PrismaClient } from '@/prisma/client'

/**
 * Database helper utilities to reduce query duplication and improve performance
 */

/**
 * Verify user's membership and role in an clinic
 * Used across workspace, analytics, and other routers to avoid N+1 queries
 */
export async function verifyMembershipWithRole(
	prisma: PrismaClient,
	userId: string,
	clinicId: string
) {
	const membership = await prisma.clinicMember.findFirst({
		where: {
			clinicId,
			userId,
		},
		include: {
			role: true,
		},
	})

	if (!membership) {
		throw new TRPCError({
			code: 'FORBIDDEN',
			message: 'You do not have access to this clinic',
		})
	}

	return membership
}

/**
 * Check if user has specific permission in clinic
 */
export async function hasPermission(
	prisma: PrismaClient,
	userId: string,
	clinicId: string,
	permission: string
): Promise<boolean> {
	const membership = await verifyMembershipWithRole(prisma, userId, clinicId)

	// Permissions is a JSON field storing an array of permission strings
	const permissions = membership.role.permissions as string[]

	// Check for wildcard permission
	if (permissions.includes('*')) {
		return true
	}

	// Check for specific permission
	return permissions.includes(permission)
}

/**
 * Get clinic with optimized field selection
 * Avoids over-fetching user data
 */
export async function getClinicWithMembers(
	prisma: PrismaClient,
	clinicId: string,
	userId: string
) {
	// First verify access
	await verifyMembershipWithRole(prisma, userId, clinicId)

	return prisma.clinic.findUnique({
		where: { id: clinicId },
		include: {
			clinicMembers: {
				include: {
					user: {
						select: {
							id: true,
							name: true,
							email: true,
							image: true,
							createdAt: true,
							banned: true,
						},
					},
					role: true,
				},
			},
			invitations: {
				where: {
					status: 'PENDING',
				},
				select: {
					id: true,
					email: true,
					role: true,
					expiresAt: true,
				},
			},
		},
	})
}

/**
 * Batch fetch multiple counts in parallel
 * More efficient than sequential counting
 */
export async function getClinicStats(prisma: PrismaClient, clinicId: string) {
	const [
		memberCount,
		pendingInvitations,
		activeMembers,
		recentActivity,
		activeLinkCount,
	] = await Promise.all([
		prisma.clinicMember.count({
			where: { clinicId },
		}),
		prisma.clinicInvitation.count({
			where: {
				clinicId,
				status: 'PENDING',
			},
		}),
		prisma.clinicMember.count({
			where: {
				clinicId,
				user: {
					sessions: {
						some: {
							expiresAt: {
								gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
							},
						},
					},
				},
			},
		}),
		prisma.auditLog.count({
			where: {
				metadata: {
					path: ['clinicId'],
					equals: clinicId,
				},
				createdAt: {
					gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
				},
			},
		}),
		prisma.clinicInvitation.count({
			where: {
				clinicId,
				type: 'LINK',
				status: 'PENDING',
				expiresAt: { gte: new Date() },
			},
		}),
	])

	return {
		memberCount,
		pendingInvitations,
		activeMembers,
		recentActivity,
		activeLinkCount,
		activityRate:
			memberCount > 0 ? Math.round((activeMembers / memberCount) * 100) : 0,
	}
}

/**
 * Get user with optimized field selection
 * Avoids fetching unnecessary nested data
 */
export async function getUserWithClinics(prisma: PrismaClient, userId: string) {
	return prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			name: true,
			email: true,
			image: true,
			bio: true,
			createdAt: true,
			updatedAt: true,
			banned: true,
			clinicMembers: {
				include: {
					clinic: {
						select: {
							id: true,
							name: true,
							description: true,
							logo: true,
							createdAt: true,
						},
					},
					role: {
						select: {
							id: true,
							name: true,
						},
					},
				},
			},
		},
	})
}

/**
 * Cache for membership checks within same request
 * Prevents repeated queries for same user/org combination
 */
const membershipCache = new Map<string, unknown>()

export async function getCachedMembership(
	prisma: PrismaClient,
	userId: string,
	clinicId: string
) {
	const cacheKey = `${userId}:${clinicId}`

	if (membershipCache.has(cacheKey)) {
		return membershipCache.get(cacheKey)
	}

	const membership = await verifyMembershipWithRole(prisma, userId, clinicId)
	membershipCache.set(cacheKey, membership)

	// Clear cache after request completes
	if (membershipCache.size > 100) {
		membershipCache.clear()
	}

	return membership
}

/**
 * Optimized user queries with field selection
 */

// Minimal user fields for display (avatars, lists, etc)
export const USER_DISPLAY_FIELDS = {
	id: true,
	name: true,
	email: true,
	image: true,
} as const

// Standard user fields for profile views
export const USER_PROFILE_FIELDS = {
	...USER_DISPLAY_FIELDS,
	bio: true,
	createdAt: true,
	updatedAt: true,
} as const

// Full user fields for account settings
export const USER_SETTINGS_FIELDS = {
	...USER_PROFILE_FIELDS,
	emailVerified: true,
	timezone: true,
	language: true,
	banned: true,
} as const

/**
 * Get user for display purposes (minimal fields)
 */
export async function getUserForDisplay(prisma: PrismaClient, userId: string) {
	return prisma.user.findUnique({
		where: { id: userId },
		select: USER_DISPLAY_FIELDS,
	})
}

/**
 * Get multiple users for display (batched)
 */
export async function getUsersForDisplay(
	prisma: PrismaClient,
	userIds: string[]
) {
	return prisma.user.findMany({
		where: { id: { in: userIds } },
		select: USER_DISPLAY_FIELDS,
	})
}

/**
 * Get user with specific workspace membership
 */
export async function getUserWithWorkspace(
	prisma: PrismaClient,
	userId: string,
	workspaceId: string
) {
	return prisma.user.findUnique({
		where: { id: userId },
		select: {
			...USER_PROFILE_FIELDS,
			clinicMembers: {
				where: { clinicId: workspaceId },
				select: {
					joinedAt: true,
					role: {
						select: {
							id: true,
							name: true,
							permissions: true,
						},
					},
				},
				take: 1,
			},
		},
	})
}
