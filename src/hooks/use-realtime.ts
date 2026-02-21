'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { MessageHandler } from '@/lib/redis'
import { pubSub } from '@/lib/redis'

// Types for realtime events
export interface RealtimeEvent<T = unknown> {
	channel: string
	event: string
	payload: T
	timestamp: number
	messageId: string
}

export interface RealtimeState {
	isConnected: boolean
	error: Error | null
}

// Client-side event bus for handling realtime messages
class RealtimeClient {
	private static instance: RealtimeClient
	private listeners: Map<string, Set<(payload: unknown) => void>>
	private connectionStates: Map<string, boolean>
	private reconnectTimeouts: Map<string, NodeJS.Timeout>
	private maxReconnectAttempts = 5
	private reconnectDelay = 1000

	private constructor() {
		this.listeners = new Map()
		this.connectionStates = new Map()
		this.reconnectTimeouts = new Map()
	}

	static getInstance(): RealtimeClient {
		if (!RealtimeClient.instance) {
			RealtimeClient.instance = new RealtimeClient()
		}
		return RealtimeClient.instance
	}

	/**
	 * Subscribe to a channel and event
	 */
	subscribe<T>(
		channel: string,
		event: string,
		callback: (payload: T) => void
	): () => void {
		const key = this.getKey(channel, event)

		// Initialize listeners set if needed
		if (!this.listeners.has(key)) {
			this.listeners.set(key, new Set())
		}

		// Add callback to listeners
		this.listeners.get(key)?.add(callback as (payload: unknown) => void)

		// Set up Redis subscription if this is the first listener for this channel
		if (this.listeners.get(key)?.size === 1) {
			this.setupRedisSubscription(channel, event)
		}

		// Return unsubscribe function
		return () => {
			const listeners = this.listeners.get(key)
			if (listeners) {
				listeners.delete(callback as (payload: unknown) => void)

				// If no more listeners, remove Redis subscription
				if (listeners.size === 0) {
					this.listeners.delete(key)
					this.removeRedisSubscription(channel, event)
				}
			}
		}
	}

	/**
	 * Publish an event to a channel
	 */
	async publish<T>(channel: string, event: string, payload: T): Promise<void> {
		const message: RealtimeEvent<T> = {
			channel,
			event,
			payload,
			timestamp: Date.now(),
			messageId: crypto.randomUUID(),
		}

		try {
			// Publish to Redis
			await pubSub.publish(`realtime:${channel}`, JSON.stringify(message))

			// Also trigger local listeners immediately for better UX
			this.triggerLocalListeners(channel, event, payload)
		} catch (error) {
			console.error('Failed to publish to Redis:', error)
			// Fallback to local-only mode
			this.triggerLocalListeners(channel, event, payload)
			this.setConnectionState(channel, false, error as Error)
		}
	}

	/**
	 * Get connection state for a channel
	 */
	getConnectionState(channel: string): RealtimeState {
		return {
			isConnected: this.connectionStates.get(channel) || false,
			error: null, // Error state is managed separately
		}
	}

	private getKey(channel: string, event: string): string {
		return `${channel}:${event}`
	}

	private setupRedisSubscription(channel: string, event: string): void {
		const redisChannel = `realtime:${channel}`

		// Create message handler
		const handler: MessageHandler = (message: string) => {
			try {
				const parsed = JSON.parse(message) as RealtimeEvent<unknown>

				// Only process messages for the specific event
				if (parsed.event === event) {
					this.triggerLocalListeners(
						parsed.channel,
						parsed.event,
						parsed.payload
					)
				}
			} catch (error) {
				console.error('Failed to parse Redis message:', error)
			}
		}

		// Subscribe to Redis channel
		pubSub.subscribe(redisChannel, handler)

		// Set connection state
		this.setConnectionState(channel, true, null)

		// Clear any existing reconnect timeout
		const timeout = this.reconnectTimeouts.get(channel)
		if (timeout) {
			clearTimeout(timeout)
			this.reconnectTimeouts.delete(channel)
		}
	}

	private removeRedisSubscription(channel: string, event: string): void {
		const redisChannel = `realtime:${channel}`

		// Check if there are any other listeners for this channel with different events
		const hasOtherListeners = Array.from(this.listeners.keys()).some(
			key => key.startsWith(`${channel}:`) && !key.endsWith(event)
		)

		// Only unsubscribe if no other listeners for this channel
		if (!hasOtherListeners) {
			pubSub.unsubscribe(redisChannel)
			this.connectionStates.delete(channel)
		}
	}

	private triggerLocalListeners<T>(
		channel: string,
		event: string,
		payload: T
	): void {
		const key = this.getKey(channel, event)
		const listeners = this.listeners.get(key)

		if (listeners) {
			listeners.forEach(callback => {
				try {
					callback(payload)
				} catch (error) {
					console.error('Error in realtime callback:', error)
				}
			})
		}
	}

	private setConnectionState(
		channel: string,
		isConnected: boolean,
		error: Error | null
	): void {
		this.connectionStates.set(channel, isConnected)

		// Attempt reconnection if disconnected
		if (!isConnected && error) {
			this.attemptReconnection(channel)
		}
	}

	private attemptReconnection(channel: string, attempt = 1): void {
		if (attempt > this.maxReconnectAttempts) {
			console.error(
				`Failed to reconnect to channel ${channel} after ${this.maxReconnectAttempts} attempts`
			)
			return
		}

		const timeout = setTimeout(
			async () => {
				try {
					// Test connection by publishing a ping
					await pubSub.publish(
						`realtime:${channel}`,
						JSON.stringify({ type: 'ping' })
					)

					// If successful, reset connection state
					this.connectionStates.set(channel, true)
					this.reconnectTimeouts.delete(channel)
				} catch (error) {
					console.error(error)
					// If failed, try again
					this.attemptReconnection(channel, attempt + 1)
				}
			},
			this.reconnectDelay * 2 ** (attempt - 1)
		)

		this.reconnectTimeouts.set(channel, timeout)
	}
}

/**
 * Hook for Redis realtime subscriptions
 *
 * @example
 * ```tsx
 * // Listen for new notifications
 * const { isConnected } = useRealtime<Notification>(
 *   'notifications',
 *   'new-notification',
 *   (notification) => {
 *     toast.success(notification.title)
 *   }
 * )
 *
 * // Publish a notification
 * const handleSendNotification = () => {
 *   publish({
 *     id: '123',
 *     title: 'New Message',
 *     message: 'You have a new message',
 *     type: 'info',
 *     read: false,
 *     createdAt: new Date().toISOString()
 *   })
 * }
 * ```
 */
export function useRealtime<T = unknown>(
	channel: string,
	event: string,
	callback: (payload: T) => void
): {
	isConnected: boolean
	error: Error | null
	publish: (payload: T) => Promise<void>
} {
	const [state, setState] = useState<RealtimeState>({
		isConnected: false,
		error: null,
	})

	const client = useRef(RealtimeClient.getInstance())
	const stableCallback = useCallback(callback, [callback])

	useEffect(() => {
		// Subscribe to realtime events
		const unsubscribe = client.current.subscribe<T>(
			channel,
			event,
			stableCallback
		)

		// Update connection state periodically
		const interval = setInterval(() => {
			const connectionState = client.current.getConnectionState(channel)
			setState(connectionState)
		}, 1000)

		// Initial state
		setState(client.current.getConnectionState(channel))

		return () => {
			unsubscribe()
			clearInterval(interval)
		}
	}, [channel, event, stableCallback])

	// Publish function
	const publish = useCallback(
		async (payload: T) => {
			await client.current.publish(channel, event, payload)
		},
		[channel, event]
	)

	return {
		isConnected: state.isConnected,
		error: state.error,
		publish,
	}
}

// Type-safe event definitions for common use cases
export interface NotificationEvent {
	id: string
	title: string
	message: string
	type: 'info' | 'success' | 'warning' | 'error'
	read: boolean
	createdAt: string
	userId?: string
}

export interface PresenceEvent {
	userId: string
	status: 'online' | 'away' | 'offline'
	lastSeen: string
	workspaceId?: string
	sessionId?: string
}

export interface ChatEvent {
	messageId: string
	userId: string
	username: string
	content: string
	timestamp: string
	roomId: string
	attachments?: Array<{
		id: string
		url: string
		type: string
		name: string
	}>
}

export interface DocumentEvent {
	documentId: string
	userId: string
	action: 'edit' | 'view' | 'leave' | 'save'
	timestamp: string
	version?: number
	changes?: unknown
}

export interface SystemEvent {
	type: 'maintenance' | 'update' | 'alert' | 'info'
	message: string
	severity: 'low' | 'medium' | 'high'
	timestamp: string
	expiresAt?: string
}

// Usage examples with proper typing
export const useTypedRealtime = {
	useNotifications: (callback: (payload: NotificationEvent) => void) => {
		return useRealtime<NotificationEvent>(
			'notifications',
			'new-notification',
			callback
		)
	},

	usePresence: (
		workspaceId: string,
		callback: (payload: PresenceEvent) => void
	) => {
		return useRealtime<PresenceEvent>(
			`workspace:${workspaceId}`,
			'presence',
			callback
		)
	},

	useChat: (roomId: string, callback: (payload: ChatEvent) => void) => {
		return useRealtime<ChatEvent>(`chat:${roomId}`, 'message', callback)
	},

	useDocument: (
		documentId: string,
		callback: (payload: DocumentEvent) => void
	) => {
		return useRealtime<DocumentEvent>(
			`document:${documentId}`,
			'edit',
			callback
		)
	},

	useSystem: (callback: (payload: SystemEvent) => void) => {
		return useRealtime<SystemEvent>('system', 'broadcast', callback)
	},
}
