/**
 * Structured Logger with sensitive data sanitization
 */

const SENSITIVE_FIELDS = [
	'password',
	'token',
	'secret',
	'apikey',
	'authorization',
	'cookie',
	'session',
	'creditcard',
	'ssn',
	'email',
	'phone',
	'otp',
	'code',
	'verificationcode',
	'resettoken',
	'refreshtoken',
	'accesstoken',
	'privatekey',
	'clientsecret',
]

function maskSensitiveValue(value: string, field?: string): string {
	if (!value) return '***'

	if (field === 'email') {
		const [local, domain] = value.split('@')
		if (!domain) return '***'
		return `${local.slice(0, 2)}**@${domain.slice(0, 2)}*****`
	}

	if (value.length <= 4) return '***'
	return `${value[0]}***${value[value.length - 1]}`
}

function sanitizeObject(obj: unknown, depth = 0): unknown {
	if (depth > 8) return '[Max depth exceeded]'
	if (obj === null || obj === undefined) return obj
	if (typeof obj !== 'object') return obj

	if (Array.isArray(obj)) {
		return obj.map(item => sanitizeObject(item, depth + 1))
	}

	const sanitized: Record<string, unknown> = {}

	for (const [key, value] of Object.entries(obj)) {
		const lowerKey = key.toLowerCase()
		const isSensitive = SENSITIVE_FIELDS.some(field => lowerKey.includes(field))

		if (isSensitive && typeof value === 'string') {
			sanitized[key] =
				process.env.NODE_ENV === 'production'
					? '[REDACTED]'
					: maskSensitiveValue(value, lowerKey)
		} else if (typeof value === 'object') {
			sanitized[key] = sanitizeObject(value, depth + 1)
		} else {
			sanitized[key] = value
		}
	}

	return sanitized
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'security'

interface LogMeta {
	correlationId?: string
	userId?: string
	clinicId?: string
	module?: string
	[key: string]: unknown
}

class Logger {
	private context: LogMeta
	private isDev = process.env.NODE_ENV === 'development'
	private isProd = process.env.NODE_ENV === 'production'

	constructor(context: LogMeta = {}) {
		this.context = context
	}

	child(context: LogMeta) {
		return new Logger({ ...this.context, ...context })
	}

	private log(level: LogLevel, message: string, data?: unknown) {
		if (level === 'debug' && !this.isDev) return
		if (level === 'info' && this.isProd && !process.env.ENABLE_PRODUCTION_LOGS)
			return

		const entry = {
			timestamp: new Date().toISOString(),
			level,
			message,
			...this.context,
			data: data ? sanitizeObject(data) : undefined,
			environment: process.env.NODE_ENV,
		}

		const output = JSON.stringify(entry)

		switch (level) {
			case 'warn':
				console.warn(output)
				break
			case 'error':
				console.error(output)
				break
			default:
				console.log(output)
		}
	}

	debug(message: string, data?: unknown) {
		this.log('debug', message, data)
	}

	info(message: string, data?: unknown) {
		this.log('info', message, data)
	}

	warn(message: string, data?: unknown) {
		this.log('warn', message, data)
	}

	error(message: string, error?: unknown) {
		const formatted =
			error instanceof Error
				? {
						name: error.name,
						message: error.message,
						stack: this.isDev ? error.stack : undefined,
					}
				: error

		this.log('error', message, formatted)
	}

	security(event: string, details?: unknown) {
		this.log('security', event, details)

		if (this.isProd && process.env.SECURITY_LOG_WEBHOOK) {
			void fetch(process.env.SECURITY_LOG_WEBHOOK, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					timestamp: new Date().toISOString(),
					event,
					details: sanitizeObject(details),
					environment: process.env.NODE_ENV,
				}),
			}).catch(() => {})
		}
	}
}

export const logger = new Logger()

export { maskSensitiveValue, sanitizeObject }
