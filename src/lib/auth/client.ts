'use client'

import { passkeyClient } from '@better-auth/passkey/client'
import {
	adminClient,
	customSessionClient,
	inferAdditionalFields,
	magicLinkClient,
} from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

import type { auth } from '.'
import { ac, roles } from './roles'

export type UserRoles = 'ADMIN' | 'DOCTOR' | 'STAFF' | 'PATIENT'

export const authClient = createAuthClient({
	baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

	fetchOptions: {
		onError: ctx => {
			const err = ctx.error
			console.error('❌ Auth error:', err)

			// Only redirect if status is 401
			if (
				err &&
				typeof err === 'object' &&
				'status' in err &&
				err.status === 401
			) {
				if (typeof window !== 'undefined') {
					window.location.href = '/login'
				}
			}
		},
		onSuccess: ctx => {
			console.log(
				'✅ Auth request succeeded:',
				ctx.response?.url ?? 'unknown URL'
			)
		},
	},

	plugins: [
		magicLinkClient(),
		passkeyClient(),
		inferAdditionalFields<typeof auth>(),
		customSessionClient<typeof auth>(),
		adminClient({
			ac,
			roles,
		}),
	],
})

// Extract hooks and functions
export const { useSession } = authClient
export const {
	signIn,
	signOut,
	signUp,
	updateUser,
	changePassword,
	changeEmail,
	deleteUser,
	revokeSession,
	resetPassword,
	linkSocial,
	listAccounts,
	listSessions,
	revokeOtherSessions,
	revokeSessions,
} = authClient

// Custom auth hook
export function useAuth() {
	const { data: session, isPending, error } = useSession()

	const status = isPending
		? 'loading'
		: session
			? 'authenticated'
			: 'unauthenticated'

	return {
		error,
		isAuthenticated: status === 'authenticated',
		isLoading: isPending,
		session: session ?? null,
		status,
		user: session?.user ?? null,
	}
}

// Permission checker utility
export const createPermissionChecker = (client: typeof authClient) => ({
	hasMultiplePermissions: (
		permissions: Record<string, string[]>,
		role: UserRoles
	) => {
		return client.admin.checkRolePermission({
			permissions,
			role: role.toLowerCase() as 'admin' | 'staff' | 'doctor' | 'patient',
		})
	},
	hasPermission: (permissions: Record<string, string[]>, role: UserRoles) => {
		return client.admin.checkRolePermission({
			permissions,
			role: role.toLowerCase() as 'admin' | 'staff' | 'doctor' | 'patient',
		})
	},
})

export type Session = typeof authClient.$Infer.Session
