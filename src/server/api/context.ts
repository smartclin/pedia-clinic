// server/trpc/context.ts

import { randomUUID } from 'node:crypto'

import { headers } from 'next/headers'

import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { pubSub, rateLimit, redis, cache as redisCache } from '@/lib/redis'
import { S3_BUCKET, s3 as s3Client } from '@/lib/s3'
import { prisma } from '@/server/db'

import { getUser } from '../../lib/auth/server'

type CreateContextOptions = {
	req?: Request
	res?: Response
}

export async function createTRPCContext(opts?: CreateContextOptions) {
	const requestStart = Date.now()

	// Get headers (App Router safe)
	const headerStore = opts?.req?.headers ?? headers()
	const head =
		headerStore instanceof Headers
			? headerStore
			: new Headers(await headerStore)
	const user = await getUser()
	// Session
	const session = await auth.api.getSession({
		headers: head,
	})

	// Correlation ID
	const correlationId = head.get('x-correlation-id') ?? randomUUID()

	// Extract client IP safely
	const clientIp =
		head.get('x-forwarded-for')?.split(',')[0]?.trim() ||
		head.get('x-real-ip') ||
		'unknown'

	// Structured log context
	const logContext = {
		correlationId,
		module: 'trpc',
		userId: session?.user?.id ?? undefined,
		clinicId: session?.user?.clinic?.id ?? undefined,
		path: opts?.req?.url ?? null,
		method: opts?.req?.method ?? null,
	}

	// Create scoped logger
	const childLogger = logger.child(logContext)

	if (process.env.NODE_ENV === 'development') {
		childLogger.debug('TRPC request started')
	}

	return {
		// Core
		prisma,
		session: session ?? null,
		user: user ?? null,
		clinic: session?.user?.clinic ?? null,

		// Request metadata
		headers: head,
		req: opts?.req ?? null,
		res: opts?.res ?? null,
		correlationId,
		clientIp,

		// Logging
		logger: childLogger,

		// Infrastructure
		redis,
		cache: redisCache,
		rateLimit,
		pubSub,

		// File storage
		s3: s3Client,
		s3Bucket: S3_BUCKET,

		// Performance tracking
		requestStart,

		logCompletion: () => {
			const duration = Date.now() - requestStart
			childLogger.info('TRPC request completed', { duration })
		},
	}
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>
