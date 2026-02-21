import { z } from 'zod'

import type {
	AppointmentStatus,
	PaymentStatus,
	ReminderStatus,
} from '../types/prisma-types'
import type { workingDaySchema } from './doctor.schema'
import {
	clinicIdSchema,
	dateSchema,
	emailSchema,
	hexColorSchema,
	idSchema,
	pastDateSchema,
} from './helpers/enums'

// ============ CONSTANTS ============
export const MIN_PASSWORD_LENGTH = 8
export const MIN_NAME_LENGTH = 2
export const MAX_NAME_LENGTH = 50
export const PHONE_LENGTH = 10
export const MIN_ADDRESS_LENGTH = 5
export const MAX_ADDRESS_LENGTH = 500

// ============ BASE SCHEMAS ============

// ============ STAFF SCHEMAS ============
export const StaffSchema = z.object({
	address: z
		.string()
		.min(
			MIN_ADDRESS_LENGTH,
			`Address must be at least ${MIN_ADDRESS_LENGTH} characters`
		)
		.max(
			MAX_ADDRESS_LENGTH,
			`Address must be at most ${MAX_ADDRESS_LENGTH} characters`
		),
	department: z.string().optional(),
	email: emailSchema,
	img: z.string().url('Invalid image URL').optional(),
	licenseNumber: z.string().optional(),
	name: z
		.string()
		.trim()
		.min(MIN_NAME_LENGTH, `Name must be at least ${MIN_NAME_LENGTH} characters`)
		.max(MAX_NAME_LENGTH, `Name must be at most ${MAX_NAME_LENGTH} characters`),
	password: z
		.string()
		.min(
			MIN_PASSWORD_LENGTH,
			`Password must be at least ${MIN_PASSWORD_LENGTH} characters`
		)
		.or(z.literal('').optional()),
	phone: z
		.string()
		.min(PHONE_LENGTH, `Contact must be ${PHONE_LENGTH} digits`)
		.max(PHONE_LENGTH, `Contact must be ${PHONE_LENGTH} digits`)
		.regex(/^\d+$/, 'Phone must contain only numbers'),
	role: z.enum(['STAFF'], { error: 'Role is required' }),
})

export const StaffAuthSchema = z.object({
	address: z.string().min(1, 'Address is required'),
	clinicId: clinicIdSchema,
	colorCode: hexColorSchema.optional(),
	department: z.string().min(1, 'Department is required'),
	email: emailSchema,
	hireDate: pastDateSchema.optional(),
	img: z.string().url('Invalid image URL').optional(),
	licenseNumber: z.string().optional(),
	name: z.string().min(1, 'Name is required'),
	password: z
		.string()
		.min(
			MIN_PASSWORD_LENGTH,
			`Password must be at least ${MIN_PASSWORD_LENGTH} characters`
		),
	phone: z.string().min(1, 'Phone is required'),
	role: z.enum(['STAFF']).default('STAFF'),
	salary: z.number().min(0, 'Salary must be positive').optional(),
	status: z.enum(['ACTIVE', 'INACTIVE', 'DORMANT']).default('ACTIVE'),
})

// ============ SERVICE SCHEMAS ============
export const ServicesSchema = z.object({
	clinicId: clinicIdSchema.optional(),
	description: z.string().min(1, 'Service description is required'),
	id: idSchema.optional(),
	isAvailable: z.boolean().default(true).optional(),
	price: z.number().positive('Price must be greater than 0'),
	serviceName: z.string().min(2, 'Service name must be at least 2 characters'),
})

// ============ DELETE SCHEMAS ============
export const DeleteInputSchema = z.object({
	clinicId: clinicIdSchema,
	deleteType: z.enum([
		'doctor',
		'service',
		'staff',
		'patient',
		'payment',
		'bill',
	]),
	id: idSchema,
})

// ============ STATS SCHEMAS ============
export const StatsInputSchema = z
	.object({
		clinicId: clinicIdSchema,
		from: dateSchema,
		to: dateSchema,
	})
	.refine(data => data.from <= data.to, {
		message: 'From date must be before or equal to To date',
		path: ['from'],
	})

// ============ STAFF MANAGEMENT SCHEMAS ============
export const staffCreateSchema = z.object({
	address: z.string().min(1, 'Address is required'),
	clinicId: clinicIdSchema,
	colorCode: hexColorSchema.optional(),
	createdAt: dateSchema.optional(),
	department: z.string().optional(),
	email: emailSchema,
	hireDate: pastDateSchema.optional(),
	id: idSchema.optional(),
	img: z.string().url().optional(),
	isDeleted: z.boolean().default(false),
	licenseNumber: z.string().optional(),
	name: z.string().min(1, 'Name is required'),
	phone: z.string().min(1, 'Phone is required'),
	role: z.enum(['STAFF']),
	salary: z.number().min(0).optional(),
	status: z.enum(['ACTIVE', 'INACTIVE', 'DORMANT']).default('ACTIVE'),
	updatedAt: dateSchema.optional(),
	userId: idSchema.optional(),
})

export const staffUpdateSchema = staffCreateSchema.partial().extend({
	clinicId: clinicIdSchema,
	id: idSchema,
})

// ============ STATUS CHANGE SCHEMAS ============
export const deleteSchema = z.object({
	clinicId: clinicIdSchema,
	hardDelete: z.boolean().default(false),
	id: idSchema,
})

export const statusChangeSchema = z.object({
	clinicId: clinicIdSchema,
	id: idSchema,
	reason: z.string().optional().default('Status changed by admin'),
	status: z.enum(['ACTIVE', 'INACTIVE', 'DORMANT']),
})

// ============ RESPONSE SCHEMAS ============
export const SuccessResponseSchema = z.object({
	data: z.any().optional(),
	message: z.string(),
	success: z.literal(true),
})

export const ErrorResponseSchema = z.object({
	error: z.string().optional(),
	errors: z.array(z.string()).optional(),
	message: z.string(),
	success: z.literal(false),
})

export const CreateStaffResponseSchema = z.union([
	SuccessResponseSchema,
	ErrorResponseSchema,
])

// ============ TYPE EXPORTS ============
export type ServiceInput = z.infer<typeof ServicesSchema>
export type CreateStaffInput = z.infer<typeof StaffAuthSchema>
export type WorkingDayInput = z.infer<typeof workingDaySchema>
export type DeleteInput = z.infer<typeof DeleteInputSchema>
export type StatsInput = z.infer<typeof StatsInputSchema>
export type StaffValues = z.infer<typeof staffCreateSchema>
export type StaffCreate = z.infer<typeof staffCreateSchema>
export type StaffUpdate = z.infer<typeof staffUpdateSchema>
export type StaffSelect = z.infer<typeof staffCreateSchema>
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>

// ============ ENUM LABELS ============
export const appointmentStatusLabels: Record<AppointmentStatus, string> = {
	CANCELLED: 'Cancelled',
	COMPLETED: 'Completed',
	NO_SHOW: 'No Show',
	PENDING: 'Pending',
	SCHEDULED: 'Scheduled',
}

export const paymentStatusLabels: Record<PaymentStatus, string> = {
	PAID: 'Paid',
	PARTIAL: 'Partially Paid',
	REFUNDED: 'Refunded',
	UNPAID: 'Unpaid',
}

export const reminderStatusLabels: Record<ReminderStatus, string> = {
	FAILED: 'Failed',
	PENDING: 'Pending',
	SENT: 'Sent',
}

export const staffStatusLabels: Record<string, string> = {
	ACTIVE: 'Active',
	DORMANT: 'Dormant',
	INACTIVE: 'Inactive',
}

export const deleteTypeLabels: Record<string, string> = {
	bill: 'Bill',
	doctor: 'Doctor',
	patient: 'Patient',
	payment: 'Payment',
	service: 'Service',
	staff: 'Staff',
}

// ============ VALIDATION UTILITIES ============
export const validateClinicId = (
	clinicId: string,
	sessionClinicId?: string
): boolean => {
	return !!sessionClinicId && sessionClinicId === clinicId
}

export const validateStaffRole = (role: string): boolean => {
	return role === 'STAFF'
}

export const validateServicePrice = (price: number): boolean => {
	return price > 0
}

// ============ TRANSFORM UTILITIES ============
export const transformPhoneNumber = (phone: string): string => {
	// Remove all non-digit characters
	const digits = phone.replace(/\D/g, '')
	return digits.slice(-PHONE_LENGTH)
}

export const transformToLowercase = (input: string): string => {
	return input.toLowerCase()
}

export const transformDateToISO = (date: Date | string): string => {
	return new Date(date).toISOString()
}

// ============ DEFAULT VALUES ============
export const DEFAULT_STAFF_VALUES: Partial<StaffCreate> = {
	hireDate: new Date(),
	isDeleted: false,
	salary: 0,
	status: 'ACTIVE',
}

export const DEFAULT_SERVICE_VALUES: Partial<ServiceInput> = {
	isAvailable: true,
}

// ============ SCHEMA FACTORIES ============
export const createClinicSchema = <T extends z.ZodRawShape>(
	schema: z.ZodObject<T>
) => {
	return schema.extend({
		clinicId: clinicIdSchema,
	})
}

export const createPaginationSchema = (defaultLimit = 10, maxLimit = 100) => {
	return z.object({
		clinicId: clinicIdSchema,
		limit: z.number().int().min(1).max(maxLimit).default(defaultLimit),
		page: z.number().int().positive().default(1),
		search: z.string().optional(),
		sortBy: z.string().optional(),
		sortOrder: z.enum(['asc', 'desc']).default('asc'),
	})
}
export const GetDataListSchema = z.object({
	clinicId: z.string(),
	cursor: z.string().nullish(),
	filter: z.record(z.string(), z.any()).optional(),
	limit: z.number().min(1).max(100).default(50),
	search: z.string().optional(),
	type: z.enum(['doctor', 'staff', 'patient', 'payment', 'bill']),
})

export type GetDataListInput = z.infer<typeof GetDataListSchema>
export const DeleteSchema = z.object({
	deleteType: z.enum([
		'doctor',
		'staff',
		'patient',
		'payment',
		'bill',
		'service',
	]),
	id: z.uuid(),
})
