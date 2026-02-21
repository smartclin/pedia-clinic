import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { clinicCreateSchema, reviewSchema } from '@/schemas/clinic.schema'
import {
	clinicService,
	dashboardService,
} from '@/server/services/clinic.service'
import { validateClinicAccess } from '@/server/utils'

import { createTRPCRouter, protectedProcedure } from '../trpc'

export const clinicRouter = createTRPCRouter({
	// ==================== QUERIES ====================

	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ input }) => {
			try {
				return await clinicService.getClinicById(input.id)
			} catch (error) {
				console.error('Error in getById:', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message:
						error instanceof Error ? error.message : 'Failed to fetch clinic',
				})
			}
		}),

	getWithAccess: protectedProcedure
		.input(z.object({ clinicId: z.string() }))
		.query(async ({ ctx, input }) => {
			try {
				const userId = ctx.user?.id
				if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })

				return await clinicService.getClinicWithUserAccess(
					input.clinicId,
					userId
				)
			} catch (error) {
				console.error('Error in getWithAccess:', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to fetch clinic access',
				})
			}
		}),

	getWorkingHours: protectedProcedure
		.input(z.object({ clinicId: z.string() }))
		.query(async ({ input }) => {
			try {
				return await clinicService.getClinicWorkingHours(input.clinicId)
			} catch (error) {
				console.error('Error in getWorkingHours:', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to fetch working hours',
				})
			}
		}),

	getFeatures: protectedProcedure.query(async () => {
		try {
			return await clinicService.getFeatures()
		} catch (error) {
			console.error('Error in getFeatures:', error)
			throw new TRPCError({
				code: 'INTERNAL_SERVER_ERROR',
				message: 'Failed to fetch features',
			})
		}
	}),

	getClinicStats: protectedProcedure.query(async () => {
		try {
			return await clinicService.getClinicStats()
		} catch (error) {
			console.error('Error in getClinicStats:', error)
			throw new TRPCError({
				code: 'INTERNAL_SERVER_ERROR',
				message: 'Failed to fetch clinic stats',
			})
		}
	}),

	countUserClinics: protectedProcedure.query(async ({ ctx }) => {
		try {
			const userId = ctx.user?.id
			if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })

			return await clinicService.countUserClinics(userId)
		} catch (error) {
			console.error('Error in countUserClinics:', error)
			throw new TRPCError({
				code: 'INTERNAL_SERVER_ERROR',
				message: 'Failed to count user clinics',
			})
		}
	}),

	// ==================== DASHBOARD QUERIES ====================

	getDashboardStats: protectedProcedure
		.input(
			z.object({
				clinicId: z.string(),
				from: z.date(),
				to: z.date(),
			})
		)
		.query(async ({ ctx, input }) => {
			try {
				// Validate access
				const userId = ctx.user?.id
				if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })
				await validateClinicAccess(input.clinicId, userId)

				return await dashboardService.getDashboardStats(
					input.clinicId,
					input.from,
					input.to
				)
			} catch (error) {
				console.error('Error in getDashboardStats:', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to fetch dashboard stats',
				})
			}
		}),

	getGeneralStats: protectedProcedure.query(async () => {
		try {
			return await dashboardService.getGeneralStats()
		} catch (error) {
			console.error('Error in getGeneralStats:', error)
			throw new TRPCError({
				code: 'INTERNAL_SERVER_ERROR',
				message: 'Failed to fetch general stats',
			})
		}
	}),

	getMedicalRecordsSummary: protectedProcedure
		.input(z.object({ clinicId: z.string() }))
		.query(async ({ ctx, input }) => {
			try {
				const userId = ctx.user?.id
				if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })
				await validateClinicAccess(input.clinicId, userId)

				return await dashboardService.getMedicalRecordsSummary(input.clinicId)
			} catch (error) {
				console.error('Error in getMedicalRecordsSummary:', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to fetch medical records summary',
				})
			}
		}),

	getRecentAppointments: protectedProcedure
		.input(z.object({ clinicId: z.string() }))
		.query(async ({ ctx, input }) => {
			try {
				const userId = ctx.user?.id
				if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })
				await validateClinicAccess(input.clinicId, userId)

				return await dashboardService.getRecentAppointments(input.clinicId)
			} catch (error) {
				console.error('Error in getRecentAppointments:', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to fetch recent appointments',
				})
			}
		}),

	getTodaySchedule: protectedProcedure
		.input(z.object({ clinicId: z.string() }))
		.query(async ({ ctx, input }) => {
			try {
				const userId = ctx.user?.id
				if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })
				await validateClinicAccess(input.clinicId, userId)

				return await dashboardService.getTodaySchedule(input.clinicId)
			} catch (error) {
				console.error('Error in getTodaySchedule:', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: "Failed to fetch today's schedule",
				})
			}
		}),

	getUpcomingImmunizations: protectedProcedure
		.input(z.object({ clinicId: z.string() }))
		.query(async ({ ctx, input }) => {
			try {
				const userId = ctx.user?.id
				if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })
				await validateClinicAccess(input.clinicId, userId)

				return await dashboardService.getUpcomingImmunizations(input.clinicId)
			} catch (error) {
				console.error('Error in getUpcomingImmunizations:', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to fetch upcoming immunizations',
				})
			}
		}),

	getMonthlyPerformance: protectedProcedure
		.input(z.object({ clinicId: z.string() }))
		.query(async ({ ctx, input }) => {
			try {
				const userId = ctx.user?.id
				if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })
				await validateClinicAccess(input.clinicId, userId)

				return await dashboardService.getMonthlyPerformance(input.clinicId)
			} catch (error) {
				console.error('Error in getMonthlyPerformance:', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to fetch monthly performance',
				})
			}
		}),

	// ==================== MUTATIONS ====================

	create: protectedProcedure
		.input(clinicCreateSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				const userId = ctx.user?.id
				if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })

				return await clinicService.createClinic(input, userId)
			} catch (error) {
				console.error('Error in create clinic:', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message:
						error instanceof Error ? error.message : 'Failed to create clinic',
				})
			}
		}),

	createReview: protectedProcedure
		.input(reviewSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				const userId = ctx.user?.id
				if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })

				if (!input.clinicId) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'Clinic ID is required',
					})
				}

				return await clinicService.createReview({
					...input,
					clinicId: input.clinicId,
				})
			} catch (error) {
				console.error('Error in createReview:', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message:
						error instanceof Error ? error.message : 'Failed to create review',
				})
			}
		}),
})
