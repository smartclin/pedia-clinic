import { z } from 'zod'

import type { Prisma } from '@/prisma/browser'

import { AppointmentStatus, AppointmentType } from '../types/prisma-types'
import {
	appointmentStatusSchema,
	appointmentTypeSchema,
	clinicIdSchema,
	dateSchema,
	idSchema,
	paymentMethodSchema,
} from './helpers/enums'

export const AppointmentListSchema = z.object({
	clinicId: z.string(),
	doctorId: z.string().optional(),
	endDate: z.date().optional(),
	limit: z.number().min(1).max(100).default(20),
	page: z.number().min(1).default(1),
	patientId: z.string().optional(),
	startDate: z.date().optional(),
	status: appointmentStatusSchema.optional(),
})

export const AppointmentStatsSchema = z.object({
	clinicId: z.string(),
	endDate: z.date().optional(),
	startDate: z.date().optional(),
})

export const AppointmentCreateSchema = z.object({
	appointmentDate: z.date(),
	appointmentPrice: z.number().optional(),
	clinicId: z.string(),
	createReminder: z.boolean().optional(),
	doctorId: z.string(),
	id: z.string().optional(),
	note: z.string().optional(),
	patientId: z.string(),
	serviceId: z.string().optional(),
	status: appointmentStatusSchema.optional(),
	time: z.string().optional(),
	type: appointmentTypeSchema,
})

export const AppointmentUpdateSchema = z.object({
	appointmentDate: z.date().optional(),
	appointmentPrice: z.number().optional(),
	doctorId: z.string().optional(),
	id: z.uuid(),
	note: z.string().optional(),
	patientId: z.string().optional(),
	serviceId: z.string().optional(),
	status: appointmentStatusSchema.optional(),
	time: z.string().optional(),
	type: appointmentTypeSchema,
})

export const AppointmentUpdateStatusSchema = z.object({
	id: z.uuid(),
	reason: z.string().optional(),
	status: appointmentStatusSchema,
})

export const AppointmentActionSchema = z.object({
	id: z.string(),
	notes: z.string().optional(),
	reason: z.string().optional(),
	status: appointmentStatusSchema,
})

export const BillCreateSchema = z.object({
	appointmentId: z.string(),
	discount: z.number().min(0).default(0),
	items: z
		.array(
			z.object({
				description: z.string().optional(),
				quantity: z.number().int().min(1).max(100).default(1),
				serviceId: z.string(),
				unitCost: z.number().min(0),
			})
		)
		.min(1),
	notes: z.string().optional(),
	paymentMethod: paymentMethodSchema.optional(),
	tax: z.number().min(0).default(0),
})

export const AppointmentDeleteSchema = z.object({
	clinicId: clinicIdSchema,
	id: idSchema,
})

// ==================== QUERY INPUT SCHEMAS ====================
export const GetForMonthInputSchema = z.object({
	clinicId: clinicIdSchema,
	endDate: dateSchema,
	startDate: dateSchema,
})

export const AllAppointmentsInputSchema = z.object({
	clinicId: clinicIdSchema,
	fromDate: dateSchema.optional(),
	patientId: idSchema.optional(),
	search: z.string().optional(),
	skip: z.number().int().min(0).default(0),
	status: z.enum(AppointmentStatus).optional(),
	take: z.number().int().min(1).max(100).default(20),
	toDate: dateSchema.optional(),
})

export const AvailableTimesInputSchema = z.object({
	appointmentDate: dateSchema,
	clinicId: clinicIdSchema,
	doctorId: idSchema,
})

export const AppointmentStatsInputSchema = z.object({
	clinicId: clinicIdSchema,
	fromDate: dateSchema.optional(),
	toDate: dateSchema.optional(),
})

export type CreateAppointmentInput = z.infer<typeof AppointmentCreateSchema>
export type UpdateAppointmentInput = z.infer<typeof AppointmentUpdateSchema>
export type AppointmentActionInput = z.infer<typeof AppointmentActionSchema>
export type BillCreateInput = z.infer<typeof BillCreateSchema>

export type AppointmentStatusType = z.infer<typeof appointmentStatusSchema>
export const getForMonthInputSchema = z.object({
	clinicId: z.string(),
	endDate: z.date().min(1970),
	startDate: z.date().min(1).max(12),
})

export type GetForMonthInput = z.infer<typeof getForMonthInputSchema>

export const allAppointmentsInputSchema = z.object({
	clinicId: z.string(),
	doctorId: z.string().optional(),
	endDate: z.date().optional(),
	limit: z.number().min(1).max(100).default(20),
	page: z.number().min(1).default(1),
	patientId: z.string().optional(),
	search: z.string().optional(),
	skip: z.number().min(0).default(0),
	startDate: z.date().optional(),
	status: appointmentStatusSchema.optional(),
	take: z.number().min(1).max(100).default(20),
})
export type UpdateAppointmentStatusInput = z.infer<
	typeof AppointmentUpdateStatusSchema
>
export type DeleteAppointmentInput = z.infer<typeof AppointmentDeleteSchema>
export type AllAppointmentsInput = z.infer<typeof AllAppointmentsInputSchema>
export type AvailableTimesInput = z.infer<typeof AvailableTimesInputSchema>
export type AppointmentStatsInput = z.infer<typeof AppointmentStatsInputSchema>

export type AppointmentListInput = z.infer<typeof AppointmentListSchema>
export type AppointmentCreateInput = z.infer<typeof AppointmentCreateSchema>
export type AppointmentUpdateInput = z.infer<typeof AppointmentUpdateSchema>

export interface AppointmentStats {
	totalAppointments: number
	byStatus: Record<string, number>
	topDoctors?: Array<{ doctorId: string; doctorName: string; count: number }>
	topServices?: Array<{
		serviceId: string
		serviceName: string
		count: number
	}>
	monthlyTrend?: Array<{ month: string; appointments: number }>
	todayCount?: number
	upcomingCount?: number
}
// src/modules/appointment/appointment.types.ts

export type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
	include: {
		patient: {
			select: {
				id: true
				firstName: true
				lastName: true
				phone: true
				gender: true
				dateOfBirth: true
				image: true
				colorCode: true
			}
		}
		doctor: {
			select: {
				id: true
				name: true
				specialty: true
				img: true
				colorCode: true
				availableFromTime: true
				availableToTime: true
			}
		}
		service: {
			select: {
				id: true
				serviceName: true
				price: true
				isAvailable: true
				icon: true
				color: true
			}
		}
	}
}>

export type TimeSlot = {
	value: string // "09:00"
	available: boolean
	label?: string
}

export type AppointmentCalendarEvent = {
	id: string
	title: string
	start: Date
	end: Date
	patientName: string
	doctorName: string
	status: AppointmentStatus
	type: AppointmentType
	color?: string
}
export const AppointmentByIdSchema = z.object({
	id: z.uuid('Invalid appointment ID'),
	clinicId: z.string().optional(), // Used for multi-tenant isolation
})

export type AppointmentByIdInput = z.infer<typeof AppointmentByIdSchema>

/**
 * Schema for upcoming appointments dashboard/widgets
 */
export const UpcomingAppointmentsSchema = z.object({
	clinicId: z.string(),
	doctorId: z.string().optional(),
	patientId: z.string().optional(),
	daysAhead: z.number().int().min(1).max(365).default(7),
	limit: z.number().int().min(1).max(100).default(10),
})

export type UpcomingAppointmentsInput = z.infer<
	typeof UpcomingAppointmentsSchema
>

/**
 * Schema for analytics and reporting
 */
export const AppointmentDateRangeSchema = z.object({
	clinicId: z.string(),
	fromDate: z.coerce.date(),
	toDate: z.coerce.date(),
	groupBy: z.enum(['day', 'week', 'month']).default('day'),
})

export type AppointmentDateRangeInput = z.infer<
	typeof AppointmentDateRangeSchema
>

/**
 * Schema for the main appointment list/table with pagination
 */
export const ListAppointmentsSchema = z.object({
	clinicId: z.string(),
	patientId: z.string().optional(),
	doctorId: z.string().optional(),
	status: z.enum(AppointmentStatus).optional(),
	type: z.enum(AppointmentType).optional().optional(), // e.g., 'checkup', 'emergency'
	fromDate: z.coerce.date().optional(),
	toDate: z.coerce.date().optional(),
	limit: z.number().int().min(1).max(100).default(50),
	offset: z.number().int().min(0).default(0),
	includeCancelled: z.boolean().default(false),
})

export type ListAppointmentsInput = z.infer<typeof ListAppointmentsSchema>

export const DeleteAppointmentSchema = z.object({
	id: z.uuid('Invalid appointment ID'),
	clinicId: z.string(),
})
