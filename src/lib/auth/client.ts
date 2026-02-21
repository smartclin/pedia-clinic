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
			console.error('❌ Auth error:', ctx.error)
			if (ctx.error.status === 401) {
				// Use Next.js router if possible, fallback to window.location
				window.location.href = '/login'
			}
		},
		onSuccess: ctx => {
			// ✅ Success case: log the operation or update client state
			console.log('✅ Auth request succeeded:', ctx.response.url)
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

export type AuthClient = ReturnType<typeof createAuthClient> & {
	admin: {
		checkRolePermission: (params: {
			permissions: Record<string, string[]>
			role: UserRoles
		}) => boolean
	}
}

export const { useSession } = authClient

export function useAuth() {
	const { data: session, isPending, error } = authClient.useSession()

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

// Type the auth client properly
type TypedAuthClient = typeof authClient

export const createPermissionChecker = (authClient: TypedAuthClient) => ({
	hasMultiplePermissions: (
		permissions: Record<string, string[]>,
		_role: UserRoles
	) => {
		return authClient.admin.checkRolePermission({
			permissions,
			role: 'admin',
		})
	},
	hasPermission: (
		permissions: Record<string, string[]>,
		role: Lowercase<UserRoles>
	) => {
		return authClient.admin.checkRolePermission({
			permissions,
			role,
		})
	},
})
export const Session = typeof authClient.$Infer.Session
