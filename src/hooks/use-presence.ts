'use client'

import { useEffect, useState } from 'react'

interface PresenceUser {
	id: string
	name: string
	email: string
	image?: string | null
	lastSeen: Date
}

export function usePresence(workspaceId?: string) {
	const [onlineUsers, _setOnlineUsers] = useState<PresenceUser[]>([])

	useEffect(() => {
		if (!workspaceId) return
	}, [workspaceId])

	return {
		onlineUsers,
		onlineCount: onlineUsers.length,
	}
}
