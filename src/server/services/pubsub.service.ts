// server/services/pubsub.service.ts

import { redis } from '@/lib/redis/client'
import { createLogger } from '@/server/utils/logger'

const logger = createLogger('pubsub')

export type MessageHandler<T = unknown> = (channel: string, message: T) => void

export const pubSubService = {
	/**
	 * Publish message to channel
	 */
	async publish<T>(channel: string, message: T) {
		const serialized = JSON.stringify(message)
		const count = await redis.publisher.publish(channel, serialized)
		logger.debug('Message published', { channel, subscribers: count })
		return count
	},

	/**
	 * Subscribe to channel with handler
	 */
	subscribe<T = unknown>(channel: string, handler: MessageHandler<T>) {
		redis.subscriber.subscribe(channel, err => {
			if (err) {
				logger.error('Subscription failed', err, { channel })
			} else {
				logger.info('Subscribed to channel', { channel })
			}
		})

		const messageHandler = (ch: string, message: string) => {
			if (ch === channel) {
				try {
					const parsed = JSON.parse(message) as T
					handler(ch, parsed)
				} catch (error) {
					logger.error('Failed to parse message', error, { channel, message })
				}
			}
		}

		redis.subscriber.on('message', messageHandler)

		// Return unsubscribe function
		return () => {
			redis.subscriber.unsubscribe(channel)
			redis.subscriber.off('message', messageHandler)
		}
	},

	/**
	 * Pattern-based subscription
	 */
	psubscribe<T = unknown>(pattern: string, handler: MessageHandler<T>) {
		redis.subscriber.psubscribe(pattern, err => {
			if (err) {
				logger.error('Pattern subscription failed', err, { pattern })
			} else {
				logger.info('Subscribed to pattern', { pattern })
			}
		})

		const messageHandler = (p: string, ch: string, message: string) => {
			if (p === pattern) {
				try {
					const parsed = JSON.parse(message) as T
					handler(ch, parsed)
				} catch (error) {
					logger.error('Failed to parse message', error, { pattern, message })
				}
			}
		}

		redis.subscriber.on('pmessage', messageHandler)

		return () => {
			redis.subscriber.punsubscribe(pattern)
			redis.subscriber.off('pmessage', messageHandler)
		}
	},
}
