import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import z from 'zod'

import type { Context } from './context'

// export const createTRPCContext = async () => {
// 	const user = await getUser()

// 	return {
// 		prisma,
// 		user,
// 	}
// }

export const t = initTRPC.context<Context>().create({
	errorFormatter({ shape, error }) {
		return {
			...shape,
			data: {
				...shape.data,
				zodError:
					error.cause instanceof z.ZodError
						? z.treeifyError(error.cause)
						: null,
			},
		}
	},
	transformer: superjson,
})

export const createTRPCRouter = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
	if (!ctx.user) {
		throw new TRPCError({ code: 'UNAUTHORIZED' })
	}
	return next({
		ctx: {
			...ctx,
			user: ctx.user,
		},
	})
})
export const performanceMiddleware = t.middleware(
	async ({ ctx, next, path, type, input }) => {
		const start = performance.now()
		ctx.logger.debug(`tRPC ${type} ${path} started`, {
			input: redactSensitiveData(input),
			userId: ctx.user?.id,
		})

		try {
			const result = await next()
			const duration = performance.now() - start

			ctx.logger.info(`tRPC ${type} ${path} completed`, {
				duration: `${duration.toFixed(2)}ms`,
				status: result.ok ? 'success' : 'error',
			})

			if (process.env.NODE_ENV === 'development' && ctx.res) {
				ctx.res.headers.set('X-Execution-Time', `${duration.toFixed(2)}ms`)
				ctx.res.headers.set('X-Correlation-ID', ctx.correlationId)
			}

			return result
		} catch (error) {
			const duration = performance.now() - start
			ctx.logger.error(`tRPC ${type} ${path} failed`, {
				duration: `${duration.toFixed(2)}ms`,
				err: error,
				input: redactSensitiveData(input),
			})
			throw error
		}
	}
)

// Authentication middleware
export const authMiddleware = t.middleware(async ({ ctx, next }) => {
	if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
	return next()
})

// Admin-only middleware
export const adminMiddleware = t.middleware(async ({ ctx, next }) => {
	const user = ctx.user
	if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })
	if (user.role !== 'admin')
		throw new TRPCError({
			code: 'FORBIDDEN',
			message: 'Admin access required',
		})
	return next()
})

// Clinic access middleware
export const clinicAccessMiddleware = t.middleware(async ({ ctx, next }) => {
	const userClinicId = ctx.user?.clinic?.id
	const userId = ctx.user?.id

	if (!(userClinicId && userId))
		throw new TRPCError({
			code: 'FORBIDDEN',
			message: 'Clinic access required',
		})

	const clinicMember = await ctx.prisma.clinicMember.findFirst({
		where: { clinicId: userClinicId, userId },
		include: { role: true },
	})

	if (!clinicMember || !clinicMember.role)
		throw new TRPCError({
			code: 'FORBIDDEN',
			message: 'No access to this clinic',
		})

	return next({ ctx: { ...ctx, role: clinicMember.roleId } })
})

// Role-based middleware factory
export const createRoleMiddleware = (allowedRoles: string[]) =>
	t.middleware(({ ctx, next }) => {
		const role = ctx.user?.role
		if (!role || !allowedRoles.includes(role))
			throw new TRPCError({ code: 'FORBIDDEN' })
		return next({ ctx: { ...ctx, userRole: role } })
	})

// Error logging middleware
export const errorLoggingMiddleware = t.middleware(
	async ({ ctx, next, path }) => {
		try {
			return await next()
		} catch (error) {
			if (error instanceof TRPCError) {
				ctx.logger.warn('Known tRPC error', {
					code: error.code,
					message: error.message,
					path,
				})
			} else {
				ctx.logger.error('Unexpected tRPC error', { err: error, path })
			}
			throw error
		}
	}
)

// Sensitive redaction
function redactSensitiveData(input: unknown): unknown {
	if (Array.isArray(input)) return input.map(redactSensitiveData)
	if (input && typeof input === 'object') {
		const sensitiveKeys = [
			'password',
			'token',
			'secret',
			'creditcard',
			'ssn',
			'authorization',
		]
		return Object.fromEntries(
			Object.entries(input).map(([k, v]) => [
				k,
				sensitiveKeys.some(s => k.toLowerCase().includes(s))
					? '[REDACTED]'
					: redactSensitiveData(v),
			])
		)
	}
	return input
}

// === Procedures ===
// export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory
export const baseProcedure = t.procedure

// export const publicProcedure = t.procedure.use(performanceMiddleware);
// export const protectedProcedure = t.procedure.use(authMiddleware);
export const adminProcedure = t.procedure.use(adminMiddleware)
export const clinicProcedure = protectedProcedure.use(clinicAccessMiddleware)
export const doctorProcedure = clinicProcedure.use(
	createRoleMiddleware(['DOCTOR', 'ADMIN'])
)
export const staffProcedure = clinicProcedure.use(
	createRoleMiddleware(['STAFF', 'DOCTOR', 'ADMIN'])
)
