// lib/redis/client.ts (Updated with better patterns)
import Redis from 'ioredis'

import { env } from '@/lib/env'
import { createLogger } from '@/server/utils/logger'

const logger = createLogger('redis')

// Redis client configuration
const redisConfig = {
	host: env.REDIS_HOST || 'localhost',
	port: Number.parseInt(env.REDIS_PORT || '6379', 10),
	password: env.REDIS_PASSWORD,
	db: Number.parseInt(env.REDIS_DB || '0', 10),
	keyPrefix: env.REDIS_KEY_PREFIX || 'app:',
	retryStrategy: (times: number) => {
		const delay = Math.min(times * 50, 2000)
		return delay
	},
	maxRetriesPerRequest: 3,
	lazyConnect: true,
	enableReadyCheck: true,
	keepAlive: 30000,
	connectTimeout: 10000,
}

// Redis client singleton
class RedisClient {
	private static instance: RedisClient
	public client: Redis
	public subscriber: Redis
	public publisher: Redis
	private isConnected = false

	private constructor() {
		this.client = new Redis(redisConfig)
		this.subscriber = new Redis(redisConfig)
		this.publisher = new Redis(redisConfig)

		this.setupEventListeners()
	}

	static getInstance(): RedisClient {
		if (!RedisClient.instance) {
			RedisClient.instance = new RedisClient()
		}
		return RedisClient.instance
	}

	private setupEventListeners() {
		this.client.on('connect', () => {
			this.isConnected = true
			logger.info('Redis client connected')
		})

		this.client.on('error', error => {
			return logger.error('Redis client error', error)
		})

		this.client.on('close', () => {
			this.isConnected = false
			logger.warn('Redis client closed')
		})
	}

	async healthCheck() {
		try {
			const start = Date.now()
			await this.client.ping()
			return {
				status: 'healthy',
				latency: Date.now() - start,
				connected: this.isConnected,
			}
		} catch (error) {
			logger.error('Redis health check failed', error)
			return {
				status: 'unhealthy',
				error: error instanceof Error ? error.message : 'Unknown error',
				connected: false,
			}
		}
	}

	async disconnect() {
		await Promise.all([
			this.client.quit(),
			this.subscriber.quit(),
			this.publisher.quit(),
		])
		logger.info('Redis disconnected')
	}
}

export const redis = RedisClient.getInstance()
