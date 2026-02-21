// src/modules/patient/patient.router.ts

import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import {
	CreatePatientSchema,
	DeletePatientSchema,
	GetAllPatientsSchema,
	GetPatientByIdSchema,
	UpdatePatientSchema,
	UpsertPatientSchema,
} from '@/schemas/patient.schema'
import { patientService } from '@/server/services/patient.service'

import { createTRPCRouter, protectedProcedure } from '../trpc'

export const patientRouter = createTRPCRouter({
	// ==================== QUERIES (Direct to service with caching) ====================

	getById: protectedProcedure
		.input(GetPatientByIdSchema)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return patientService.getPatientById(input.id, clinicId)
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
				id: z.string().uuid(),
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
