// lib/redis.ts

import { randomUUID } from 'node:crypto'

import Redis, { type RedisOptions } from 'ioredis'

import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

// Validate required environment variables
const REDIS_URL = env.REDIS_URL
if (!REDIS_URL && env.NODE_ENV === 'production') {
	throw new Error('REDIS_URL is missing in production environment')
}

// Parse Redis config
const REDIS_PORT = env.REDIS_PORT
const REDIS_DB = env.REDIS_DB
const REDIS_KEY_PREFIX = env.REDIS_KEY_PREFIX || 'pediacare:'

// Redis configuration with optimal settings
const getRedisConfig = (): RedisOptions => {
	// Base configuration
	const baseConfig: RedisOptions = {
		connectTimeout: 10000,
		enableReadyCheck: true,
		keepAlive: 30000,
		lazyConnect: true,
		maxRetriesPerRequest: 3,
		keyPrefix: REDIS_KEY_PREFIX,
		retryStrategy: (times: number) => {
			if (times > 3) {
				logger.error('[Redis] Max retries reached, stopping retry')
				return null
			}
			const delay = Math.min(times * 200, 2000)
			logger.debug(`[Redis] Retry attempt ${times} in ${delay}ms`)
			return delay
		},
	}

	// If REDIS_URL is provided, use it (preferred for production)
	if (REDIS_URL) {
		return baseConfig
	}

	// Fallback to individual config for local development
	return {
		...baseConfig,
		db: REDIS_DB,
		host: env.REDIS_HOST,
		password: env.REDIS_PASSWORD,
		port: REDIS_PORT,
		tls: env.REDIS_TLS === 'true' ? {} : undefined,
	}
}

// Simple in-memory store for development hot-reloading
const instances: {
	main?: Redis
	subscriber?: Redis
	publisher?: Redis
} = {}

// Create Redis client instances
const createRedisClient = (name = 'default'): Redis => {
	const config = getRedisConfig()

	// Create client with URL if available, otherwise with config
	const client = REDIS_URL ? new Redis(REDIS_URL, config) : new Redis(config)

	client.on('connect', () => {
		logger.info(`✅ [Redis:${name}] Connected`)
	})

	client.on('ready', () => {
		logger.info(`✅ [Redis:${name}] Ready`)
	})

	client.on('error', error => {
		logger.error(`❌ [Redis:${name}] Error:`, error)
	})

	client.on('close', () => {
		logger.warn(`⚠️ [Redis:${name}] Connection closed`)
	})

	client.on('reconnecting', (delay: number) => {
		logger.info(`🔄 [Redis:${name}] Reconnecting in ${delay}ms`)
	})

	return client
}

// Initialize Redis instances
export const redis = (() => {
	if (!instances.main) {
		instances.main = createRedisClient('main')
	}
	return instances.main
})()

export const redisSubscriber = (() => {
	if (!instances.subscriber) {
		instances.subscriber = createRedisClient('subscriber')
	}
	return instances.subscriber
})()

export const redisPublisher = (() => {
	if (!instances.publisher) {
		instances.publisher = createRedisClient('publisher')
	}
	return instances.publisher
})()

// Graceful shutdown
const gracefulShutdown = async (): Promise<void> => {
	logger.info('\n🔄 Graceful shutdown initiated...')

	try {
		await Promise.all([
			redis.quit(),
			redisSubscriber.quit(),
			redisPublisher.quit(),
		])
		logger.info('✅ All Redis connections closed')
	} catch (error) {
		logger.error('❌ Error during Redis shutdown:', error)
	}

	process.exit(0)
}

process.on('SIGINT', gracefulShutdown)
process.on('SIGTERM', gracefulShutdown)

// ======================
// Types
// ======================

export interface CacheOptions {
	ttl?: number // Time to live in seconds
	tags?: string[] // For group invalidation
	skipCache?: boolean // Force skip cache
}

export interface RateLimitResult {
	success: boolean
	limit: number
	remaining: number
	reset: number // Timestamp in seconds
	retryAfter?: number // Seconds to wait before retry
}

export type MessageHandler = (channel: string, message: string) => void

export interface HealthCheckResult {
	healthy: boolean
	latency: number
	memory?: string
	connectedClients?: number
	usedMemory?: string
	version?: string
	mode?: string
}

// ======================
// Cache Utilities
// ======================

export const cache = {
	/**
	 * Delete by exact key
	 */
	async del(key: string | string[]): Promise<number> {
		try {
			const keys = Array.isArray(key) ? key : [key]
			if (keys.length === 0) return 0

			const result = await redis.del(...keys)
			logger.debug(`[Cache] Deleted ${result} keys`)
			return result
		} catch (error) {
			logger.error('[Cache] Delete error:', error)
			return 0
		}
	},

	/**
	 * PRODUCTION SAFE: Delete by pattern using SCAN
	 * NEVER use KEYS in production - this uses SCAN
	 */
	async delByPattern(pattern: string, batchSize = 100): Promise<number> {
		try {
			let cursor = '0'
			let totalDeleted = 0

			do {
				// SCAN with MATCH
				const result = await redis.scan(
					cursor,
					'MATCH',
					pattern,
					'COUNT',
					batchSize
				)

				cursor = result[0]
				const keys = result[1]

				if (keys.length > 0) {
					const deleted = await redis.del(...keys)
					totalDeleted += deleted
				}
			} while (cursor !== '0')

			logger.debug(
				`[Cache] Deleted ${totalDeleted} keys matching pattern: ${pattern}`
			)
			return totalDeleted
		} catch (error) {
			logger.error('[Cache] Delete by pattern error:', error)
			return 0
		}
	},

	/**
	 * Delete all keys associated with tags
	 */
	async delByTags(tags: string[]): Promise<number> {
		try {
			if (tags.length === 0) return 0

			const multi = redis.multi()
			const tagKeys = tags.map(tag => `tag:${tag}`)

			// Get all keys for each tag
			for (const tagKey of tagKeys) {
				multi.smembers(tagKey)
			}

			const results = await multi.exec()
			const keysToDelete = new Set<string>()

			for (const result of results || []) {
				const [err, keys] = result
				if (!err && Array.isArray(keys)) {
					for (const key of keys as string[]) {
						keysToDelete.add(key)
					}
				}
			}

			if (keysToDelete.size > 0) {
				const deleteResult = await redis.del(...Array.from(keysToDelete))

				// Also delete the tag sets
				await redis.del(...tagKeys)

				logger.debug(
					`[Cache] Deleted ${deleteResult} keys by tags: ${tags.join(', ')}`
				)
				return deleteResult
			}

			return 0
		} catch (error) {
			logger.error('[Cache] Delete by tags error:', error)
			return 0
		}
	},

	/**
	 * Check if key exists
	 */
	async exists(key: string): Promise<boolean> {
		const result = await redis.exists(key)
		return result === 1
	},

	/**
	 * Set expiry on existing key
	 */
	async expire(key: string, ttl: number): Promise<boolean> {
		const result = await redis.expire(key, ttl)
		return result === 1
	},

	/**
	 * Flush all cache (USE WITH CAUTION)
	 */
	async flush(): Promise<void> {
		if (env.NODE_ENV === 'production') {
			logger.warn('[Cache] Attempted to flush cache in production')
			throw new Error('Cannot flush cache in production')
		}

		await redis.flushdb()
		logger.info('[Cache] Flushed all cache')
	},

	/**
	 * Get typed data from cache
	 */
	async get<T>(key: string): Promise<T | null> {
		try {
			const value = await redis.get(key)
			if (!value) return null

			// Try to parse JSON if it looks like JSON
			if (value.startsWith('{') || value.startsWith('[')) {
				return JSON.parse(value) as T
			}

			return value as unknown as T
		} catch (error) {
			logger.error(`[Cache] Get error for key "${key}":`, error)
			return null
		}
	},

	/**
	 * Get multiple keys at once
	 */
	async mget<T>(keys: string[]): Promise<(T | null)[]> {
		try {
			if (keys.length === 0) return []

			const values = await redis.mget(keys)

			return values.map(value => {
				if (!value) return null

				try {
					if (value.startsWith('{') || value.startsWith('[')) {
						return JSON.parse(value) as T
					}
					return value as unknown as T
				} catch {
					return null
				}
			})
		} catch (error) {
			logger.error('[Cache] Mget error:', error)
			return keys.map(() => null)
		}
	},

	/**
	 * Get or set with factory function (cache-aside pattern)
	 */
	async getOrSet<T>(
		key: string,
		factory: () => Promise<T>,
		options?: CacheOptions
	): Promise<T> {
		// Skip cache if requested
		if (options?.skipCache) {
			return factory()
		}

		const cached = await this.get<T>(key)
		if (cached !== null) {
			logger.debug(`[Cache] Hit: ${key}`)
			return cached
		}

		logger.debug(`[Cache] Miss: ${key}`)
		const fresh = await factory()
		await this.set(key, fresh, options)

		return fresh
	},

	/**
	 * Increment a counter
	 */
	async increment(key: string, by = 1, ttl?: number): Promise<number> {
		const value = await redis.incrby(key, by)
		if (ttl && value === by) {
			await redis.expire(key, ttl)
		}
		return value
	},

	/**
	 * Set data in cache with options
	 */
	async set<T>(
		key: string,
		value: T,
		options?: CacheOptions
	): Promise<boolean> {
		try {
			const serialized =
				typeof value === 'string' ? value : JSON.stringify(value)

			if (options?.ttl) {
				await redis.setex(key, options.ttl, serialized)
			} else {
				await redis.set(key, serialized)
			}

			// Handle tag-based invalidation
			if (options?.tags?.length) {
				const multi = redis.multi()
				for (const tag of options.tags) {
					multi.sadd(`tag:${tag}`, key)
					// Auto-cleanup tags after TTL
					if (options.ttl) {
						multi.expire(`tag:${tag}`, options.ttl)
					}
				}
				await multi.exec()
			}

			logger.debug(
				`[Cache] Set: ${key}${options?.ttl ? ` (TTL: ${options.ttl}s)` : ''}`
			)
			return true
		} catch (error) {
			logger.error(`[Cache] Set error for key "${key}":`, error)
			return false
		}
	},

	/**
	 * Get TTL of a key in seconds
	 */
	async ttl(key: string): Promise<number> {
		return redis.ttl(key)
	},

	/**
	 * Get cache statistics
	 */
	async stats(): Promise<Record<string, string>> {
		const info = await redis.info()
		const stats: Record<string, string> = {}

		info.split('\n').forEach(line => {
			if (line.includes(':')) {
				const [key, value] = line.split(':')
				stats[key?.trim() || ''] = value?.trim()
			}
		})

		return stats
	},
}

// ======================
// Rate Limiting Utilities
// ======================

export const redisStorage = {
	async delete(key: string): Promise<void> {
		await redis.del(key)
	},

	async get<T>(key: string): Promise<T | null> {
		const value = await redis.get(key)
		if (!value) return null

		try {
			return JSON.parse(value) as T
		} catch {
			return null
		}
	},

	async set<T>(key: string, value: T, ttl?: number): Promise<void> {
		const serialized = JSON.stringify(value)

		if (ttl && ttl > 0) {
			await redis.setex(key, ttl, serialized)
		} else {
			await redis.set(key, serialized)
		}
	},
}

export const rateLimit = {
	/**
	 * Token bucket algorithm for rate limiting
	 */
	async check(
		identifier: string,
		maxRequests: number,
		windowSeconds: number,
		prefix = 'ratelimit'
	): Promise<RateLimitResult> {
		const key = `${prefix}:${identifier}`
		const now = Math.floor(Date.now() / 1000)
		const windowStart = now - windowSeconds

		try {
			const multi = redis.multi()

			// Remove old requests outside the window
			multi.zremrangebyscore(key, 0, windowStart)

			// Count requests in current window
			multi.zcard(key)

			// Add current request
			multi.zadd(key, now, `${now}-${randomUUID()}`)

			// Set expiry on the key
			multi.expire(key, windowSeconds)

			const results = await multi.exec()
			const requestCount = (results?.[1]?.[1] as number) || 0

			if (requestCount >= maxRequests) {
				// Get oldest request for reset time
				const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES')
				const reset =
					oldest.length === 2
						? Number.parseInt(oldest[1], 10) + windowSeconds
						: now + windowSeconds

				const retryAfter = Math.max(0, reset - now)

				logger.debug(
					`[RateLimit] Blocked ${identifier} - ${requestCount}/${maxRequests} requests`
				)

				return {
					limit: maxRequests,
					remaining: 0,
					reset,
					retryAfter,
					success: false,
				}
			}

			logger.debug(
				`[RateLimit] Allowed ${identifier} - ${requestCount + 1}/${maxRequests} requests`
			)

			return {
				limit: maxRequests,
				remaining: maxRequests - requestCount - 1,
				reset: now + windowSeconds,
				retryAfter: 0,
				success: true,
			}
		} catch (error) {
			logger.error('[RateLimit] Error:', error)
			// Fail open in case of Redis error
			return {
				limit: maxRequests,
				remaining: maxRequests - 1,
				reset: now + windowSeconds,
				retryAfter: 0,
				success: true,
			}
		}
	},

	/**
	 * Sliding window counter (more accurate but heavier)
	 */
	async slidingWindow(
		identifier: string,
		maxRequests: number,
		windowSeconds: number,
		prefix = 'ratelimit:sliding'
	): Promise<RateLimitResult> {
		const key = `${prefix}:${identifier}`
		const now = Date.now()
		const windowMs = windowSeconds * 1000

		try {
			const multi = redis.multi()

			// Remove old entries
			multi.zremrangebyscore(key, 0, now - windowMs)

			// Count current entries
			multi.zcard(key)

			// Add current request
			multi.zadd(key, now, `${now}`)

			// Set expiry
			multi.pexpire(key, windowMs)

			const results = await multi.exec()
			const requestCount = (results?.[1]?.[1] as number) || 0

			if (requestCount >= maxRequests) {
				// Get the oldest request timestamp for reset
				const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES')
				const reset =
					oldest.length === 2
						? Math.floor((Number.parseInt(oldest[1], 10) + windowMs) / 1000)
						: Math.floor((now + windowMs) / 1000)

				const retryAfter = Math.max(0, reset - Math.floor(now / 1000))

				return {
					limit: maxRequests,
					remaining: 0,
					reset,
					retryAfter,
					success: false,
				}
			}

			return {
				limit: maxRequests,
				remaining: maxRequests - requestCount - 1,
				reset: Math.floor((now + windowMs) / 1000),
				retryAfter: 0,
				success: true,
			}
		} catch (error) {
			logger.error('[RateLimit] Sliding window error:', error)
			// Fail open
			return {
				limit: maxRequests,
				remaining: maxRequests - 1,
				reset: Math.floor((now + windowMs) / 1000),
				retryAfter: 0,
				success: true,
			}
		}
	},

	/**
	 * Reset rate limit for identifier
	 */
	async reset(identifier: string, prefix = 'ratelimit'): Promise<void> {
		const key = `${prefix}:${identifier}`
		await redis.del(key)
		logger.debug(`[RateLimit] Reset for ${identifier}`)
	},
}

// ======================
// Pub/Sub Utilities
// ======================

export const pubSub = {
	/**
	 * Publish message to channel
	 */
	async publish<T>(channel: string, message: T): Promise<number> {
		try {
			const serialized =
				typeof message === 'string' ? message : JSON.stringify(message)
			const result = await redisPublisher.publish(channel, serialized)
			logger.debug(`[PubSub] Published to ${channel}`)
			return result
		} catch (error) {
			logger.error(`[PubSub] Publish error to ${channel}:`, error)
			return 0
		}
	},

	/**
	 * Subscribe to channel(s)
	 */
	subscribe(channel: string | string[], handler: MessageHandler): void {
		const channels = Array.isArray(channel) ? channel : [channel]

		redisSubscriber.subscribe(...channels, err => {
			if (err) {
				logger.error('[PubSub] Subscribe error:', err)
			} else {
				logger.debug(`[PubSub] Subscribed to ${channels.length} channel(s)`)
			}
		})

		redisSubscriber.on('message', (ch: string, message: string) => {
			try {
				handler(ch, message)
			} catch (error) {
				logger.error(`[PubSub] Handler error for ${ch}:`, error)
			}
		})
	},

	/**
	 * Pattern-based subscription
	 */
	psubscribe(pattern: string, handler: MessageHandler): void {
		redisSubscriber.psubscribe(pattern, err => {
			if (err) {
				logger.error('[PubSub] Pattern subscribe error:', err)
			} else {
				logger.debug(`[PubSub] Subscribed to pattern: ${pattern}`)
			}
		})

		redisSubscriber.on(
			'pmessage',
			(_pattern: string, channel: string, message: string) => {
				try {
					handler(channel, message)
				} catch (error) {
					logger.error(`[PubSub] Pattern handler error for ${channel}:`, error)
				}
			}
		)
	},

	/**
	 * Unsubscribe from channel(s)
	 */
	unsubscribe(channel?: string | string[]): void {
		if (channel) {
			const channels = Array.isArray(channel) ? channel : [channel]
			redisSubscriber.unsubscribe(...channels)
			logger.debug(`[PubSub] Unsubscribed from ${channels.length} channel(s)`)
		} else {
			redisSubscriber.unsubscribe()
			logger.debug('[PubSub] Unsubscribed from all channels')
		}
	},

	/**
	 * Get number of subscribers for channel
	 */
	async numSub(channel: string): Promise<number> {
		const result = await redisPublisher.pubsub('SHARDNUMSUB', channel)
		return result[1] as number
	},

	/**
	 * List active channels
	 */
	async channels(pattern?: string): Promise<unknown[]> {
		if (pattern) {
			return redisPublisher.pubsub('CHANNELS', pattern)
		}
		return redisPublisher.pubsub('CHANNELS')
	},
}

// ======================
// Health Check
// ======================

export async function checkRedisHealth(): Promise<HealthCheckResult> {
	const start = Date.now()

	try {
		// Test connection
		await redis.ping()
		const latency = Date.now() - start

		// Get Redis info
		const info = await redis.info()
		const memoryMatch = info.match(/used_memory_human:(.*)/)
		const clientsMatch = info.match(/connected_clients:(.*)/)
		const usedMemoryMatch = info.match(/used_memory_peak_human:(.*)/)
		const versionMatch = info.match(/redis_version:(.*)/)
		const modeMatch = info.match(/redis_mode:(.*)/)

		const memory = memoryMatch?.[1]?.trim()
		const clients = clientsMatch?.[1]?.trim()
		const usedMemory = usedMemoryMatch?.[1]?.trim()
		const version = versionMatch?.[1]?.trim()
		const mode = modeMatch?.[1]?.trim()

		return {
			connectedClients: clients ? Number.parseInt(clients, 10) : undefined,
			healthy: true,
			latency,
			memory,
			usedMemory,
			version,
			mode,
		}
	} catch (error) {
		logger.error('[Redis] Health check failed:', error)
		return {
			healthy: false,
			latency: Date.now() - start,
		}
	}
}

// Export types
export type RedisClient = typeof redis
export type RedisCache = typeof cache
export type RedisRateLimit = typeof rateLimit
export type RedisPubSub = typeof pubSub

export default redis
