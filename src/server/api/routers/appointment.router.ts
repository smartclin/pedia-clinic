import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import {
	AppointmentByIdSchema,
	AppointmentCreateSchema,
	AppointmentDateRangeSchema,
	AppointmentDeleteSchema,
	AppointmentUpdateSchema,
	AppointmentUpdateStatusSchema,
	ListAppointmentsSchema,
	UpcomingAppointmentsSchema,
} from '@/schemas/appointment.schema'

import {
	createAppointmentAction,
	deleteAppointmentAction,
	updateAppointmentAction,
	updateAppointmentStatusAction,
} from '../../../actions/appointment.action'
import {
	getAppointmentById,
	getAppointmentsByClinic,
	getAppointmentsByDateRange,
	getAvailableTimes,
	getDoctorAppointments,
	getPatientAppointments,
	getTodayAppointments,
	getUpcomingAppointments,
} from '../../services/appointment.service'
import { clinicProcedure, createTRPCRouter, protectedProcedure } from '../trpc'

export const appointmentRouter = createTRPCRouter({
	// ==================== QUERIES (Direct to service with caching) ====================

	/**
	 * Get appointment by ID
	 */
	getById: protectedProcedure
		.input(AppointmentByIdSchema)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return getAppointmentById(input.id, clinicId)
		}),

	/**
	 * List appointments with filters
	 */
	list: clinicProcedure
		.input(ListAppointmentsSchema)
		.query(async ({ ctx, input }) => {
			return getAppointmentsByClinic(ctx.clinic?.id ?? '', input)
		}),

	/**
	 * Get today's appointments
	 */
	getToday: clinicProcedure.query(async ({ ctx }) => {
		return getTodayAppointments(ctx.clinic?.id ?? '')
	}),

	/**
	 * Get upcoming appointments
	 */
	getUpcoming: clinicProcedure
		.input(UpcomingAppointmentsSchema)
		.query(async ({ ctx, input }) => {
			return getUpcomingAppointments({
				...input,
				clinicId: ctx.clinic?.id ?? '',
			})
		}),

	/**
	 * Get appointments by date range (analytics)
	 */
	getByDateRange: clinicProcedure
		.input(AppointmentDateRangeSchema)
		.query(async ({ ctx, input }) => {
			return getAppointmentsByDateRange({
				...input,
				clinicId: ctx.clinic?.id ?? '',
			})
		}),

	/**
	 * Get patient appointments
	 */
	getByPatient: protectedProcedure
		.input(
			z.object({
				patientId: z.uuid(),
				limit: z.number().min(1).max(100).optional(),
				includePast: z.boolean().optional(),
			})
		)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return getPatientAppointments(input.patientId, clinicId, {
				limit: input.limit,
				includePast: input.includePast,
			})
		}),

	/**
	 * Get doctor appointments/schedule
	 */
	getByDoctor: protectedProcedure
		.input(
			z.object({
				doctorId: z.uuid(),
				date: z.date().optional(),
			})
		)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return getDoctorAppointments(input.doctorId, clinicId, input.date)
		}),

	/**
	 * Get available time slots
	 */
	getAvailableTimes: protectedProcedure
		.input(
			z.object({
				doctorId: z.uuid(),
				date: z.date(),
			})
		)
		.query(async ({ ctx, input }) => {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			return getAvailableTimes(input.doctorId, clinicId, input.date)
		}),

	// ==================== MUTATIONS (Delegates to actions) ====================

	/**
	 * Create appointment
	 */
	create: protectedProcedure
		.input(AppointmentCreateSchema)
		.mutation(async ({ input }) => {
			return createAppointmentAction(input)
		}),

	/**
	 * Update appointment
	 */
	update: protectedProcedure
		.input(AppointmentUpdateSchema)
		.mutation(async ({ input }) => {
			if (!input.id) {
				throw new TRPCError({ code: 'BAD_REQUEST', message: 'ID required' })
			}

			return updateAppointmentAction(input.id, input)
		}),

	/**
	 * Update appointment status
	 */
	updateStatus: protectedProcedure
		.input(AppointmentUpdateStatusSchema)
		.mutation(async ({ input }) => {
			return updateAppointmentStatusAction(input)
		}),

	/**
	 * Delete/cancel appointment
	 */
	delete: protectedProcedure
		.input(AppointmentDeleteSchema)
		.mutation(async ({ input }) => {
			return deleteAppointmentAction(input)
		}),
})
