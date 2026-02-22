'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

import { useTRPC } from '@/trpc/client'

export function useRealtimeNotifications() {
	const trpc = useTRPC()
	const queryClient = useQueryClient()
	const lastCheckRef = useRef(new Date())
	const shownNotifications = useRef(new Set<string>())

	const { data, isLoading } = useQuery(
		trpc.notifications.list.queryOptions(
			{ limit: 10, unreadOnly: true },
			{ refetchInterval: 30000, staleTime: 25000, gcTime: 5 * 60 * 1000 }
		)
	)

	useEffect(() => {
		const notifications = data?.notifications
		if (!notifications) return

		notifications.forEach(n => {
			if (
				new Date(n.createdAt) > lastCheckRef.current &&
				!shownNotifications.current.has(n.id)
			) {
				toast(n.title || 'New notification', {
					description: n.message,
					duration: 5000,
				})
				shownNotifications.current.add(n.id)
			}
		})

		lastCheckRef.current = new Date()
	}, [data?.notifications])

	const refresh = () => {
		queryClient.invalidateQueries(
			trpc.notifications.list.queryFilter({ limit: 10, unreadOnly: true })
		)
	}

	return {
		notifications: data?.notifications || [],
		unreadCount: data?.unreadCount || 0,
		refresh,
		isLoading,
	}
}
