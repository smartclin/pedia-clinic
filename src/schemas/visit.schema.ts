/**
 * ⚪ VISIT MODULE - SCHEMA LAYER
 *
 * RESPONSIBILITIES:
 * - Zod validation schemas
 * - Type inference
 * - Constants and enums
 * - NO business logic
 */

import { z } from 'zod'

import {
	clinicIdSchema,
	dateSchema,
	doctorIdSchema,
	idSchema,
	patientIdSchema,
	timeSchema,
} from './helpers/enums'
import { serviceIdSchema } from './service.schema'

// ==================== BASE SCHEMAS ====================

// ==================== ENUM SCHEMAS ====================

export const appointmentStatusSchema = z.enum([
	'PENDING',
	'SCHEDULED',
	'CANCELLED',
	'COMPLETED',
	'NO_SHOW',
])

export const appointmentTypeSchema = z.enum([
	'CONSULTATION',
	'VACCINATION',
	'PROCEDURE',
	'EMERGENCY',
	'CHECKUP',
	'FOLLOW_UP',
	'FEEDING_SESSION',
	'OTHER',
])

// ==================== VISIT CREATE SCHEMA ====================

export const VisitCreateSchema = z.object({
	appointmentDate: dateSchema,
	clinicId: clinicIdSchema.optional(), // Will be derived from patient
	doctorId: doctorIdSchema,
	note: z.string().max(1000, 'Note cannot exceed 1000 characters').optional(),
	patientId: patientIdSchema,
	reason: z.string().max(500, 'Reason cannot exceed 500 characters').optional(),
	serviceId: z.uuid(),
	status: appointmentStatusSchema.default('SCHEDULED'),
	time: timeSchema,
	type: appointmentTypeSchema,
})

// ==================== VISIT UPDATE SCHEMA ====================

export const VisitUpdateSchema = z.object({
	appointmentDate: dateSchema.optional(),
	doctorId: doctorIdSchema.optional(),
	id: idSchema,
	note: z.string().max(1000).optional(),
	reason: z.string().max(500).optional(),
	serviceId: serviceIdSchema,
	status: appointmentStatusSchema.optional(),
	time: timeSchema,
	type: appointmentTypeSchema.optional(),
})

// ==================== VISIT FILTER SCHEMAS ====================

export const VisitByIdSchema = z.object({
	id: idSchema,
})

export const VisitByPatientSchema = z.object({
	clinicId: clinicIdSchema,
	limit: z.number().min(1).max(100).default(20),
	offset: z.number().min(0).default(0),
	patientId: patientIdSchema,
})

export const VisitByClinicSchema = z.object({
	clinicId: clinicIdSchema,
	doctorId: doctorIdSchema.optional(),
	endDate: dateSchema.optional(),
	limit: z.number().min(1).max(100).default(50),
	offset: z.number().min(0).default(0),
	startDate: dateSchema.optional(),
	status: appointmentStatusSchema.optional(),
})

export const VisitRecentSchema = z.object({
	clinicId: clinicIdSchema,
	limit: z.number().min(1).max(20).default(5),
})

export const VisitTodaySchema = z.object({
	clinicId: clinicIdSchema,
})

export const VisitMonthSchema = z.object({
	clinicId: clinicIdSchema,
})

// ==================== VISIT COUNT SCHEMAS ====================

export const VisitCountTodaySchema = z.object({
	clinicId: clinicIdSchema,
})

export const VisitCountMonthSchema = z.object({
	clinicId: clinicIdSchema,
})

// ==================== TYPE INFERENCES ====================

export type VisitCreateInput = z.infer<typeof VisitCreateSchema>
export type VisitUpdateInput = z.infer<typeof VisitUpdateSchema>
export type VisitByIdInput = z.infer<typeof VisitByIdSchema>
export type VisitByPatientInput = z.infer<typeof VisitByPatientSchema>
export type VisitByClinicInput = z.infer<typeof VisitByClinicSchema>
export type VisitRecentInput = z.infer<typeof VisitRecentSchema>
export type VisitTodayInput = z.infer<typeof VisitTodaySchema>
export type VisitMonthInput = z.infer<typeof VisitMonthSchema>
export type VisitCountTodayInput = z.infer<typeof VisitCountTodaySchema>
export type VisitCountMonthInput = z.infer<typeof VisitCountMonthSchema>

// ==================== CONSTANTS ====================

export const APPOINTMENT_STATUS = {
	CANCELLED: 'CANCELLED',
	COMPLETED: 'COMPLETED',
	NO_SHOW: 'NO_SHOW',
	PENDING: 'PENDING',
	SCHEDULED: 'SCHEDULED',
} as const

export const APPOINTMENT_TYPE = {
	CHECKUP: 'CHECKUP',
	CONSULTATION: 'CONSULTATION',
	EMERGENCY: 'EMERGENCY',
	FEEDING_SESSION: 'FEEDING_SESSION',
	FOLLOW_UP: 'FOLLOW_UP',
	OTHER: 'OTHER',
	PROCEDURE: 'PROCEDURE',
	VACCINATION: 'VACCINATION',
} as const

export const APPOINTMENT_TYPE_LABELS: Record<
	keyof typeof APPOINTMENT_TYPE,
	string
> = {
	CHECKUP: 'Check-up',
	CONSULTATION: 'Consultation',
	EMERGENCY: 'Emergency',
	FEEDING_SESSION: 'Feeding Session',
	FOLLOW_UP: 'Follow-up',
	OTHER: 'Other',
	PROCEDURE: 'Procedure',
	VACCINATION: 'Vaccination',
} as const

export const APPOINTMENT_STATUS_LABELS: Record<
	keyof typeof APPOINTMENT_STATUS,
	string
> = {
	CANCELLED: 'Cancelled',
	COMPLETED: 'Completed',
	NO_SHOW: 'No Show',
	PENDING: 'Pending',
	SCHEDULED: 'Scheduled',
} as const

export const APPOINTMENT_STATUS_COLORS: Record<
	keyof typeof APPOINTMENT_STATUS,
	string
> = {
	CANCELLED: 'red',
	COMPLETED: 'green',
	NO_SHOW: 'gray',
	PENDING: 'yellow',
	SCHEDULED: 'blue',
} as const

export const getUpcomingVaccinationsSchema = z.object({
	clinicId: z.string(),
	daysAhead: z.number().optional().default(30),
	limit: z.number().optional().default(10),
})

export const getImmunizationsByClinicSchema = z.object({
	clinicId: z.string(),
	endDate: z.date().optional(),
	startDate: z.date().optional(),
})

export const recordImmunizationSchema = z.object({
	administeredBy: z.string(),
	administrationDate: z.date(),
	clinicId: z.string(),
	doseNumber: z.number(),
	lotNumber: z.string().optional(),
	manufacturer: z.string().optional(),
	nextDueDate: z.date().optional(),
	notes: z.string().optional(),
	patientId: z.string(),
	vaccineId: z.string(),
})

export const getVaccineScheduleSchema = z.object({
	ageInDays: z.number().optional(),
	patientId: z.string().optional(),
})
