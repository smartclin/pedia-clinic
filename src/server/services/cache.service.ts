// server/services/cache.service.ts

import { cacheLife, cacheTag } from 'next/cache'

import { redis } from '@/lib/redis/client'
import { logger } from '@/server/utils/logger'

export interface CacheOptions {
	ttl?: number // seconds
	tags?: string[]
	skipCache?: boolean
}

export const cacheService = {
	/**
	 * Service layer cache with Next.js 16 `use cache` directive
	 */
	async getOrSet<T>(
		key: string,
		factory: () => Promise<T>,
		options: CacheOptions = {}
	): Promise<T> {
		'use cache'

		// Configure cache lifecycle
		if (options.ttl) {
			cacheLife({
				stale: options.ttl * 0.2, // 20% of TTL for stale-while-revalidate
				revalidate: options.ttl * 0.8, // 80% of TTL for background revalidation
				expire: options.ttl, // Hard expiry
			})
		} else {
			cacheLife('hours')
		}

		// Add tags for targeted revalidation
		if (options.tags?.length) {
			cacheTag(...options.tags)
		}

		// Try Redis first (distributed cache)
		const cached = await redis.client.get(key)
		if (cached && !options.skipCache) {
			try {
				return JSON.parse(cached) as T
			} catch {
				// Invalid JSON, ignore cache
			}
		}

		// Execute factory function
		const fresh = await factory()

		// Store in Redis
		if (options.ttl) {
			await redis.client.setex(key, options.ttl, JSON.stringify(fresh))
		} else {
			await redis.client.set(key, JSON.stringify(fresh))
		}

		// Store tag relationships
		if (options.tags?.length) {
			const multi = redis.client.multi()
			for (const tag of options.tags) {
				multi.sadd(`tag:${tag}`, key)
				if (options.ttl) {
					multi.expire(`tag:${tag}`, options.ttl)
				}
			}
			await multi.exec()
		}

		return fresh
	},

	/**
	 * Invalidate by tags
	 */
	async invalidateTags(tags: string[]) {
		const keys = await Promise.all(
			tags.map(async tag => {
				return redis.client.smembers(`tag:${tag}`)
			})
		)

		const keysToDelete = [...new Set(keys.flat())]

		if (keysToDelete.length > 0) {
			await redis.client.del(...keysToDelete)
		}

		// Also delete tag sets
		await redis.client.del(...tags.map(tag => `tag:${tag}`))

		// Revalidate Next.js cache tags
		for (const tag of tags) {
			await import('next/cache').then(({ revalidateTag }) =>
				revalidateTag(tag, 'max')
			)
		}

		logger.info('Cache invalidated', { tags, keysDeleted: keysToDelete.length })
	},

	/**
	 * Rate limiting with Redis (for actions)
	 */
	async rateLimit(
		identifier: string,
		limit: number,
		windowSeconds: number
	): Promise<{
		success: boolean
		remaining: number
		reset: number
	}> {
		const key = `ratelimit:${identifier}`
		const now = Math.floor(Date.now() / 1000)
		const windowStart = now - windowSeconds

		const multi = redis.client.multi()
		multi.zremrangebyscore(key, 0, windowStart) // Remove old entries
		multi.zcard(key) // Count current entries
		multi.zadd(key, now, `${now}-${Math.random()}`) // Add current request
		multi.expire(key, windowSeconds) // Set expiry

		const results = await multi.exec()
		const requestCount = (results?.[1]?.[1] as number) || 0

		if (requestCount >= limit) {
			const oldest = await redis.client.zrange(key, 0, 0, 'WITHSCORES')
			const reset =
				oldest.length === 2
					? Number.parseInt(oldest[1], 10) + windowSeconds
					: now + windowSeconds

			return {
				success: false,
				remaining: 0,
				reset,
			}
		}

		return {
			success: true,
			remaining: limit - requestCount - 1,
			reset: now + windowSeconds,
		}
	},

	/**
	 * Distributed locks for concurrency control
	 */
	async withLock<T>(
		key: string,
		ttlSeconds: number,
		fn: () => Promise<T>
	): Promise<T> {
		const lockKey = `lock:${key}`
		const lockValue = Math.random().toString(36).substring(7)

		// Try to acquire lock
		const acquired = await redis.client.set(
			lockKey,
			lockValue,
			'EX',
			ttlSeconds,
			'NX'
		)

		if (!acquired) {
			throw new Error(`Could not acquire lock for ${key}`)
		}

		try {
			return await fn()
		} finally {
			// Release lock if we still own it
			const currentValue = await redis.client.get(lockKey)
			if (currentValue === lockValue) {
				await redis.client.del(lockKey)
			}
		}
	},
}
