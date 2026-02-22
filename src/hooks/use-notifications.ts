'use client'

import { useQuery } from '@tanstack/react-query'

import { useTRPC } from '@/trpc/client'

export function useNotifications() {
	const trpc = useTRPC()
	const { data, isLoading } = useQuery(
		trpc.notifications.list.queryOptions({
			read: false,
			limit: 50,
		})
	)

	return {
		notifications: data?.notifications ?? [],
		isLoading,
		unreadCount: data?.unreadCount ?? 0,
	}
}
