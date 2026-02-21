import type { auth } from '../../lib/auth'
import { getRole } from '../../lib/auth/server'
import { prisma } from '../db'
import type { UserRole } from './routes'

type BetterAuthSession = typeof auth.$Infer.Session | null

/**
 * 🔒 SECURITY: The "Source of Truth" Validator
 * Use this in Server Actions for any CREATE/UPDATE/DELETE.
 * It checks the DB directly to prevent session-spoofing.
 */
export async function validateClinicAccess(
	clinicId: string,
	userId: string
): Promise<void> {
	const member = await prisma.clinicMember.findUnique({
		select: { userId: true },
		where: {
			clinicId_userId: { clinicId, userId },
		},
	})

	if (!member) {
		throw new Error('Unauthorized: Access denied to this clinic.')
	}
}

/**
 * ⚡ PERFORMANCE: UI/Display Access Checker
 * Uses session data for fast UI rendering (Sidebar, Tabs).
 */
export const hasClinicAccess = (
	session: BetterAuthSession,
	clinicId: string
): boolean => {
	const userClinicId = session?.user?.clinic?.id
	return !!(userClinicId && userClinicId === clinicId)
}

/**
 * 🧱 Permission Checker Factory
 * Fixed to properly use Better Auth's userHasPermission API
 */
export const createClinicPermissionChecker =
	(authInstance: typeof auth) =>
	async (session: BetterAuthSession, clinicId: string) => {
		if (!(session?.user?.id && hasClinicAccess(session, clinicId))) {
			return null
		}

		const userRole = getRole(session).toLowerCase() as UserRole

		// Use Better Auth's userHasPermission API correctly
		const [canManagePatients, canManageStaff, canViewRecords] =
			await Promise.all([
				authInstance.api.userHasPermission({
					body: {
						role: userRole,
						permissions: {
							patients: ['update', 'delete'],
						},
					},
				}),
				authInstance.api.userHasPermission({
					body: {
						role: userRole,
						permissions: {
							staff: ['create', 'update'],
						},
					},
				}),
				authInstance.api.userHasPermission({
					body: {
						role: userRole,
						permissions: {
							records: ['read'],
						},
					},
				}),
			])

		return {
			canManagePatients: canManagePatients.success,
			canManageStaff: canManageStaff.success,
			canViewRecords: canViewRecords.success,
			// Helper for ad-hoc checks
			check: async (resource: string, action: string) => {
				const result = await authInstance.api.userHasPermission({
					body: {
						role: userRole,
						permissions: {
							[resource]: [action],
						},
					},
				})
				return result.success
			},
			clinicId,
			role: userRole,
		}
	}
