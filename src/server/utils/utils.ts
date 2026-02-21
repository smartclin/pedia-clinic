import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'

import { auth, type Session } from '@/lib/auth'
import type { roles, UserRoles } from '@/lib/auth/roles'
import type { Clinic } from '@/types'

import { getRole } from '../../lib/auth/server'
import { prisma } from '../db'
import { AUTH_ROUTES } from './routes'

interface AuthRedirectOptions {
	redirectTo?: string
}

/**
 * Retrieves the current session without redirecting.
 *
 * Use this when you need to check authentication status without enforcing it,
 * such as conditionally rendering UI based on auth state or for optional
 * authentication scenarios.
 */
export const getSession = async (): Promise<Session | null> => {
	const session = await auth.api.getSession({
		headers: await headers(),
	})

	return session
}

/**
 * Requires an authenticated session, redirecting to login if not found.
 *
 * Use this in Server Components or Server Actions that require authentication.
 * The function will redirect to the login page if no valid session exists,
 * so the return value is guaranteed to be a valid session.
 *
 * @returns The authenticated session (never `null` due to redirect).
 */
export const requireAuth = async (
	options: AuthRedirectOptions = {}
): Promise<Session> => {
	const session = await getSession()
	const { redirectTo = AUTH_ROUTES.LOGIN } = options

	if (!session) {
		redirect(redirectTo)
	}

	return session
}
// Use the proper Better Auth session type that includes user
// Role checking utilities
export const checkRole = (
	session: BetterAuthSession,
	roleToCheck: UserRoles
): boolean => {
	if (!session?.user?.role) {
		return false
	}

	// Handle multiple roles (comma-separated)
	const userRoles = session.user.role
		.split(',')
		.map((r: string) => r.trim().toLowerCase())
	return userRoles.includes(roleToCheck.toLowerCase())
}
/**
 * Requires no authenticated session, redirecting away if one exists.
 *
 * Use this for pages that should only be accessible to unauthenticated users,
 * such as login, registration, or password reset pages.
 */
export const requireUnauth = async (
	options: AuthRedirectOptions = {}
): Promise<void> => {
	const { redirectTo = AUTH_ROUTES.AFTER_LOGIN } = options

	const session = await getSession()

	if (session) {
		redirect(redirectTo)
	}
}

type UserRole = keyof typeof roles
export type Role = UserRole['toUpperCase']
// Export UserRole type for React components
type BetterAuthSession = typeof auth.$Infer.Session | null

type AuthInstance = typeof auth
export const createServerRoleChecker =
	(auth: AuthInstance) => async (session: BetterAuthSession) => {
		if (!session?.user?.id) {
			return null
		}

		const userRole = getRole(session).toLowerCase() as UserRoles

		const [
			canManagePatients,
			canCreateAppointments,
			canViewRecords,
			canManageStaff,
		] = await Promise.all([
			auth.api.userHasPermission({
				body: {
					permissions: { patients: ['update'] },
					role: userRole,
				},
			}),
			auth.api.userHasPermission({
				body: {
					permissions: { appointments: ['create'] },
					role: userRole,
				},
			}),
			auth.api.userHasPermission({
				body: {
					permissions: { records: ['read'] },
					role: userRole,
				},
			}),
			auth.api.userHasPermission({
				body: {
					permissions: { staff: ['update'] },
					role: userRole,
				},
			}),
		])

		return {
			canCreateAppointments,
			canManagePatients,
			canManageStaff,
			canViewRecords,

			hasPermission: async (permissions: Record<string, string[]>) => {
				return await auth.api.userHasPermission({
					body: {
						permissions,
						role: userRole,
					},
				})
			},
			isAdmin: userRole === 'admin',
			isDoctor: userRole === 'doctor',
			isPatient: userRole === 'patient',
			isStaff: userRole === 'staff',
			role: userRole,
		}
	}

export const getCurrentClinic = async (): Promise<Pick<
	Clinic,
	'id' | 'name'
> | null> => {
	const session = await auth.api.getSession({
		headers: await headers(),
	})

	if (!session?.user?.id) {
		return null
	}

	const clinic = session.user.clinic
	if (!clinic) return null

	return {
		id: clinic.id,
		name: clinic.name ?? '',
	}
}
export const getClinicFromHeaders = cache(async (headersList?: Headers) => {
	const headersResolved = headersList || (await headers())
	const clinicId = headersResolved.get('x-clinic-id')

	if (clinicId) {
		const clinic = await prisma.clinic.findUnique({
			select: { id: true, name: true, timezone: true },
			where: { id: clinicId, isDeleted: false },
		})
		if (clinic) return clinic
	}
	// Fallback to first clinic (development only)
	if (process.env.NODE_ENV === 'development') {
		const clinic = await prisma.clinic.findFirst({
			where: { isDeleted: false },
		})
		if (clinic) return clinic
	}

	throw new Error('No clinic found')
})
