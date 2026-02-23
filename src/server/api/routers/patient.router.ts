// src/modules/patient/patient.router.ts

import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import {
	CreatePatientSchema,
	DeletePatientSchema,
	GetAllPatientsSchema,
	GetPatientByIdSchema,
	getPatientListSchema,
	infiniteListSchema,
	UpdatePatientSchema,
	UpsertPatientSchema,
} from '@/schemas/patient.schema'
import * as patientService from '@/server/services/patient.service'

import { validateClinicAccess } from '../../utils'
import { createTRPCRouter, protectedProcedure } from '../trpc'

export const patientRouter = createTRPCRouter({
	// ==================== QUERIES (Direct to service with caching) ====================
	getList: protectedProcedure
		.input(getPatientListSchema)
		.query(async ({ ctx, input }) => {
			try {
				// Verify clinic access
				await validateClinicAccess(input.clinicId, ctx.user.id)

				return await patientService.getPatientList(input)
			} catch (error) {
				console.error('Error in patient.getList:', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message:
						error instanceof Error ? error.message : 'Failed to fetch patients',
				})
			}
		}),

	getById: protectedProcedure
		.input(GetPatientByIdSchema)
		.query(async ({ ctx, input }) => {
			try {
				const clinicId = ctx.clinic?.id ?? ''
				await validateClinicAccess(clinicId, ctx.user.id)
				return await patientService.getPatientById(input.id, clinicId)
			} catch (error) {
				console.error('Error in patient.getById:', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message:
						error instanceof Error ? error.message : 'Failed to fetch patient',
				})
			}
		}),
	getInfiniteList: protectedProcedure
		.input(infiniteListSchema)
		.query(async ({ ctx, input }) => {
			try {
				await validateClinicAccess(input.clinicId, ctx.user.id)
				return await patientService.getPatientsInfinite(
					input.clinicId,
					input.limit,
					input.cursor,
					input.search
				)
			} catch (error) {
				console.error('Error in patient.getInfiniteList:', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to fetch patients',
				})
			}
		}),

	getFullDataById: protectedProcedure
		.input(GetPatientByIdSchema)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return patientService.getPatientFullDataById(input.id, clinicId)
		}),

	getDashboardStats: protectedProcedure
		.input(GetPatientByIdSchema)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return patientService.getPatientDashboardStats(input.id, clinicId)
		}),

	getRecentPatients: protectedProcedure.query(async ({ ctx }) => {
		const clinicId = ctx.clinic?.id
		if (!clinicId) {
			throw new TRPCError({ code: 'UNAUTHORIZED' })
		}

		return patientService.getRecentPatients(clinicId)
	}),

	getAll: protectedProcedure.query(async ({ ctx }) => {
		const clinicId = ctx.clinic?.id
		if (!clinicId) {
			throw new TRPCError({ code: 'UNAUTHORIZED' })
		}

		return patientService.getAllPatientsByClinic(clinicId)
	}),

	getCount: protectedProcedure.query(async ({ ctx }) => {
		const clinicId = ctx.clinic?.id
		if (!clinicId) return 0

		return patientService.getPatientCount(clinicId)
	}),
	getStats: protectedProcedure
		.input(z.object({ clinicId: z.uuid() }))
		.query(async ({ ctx, input }) => {
			try {
				await validateClinicAccess(input.clinicId, ctx.user.id)
				return await patientService.getPatientStats(input.clinicId)
			} catch (error) {
				console.error('Error in patient.getStats:', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to fetch patient stats',
				})
			}
		}),

	getAllPatients: protectedProcedure
		.input(GetAllPatientsSchema)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return patientService.getAllPatientsPaginated({
				...input,
				clinicId,
			})
		}),

	getAvailableDoctors: protectedProcedure
		.input(z.object({ day: z.date() }))
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			const dayName = input.day.toLocaleString('en-US', { weekday: 'long' })
			return patientService.getAvailableDoctorsByDay(dayName, clinicId)
		}),

	// ==================== MUTATIONS (Direct to service or action) ====================

	create: protectedProcedure
		.input(CreatePatientSchema)
		.mutation(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			const userId = ctx.user?.id

			if (!(clinicId && userId)) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return patientService.createPatient({ ...input, clinicId }, userId)
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.uuid(),
				data: UpdatePatientSchema,
			})
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.user?.id
			if (!userId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return patientService.updatePatient(input.id, input.data, userId)
		}),

	delete: protectedProcedure
		.input(DeletePatientSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.user?.id
			if (!userId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return patientService.deletePatient(input.id, userId)
		}),

	upsert: protectedProcedure
		.input(UpsertPatientSchema)
		.mutation(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			const userId = ctx.user?.id

			if (!(clinicId && userId)) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return patientService.upsertPatient({ ...input, clinicId }, userId)
		}),

	// Legacy endpoints - kept for backward compatibility
	createNewPatient: protectedProcedure
		.input(CreatePatientSchema)
		.mutation(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			const userId = ctx.user?.id

			if (!(clinicId && userId)) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return patientService.createNewPatient({
				...input,
				clinicId,
				userId,
			})
		}),

	getPatientDashboardStatistics: protectedProcedure
		.input(z.string())
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return patientService.getPatientDashboardStats(input, clinicId)
		}),

	getPatientFullDataById: protectedProcedure
		.input(z.string())
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return patientService.getPatientFullDataById(input, clinicId)
		}),

	// Deprecated - use getAllPatients instead
	list: protectedProcedure
		.input(z.object({ clinicId: z.string() }).optional())
		.query(async ({ ctx }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) return []

			return patientService.getPatientsByClinic(clinicId)
		}),
})
