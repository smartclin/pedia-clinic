// lib/logger.ts

import { randomUUID } from 'node:crypto'

import pino from 'pino'

import { env } from '@/lib/env'

// Types
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace'

export interface LogContext {
	module: string
	requestId?: string
	userId?: string
	sessionId?: string
	[key: string]: unknown
}

export interface Logger {
	fatal: (message: string, ...args: unknown[]) => void
	error: (
		message: string,
		error?: Error | unknown,
		context?: Record<string, unknown>
	) => void
	warn: (message: string, ...args: unknown[]) => void
	info: (message: string, ...args: unknown[]) => void
	debug: (message: string, ...args: unknown[]) => void
	trace: (message: string, ...args: unknown[]) => void
	child: (context: Partial<LogContext>) => Logger
	withRequest: (req: Request) => Logger
	time: <T>(name: string, fn: () => Promise<T>) => Promise<T>
}

// Constants
const DEFAULT_LOG_LEVEL: LogLevel = 'info'
const SENSITIVE_PATHS = [
	'password',
	'*.password',
	'token',
	'*.token',
	'secret',
	'*.secret',
	'authorization',
	'*.authorization',
	'email',
	'*.email',
	'phone',
	'*.phone',
	'ssn',
	'*.ssn',
	'credit_card',
	'*.credit_card',
	'api_key',
	'*.api_key',
	'access_token',
	'*.access_token',
	'refresh_token',
	'*.refresh_token',
	'private_key',
	'*.private_key',
] as const

// Environment-based configuration
const isDevelopment = env.NODE_ENV === 'development'
const isProduction = env.NODE_ENV === 'production'
const isTest = env.NODE_ENV === 'test'

// Create base logger instance
const baseLogger = pino({
	level: (env.LOG_LEVEL as LogLevel) || DEFAULT_LOG_LEVEL,

	// Development pretty printing
	...(isDevelopment && {
		transport: {
			target: 'pino-pretty',
			options: {
				colorize: true,
				translateTime: 'yyyy-mm-dd HH:MM:ss.l',
				ignore: 'pid,hostname',
				messageFormat: '{if module}[{module}]{end} {msg}',
				hideObject: false,
				singleLine: false,
			},
		},
	}),

	// Production optimizations
	...(isProduction && {
		formatters: {
			level: (label: string) => ({ level: label }),
			bindings: (bindings: pino.Bindings) => ({
				pid: bindings.pid,
				host: bindings.hostname,
				node_version: process.version,
				environment: env.NODE_ENV,
			}),
			log: (object: Record<string, unknown>) => {
				// Ensure error objects are properly serialized
				const err = object.err
				if (err instanceof Error) {
					return {
						...object,
						err: {
							type: err.name,
							message: err.message,
							stack: err.stack,
						},
					}
				}
				return object
			},
		},
	}),

	// Always redact sensitive data
	redact: {
		paths: [...SENSITIVE_PATHS] as string[],
		censor: '[REDACTED]',
		remove: isProduction, // Remove redacted paths in production for better performance
	},

	// Base logging options
	base: {
		environment: env.NODE_ENV,
		version: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
	},

	// Message key
	messageKey: 'message',

	// Timestamp
	timestamp: pino.stdTimeFunctions.isoTime,

	// Enable/disable logging based on environment
	enabled: !isTest,
})

// Redis transport types
interface RedisPublisher {
	publish: (channel: string, message: string) => Promise<number>
}

interface LogEntry {
	level: number
	time: number
	pid: number
	hostname: string
	msg: string
	module?: string
	[key: string]: unknown
}

// Redis transport setup (lazy loaded)
let redisPublisher: RedisPublisher | null = null
let redisTransportInitialized = false

async function initializeRedisTransport() {
	if (
		!isProduction ||
		!process.env.REDIS_LOG_CHANNEL ||
		redisTransportInitialized
	) {
		return
	}

	try {
		const { redisPublisher: publisher } = await import('@/lib/redis')
		redisPublisher = publisher as unknown as RedisPublisher

		// Create a worker-like stream that batches logs
		const logBuffer: LogEntry[] = []
		const BATCH_SIZE = 10
		const BATCH_INTERVAL = 1000 // 1 second

		setInterval(() => {
			if (logBuffer.length > 0) {
				const batch = [...logBuffer]
				logBuffer.length = 0

				if (redisPublisher && process.env.REDIS_LOG_CHANNEL) {
					redisPublisher
						.publish(
							process.env.REDIS_LOG_CHANNEL,
							JSON.stringify({
								type: 'batch',
								timestamp: new Date().toISOString(),
								logs: batch,
							})
						)
						.catch((error: Error) => {
							console.error('Failed to publish log batch to Redis:', error)
						})
				}
			}
		}, BATCH_INTERVAL)

		// Override the base logger's write method
		const originalWrite = (
			baseLogger as unknown as {
				_write: (
					chunk: string,
					encoding: string,
					callback: (error?: Error) => void
				) => void
			}
		)._write
		;(
			baseLogger as unknown as {
				_write: (
					chunk: string,
					encoding: string,
					callback: (error?: Error) => void
				) => void
			}
		)._write = (
			chunk: string,
			_encoding: string,
			callback: (error?: Error) => void
		) => {
			// Always write to console
			originalWrite.call(baseLogger, chunk, _encoding, callback)

			// Batch for Redis
			try {
				const logEntry = JSON.parse(chunk) as LogEntry
				logBuffer.push(logEntry)

				if (
					logBuffer.length >= BATCH_SIZE &&
					redisPublisher &&
					process.env.REDIS_LOG_CHANNEL
				) {
					const batch = [...logBuffer]
					logBuffer.length = 0

					redisPublisher
						.publish(
							process.env.REDIS_LOG_CHANNEL,
							JSON.stringify({
								type: 'batch',
								timestamp: new Date().toISOString(),
								logs: batch,
							})
						)
						.catch(() => {
							// Silently fail - don't let logging errors crash the app
						})
				}
			} catch {
				// Silently fail - don't let logging errors crash the app
			}
		}

		redisTransportInitialized = true
	} catch (error) {
		console.error('Failed to initialize Redis log transport:', error)
	}
}

// Initialize Redis transport if needed
if (isProduction && process.env.REDIS_LOG_CHANNEL) {
	void initializeRedisTransport()
}

// Logger factory
export function createLogger(
	module: string,
	defaultContext?: Record<string, unknown>
): Logger {
	const context: LogContext = {
		module,
		...defaultContext,
	} as LogContext

	const childLogger = baseLogger.child(context)

	const logger: Logger = {
		fatal: (message: string, ...args: unknown[]) => {
			childLogger.fatal({ msg: message, ...extractArgs(args) })
		},

		error: (
			message: string,
			error?: Error | unknown,
			extraContext?: Record<string, unknown>
		) => {
			const logObject: Record<string, unknown> = { msg: message }

			if (error) {
				if (error instanceof Error) {
					logObject.err = {
						type: error.name,
						message: error.message,
						stack: error.stack,
					}
				} else {
					logObject.err = error
				}
			}

			if (extraContext) {
				Object.assign(logObject, extraContext)
			}

			childLogger.error(logObject)
		},

		warn: (message: string, ...args: unknown[]) => {
			childLogger.warn({ msg: message, ...extractArgs(args) })
		},

		info: (message: string, ...args: unknown[]) => {
			childLogger.info({ msg: message, ...extractArgs(args) })
		},

		debug: (message: string, ...args: unknown[]) => {
			childLogger.debug({ msg: message, ...extractArgs(args) })
		},

		trace: (message: string, ...args: unknown[]) => {
			childLogger.trace({ msg: message, ...extractArgs(args) })
		},

		child: (newContext: Partial<LogContext>) => {
			return createLogger(module, { ...context, ...newContext })
		},

		withRequest: (req: Request) => {
			const requestId = req.headers.get('x-request-id') || randomUUID()
			const userAgent = req.headers.get('user-agent')
			const ip = req.headers.get('x-forwarded-for') || 'unknown'

			return createLogger(module, {
				...context,
				requestId,
				userAgent,
				ip,
				path: new URL(req.url).pathname,
				method: req.method,
			})
		},

		time: async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
			const start = performance.now()
			try {
				const result = await fn()
				const duration = performance.now() - start
				childLogger.debug({
					msg: `${name} completed`,
					duration,
					operation: name,
				})
				return result
			} catch (error) {
				const duration = performance.now() - start
				childLogger.error({
					msg: `${name} failed`,
					duration,
					operation: name,
					err: error instanceof Error ? error : { message: String(error) },
				})
				throw error
			}
		},
	}

	return logger
}

// Helper to extract and format arguments
function extractArgs(args: unknown[]): Record<string, unknown> {
	if (args.length === 0) return {}
	if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
		return args[0] as Record<string, unknown>
	}
	return { args }
}

// Create default logger instance
export const logger = createLogger('app')

// Create module-specific loggers
export const createModuleLogger = (module: string) => createLogger(module)

// Performance logging utility (using object instead of static class)
export const perfLogger = {
	marks: new Map<string, number>(),

	mark(name: string): void {
		this.marks.set(name, performance.now())
	},

	measure(name: string, fromMark: string, toMark?: string): number {
		const start = this.marks.get(fromMark)
		if (!start) return 0

		const end = toMark ? this.marks.get(toMark) : performance.now()
		if (!end) return 0

		const duration = end - start
		logger.debug(`${name} took ${duration.toFixed(2)}ms`, {
			operation: name,
			duration,
			from: fromMark,
			to: toMark,
		})

		return duration
	},

	clear(): void {
		this.marks.clear()
	},
}

// Export types
export type { pino }

// Usage examples:
/*
// Basic usage
const logger = createModuleLogger('user-service')
logger.info('User created', { userId: '123', role: 'admin' })

// Error logging
try {
  // something
} catch (error) {
  logger.error('Failed to create user', error, { userId: '123' })
}

// Performance timing
const result = await logger.time('database-query', async () => {
  return await db.query(...)
})

// Request context
export async function GET(req: Request) {
  const requestLogger = logger.withRequest(req)
  requestLogger.info('Handling request')
}

// Child loggers
const userLogger = logger.child({ userId: '123' })
userLogger.info('User action performed')
*/
