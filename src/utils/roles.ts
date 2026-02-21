// Client-safe roles utility - no server-only imports

export type UserRoles = 'ADMIN' | 'PATIENT' | 'STAFF' | 'DOCTOR'

// Client-safe session type (subset of the full session)
export interface ClientSession {
	user?: {
		id?: string
		email?: string
		name?: string
		role?: string
	}
}

export const checkRole = (
	session: ClientSession | null,
	roleToCheck: UserRoles
): boolean => {
	// Ensure session and session.user exist before accessing role
	return session?.user?.role?.toLowerCase() === roleToCheck.toLowerCase()
}

// Client-safe utility functions that work with passed session data
export const getRoleFromSession = (
	session: ClientSession | null
): UserRoles => {
	const role = (session?.user?.role?.toLowerCase() as UserRoles) ?? 'PATIENT'
	return role
}

export const getUserFromSession = (session: ClientSession | null) => {
	return session?.user ?? null
}

export const getUserIdFromSession = (
	session: ClientSession | null
): string | null => {
	return session?.user?.id ?? null
}

export const getUserEmailFromSession = (
	session: ClientSession | null
): string | null => {
	return session?.user?.email ?? null
}

export const getUserNameFromSession = (
	session: ClientSession | null
): string | null => {
	return session?.user?.name ?? null
}

export const getUserRoleFromSession = (
	session: ClientSession | null
): string | null => {
	return session?.user?.role ?? null
}
