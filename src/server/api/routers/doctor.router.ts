// modules/doctor/doctor.router.ts

import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import {
	CreateDoctorSchema,
	DoctorByIdSchema,
	DoctorListSchema,
} from '@/schemas/doctor.schema'
import * as doctorService from '@/server/services/doctor.service'

import { createTRPCRouter, protectedProcedure } from '../trpc'

export const doctorRouter = createTRPCRouter({
	// ==================== QUERIES (Direct to service with caching) ====================

	list: protectedProcedure.query(async ({ ctx }) => {
		const clinicId = ctx.clinic?.id
		if (!clinicId) {
			throw new TRPCError({ code: 'BAD_REQUEST', message: 'No clinic ID' })
		}

		// Service has 'use cache' directive
		return doctorService.getDoctorsByClinic(clinicId)
	}),

	getById: protectedProcedure
		.input(DoctorByIdSchema)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'BAD_REQUEST', message: 'No clinic ID' })
			}

			return doctorService.getDoctorById(input.id, clinicId)
		}),

	getWithAppointments: protectedProcedure
		.input(DoctorByIdSchema)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'BAD_REQUEST', message: 'No clinic ID' })
			}

			return doctorService.getDoctorWithAppointments(input.id, clinicId)
		}),

	getAvailable: protectedProcedure.query(async ({ ctx }) => {
		const clinicId = ctx.clinic?.id
		if (!clinicId) {
			throw new TRPCError({ code: 'BAD_REQUEST', message: 'No clinic ID' })
		}

		return doctorService.getAvailableDoctors(clinicId)
	}),

	getTodaySchedule: protectedProcedure.query(async ({ ctx }) => {
		const clinicId = ctx.clinic?.id
		if (!clinicId) {
			throw new TRPCError({ code: 'BAD_REQUEST', message: 'No clinic ID' })
		}

		return doctorService.getTodaySchedule(clinicId)
	}),

	getPaginated: protectedProcedure
		.input(DoctorListSchema)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'BAD_REQUEST', message: 'No clinic ID' })
			}

			return doctorService.getPaginatedDoctors({
				clinicId,
				limit: input.limit,
				page: input.page,
				search: input.search,
			})
		}),

	getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
		const clinicId = ctx.clinic?.id
		const userId = ctx.user?.id

		if (!(clinicId && userId)) {
			throw new TRPCError({ code: 'UNAUTHORIZED' })
		}

		// Get doctor ID from user ID
		const doctor = await doctorService.getDoctorById(userId, clinicId)
		if (!doctor) {
			throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a doctor' })
		}

		return doctorService.getDoctorDashboardStats(doctor.id, clinicId)
	}),

	// ==================== MUTATIONS (Delegates to actions) ====================

	upsert: protectedProcedure
		.input(CreateDoctorSchema)
		.mutation(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			const userId = ctx.user?.id

			if (!(clinicId && userId)) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			// Direct service call (service handles cache invalidation)
			return doctorService.upsertDoctor(input, clinicId, userId)
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.uuid() }))
		.mutation(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			const userId = ctx.user?.id

			if (!(clinicId && userId)) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return doctorService.deleteDoctor(input.id, clinicId)
		}),
})
