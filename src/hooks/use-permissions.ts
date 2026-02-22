'use client'

import { useMemo } from 'react'

import { useAuth } from './use-auth'

export function usePermissions(clinicId?: string) {
	const { user } = useAuth()

	const permissions = useMemo<string[]>(() => {
		if (!user || !clinicId) {
			return []
		}

		return []
	}, [user, clinicId])

	return {
		permissions,
		hasPermission: (permission: string) =>
			permissions.includes('*') || permissions.includes(permission),
	}
}
