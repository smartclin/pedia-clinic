// lib/logger/transports/database.ts

import type { Prisma, PrismaClient } from '@/prisma/client'

interface DatabaseTransportOptions {
	batchSize?: number
	flushInterval?: number // in milliseconds
	level?: string // Only process logs at or above this level
}

interface AuditInfo {
	action?: string
	model?: string
	resource?: string
	resourceId?: string
	details?: string
	changes?: unknown
}

// Define the expected shape of metadata
interface AuditMetadata {
	type?: string
	audit?: AuditInfo
	userId?: string
	clinicId?: string
	recordId?: string
	ipAddress?: string
	ip?: string
	userAgent?: string
	[key: string]: unknown
}

// Align this exactly with your Prisma schema fields
type AuditCreateInput = {
	timestamp: Date
	level: string
	action: string
	model: string
	message?: string | null
	details?: string | null
	resource?: string | null
	resourceId?: string | null
	recordId?: string | null
	userId?: string | null
	clinicId?: string | null
	metadata: Prisma.InputJsonValue
	ipAddress?: string | null
	userAgent?: string | null
}

interface LogEntry {
	level: string
	message?: string
	timestamp?: Date
	metadata?: AuditMetadata
}

export class DatabaseTransport {
	name = 'database'
	private readonly prisma: PrismaClient
	private readonly options: Required<DatabaseTransportOptions>
	private buffer: AuditCreateInput[] = []
	private flushTimer: NodeJS.Timeout | null = null
	private processing = false

	constructor(prisma: PrismaClient, options: DatabaseTransportOptions = {}) {
		this.prisma = prisma
		this.options = {
			batchSize: options.batchSize ?? 100,
			flushInterval: options.flushInterval ?? 5000,
			level: options.level ?? 'audit',
		}
		this.setupFlushInterval()
	}

	private setupFlushInterval(): void {
		if (this.flushTimer) {
			clearInterval(this.flushTimer)
		}
		this.flushTimer = setInterval(
			() => void this.flush(),
			this.options.flushInterval
		)

		// Prevent timer from keeping process alive
		if (this.flushTimer.unref) {
			this.flushTimer.unref()
		}
	}

	async log(entry: LogEntry): Promise<void> {
		try {
			// Safely access metadata with type assertion
			const metadata = (entry.metadata || {}) as AuditMetadata

			// Only process AUDIT logs or logs at appropriate level
			const isAudit = metadata.type === 'AUDIT'
			const meetsLevel = this.shouldProcess(entry.level)

			if (!isAudit || !meetsLevel) return

			const auditInfo = (metadata.audit || {}) as AuditInfo

			const auditData: AuditCreateInput = {
				action: auditInfo.action || 'SYSTEM_EVENT',
				clinicId: metadata.clinicId || null,
				details: auditInfo.changes
					? JSON.stringify(auditInfo.changes)
					: auditInfo.details || null,
				ipAddress: metadata.ipAddress || metadata.ip || null,
				level: entry.level,
				message: entry.message || null,
				metadata: metadata as Prisma.InputJsonValue,
				model: auditInfo.model || auditInfo.resource || 'System',
				recordId: metadata.recordId || auditInfo.resourceId || null,
				resource: auditInfo.resource || null,
				resourceId: auditInfo.resourceId || null,
				timestamp: entry.timestamp || new Date(),
				userAgent: metadata.userAgent || null,
				userId: metadata.userId || null,
			}

			this.buffer.push(auditData)

			if (this.buffer.length >= this.options.batchSize) {
				// Don't await - fire and forget to avoid blocking
				this.flush().catch(error => {
					console.error('Error flushing audit logs:', error)
				})
			}
		} catch (error) {
			console.error('Error processing audit log entry:', error)
		}
	}

	private shouldProcess(level: string): boolean {
		const levels = ['debug', 'info', 'audit', 'warn', 'error', 'fatal']
		const configLevelIndex = levels.indexOf(this.options.level)
		const entryLevelIndex = levels.indexOf(level)

		return entryLevelIndex >= configLevelIndex
	}

	async flush(): Promise<void> {
		if (this.processing || this.buffer.length === 0) return

		this.processing = true
		const entries = [...this.buffer]
		this.buffer = []

		try {
			// Use transaction for better performance
			await this.prisma.$transaction(
				async tx => {
					// Split into chunks to avoid query size limits
					const chunkSize = 50
					for (let i = 0; i < entries.length; i += chunkSize) {
						const chunk = entries.slice(i, i + chunkSize)
						await tx.auditLog.createMany({
							data: chunk,
							skipDuplicates: true,
						})
					}
				},
				{
					maxWait: 5000, // 5 second max wait
					timeout: 10000, // 10 second timeout
				}
			)
		} catch (error) {
			console.error('Failed to write audit logs to database:', error)

			// Put entries back in buffer for retry
			this.buffer.unshift(...entries)

			// Prevent memory overflow on repeated DB failures
			if (this.buffer.length > 1000) {
				const droppedCount = this.buffer.length - 500
				const toDrop = this.buffer.splice(500, droppedCount)
				console.warn(
					`Dropped ${toDrop.length} audit logs due to buffer overflow`
				)
			}
		} finally {
			this.processing = false
		}
	}

	async close(): Promise<void> {
		if (this.flushTimer) {
			clearInterval(this.flushTimer)
			this.flushTimer = null
		}

		// Final flush with retry logic
		let retries = 3
		while (retries > 0 && this.buffer.length > 0) {
			try {
				await this.flush()
				break
			} catch (error) {
				console.error('Failed to write audit logs to database:', error)
				retries--
				if (retries === 0) {
					console.error(
						`Failed to flush ${this.buffer.length} audit logs after multiple attempts`
					)
				} else {
					await new Promise(resolve => setTimeout(resolve, 1000))
				}
			}
		}
	}
}
