import { z } from 'zod'

import {
	clinicIdSchema,
	dateSchema,
	doctorIdSchema,
	idSchema,
	patientIdSchema,
} from './helpers/enums'

// ==================== BASE QUERY SCHEMAS ====================

/**
 * Base pagination schema for all queries
 */
export const BasePaginationSchema = z
	.object({
		limit: z.coerce
			.number()
			.int()
			.min(1, 'Limit must be at least 1')
			.max(100, 'Limit cannot exceed 100')
			.default(20),
		offset: z.coerce
			.number()
			.int()
			.min(0, 'Offset must be non-negative')
			.default(0),
		page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
	})
	.refine(
		data => {
			// Ensure offset is consistent with page
			const calculatedOffset = (data.page - 1) * data.limit
			return data.offset === calculatedOffset
		},
		{
			message: 'Offset should be (page - 1) * limit',
			path: ['offset'],
		}
	)

/**
 * Cursor-based pagination for infinite scroll
 */
export const CursorPaginationSchema = z.object({
	cursor: z.string().optional(),
	direction: z.enum(['forward', 'backward']).default('forward'),
	limit: z.coerce.number().int().min(1).max(100).default(20),
})

/**
 * Base sorting schema
 */
export const BaseSortingSchema = z.object({
	sortBy: z.string().optional(),
	sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

/**
 * Base date range schema
 */
export const DateRangeSchema = z
	.object({
		from: dateSchema.optional(),
		to: dateSchema.optional(),
	})
	.refine(
		data => {
			if (data.from && data.to) {
				return data.from <= data.to
			}
			return true
		},
		{
			message: 'From date must be before or equal to to date',
			path: ['to'],
		}
	)

/**
 * Base search schema
 */
export const BaseSearchSchema = z.object({
	search: z
		.string()
		.max(100, 'Search term must be less than 100 characters')
		.optional(),
	searchFields: z.array(z.string()).optional(), // Fields to search in
})

// ==================== CLINIC-LEVEL QUERY SCHEMAS ====================

/**
 * Base query schema for clinic-specific queries
 */
export const ClinicQuerySchema = BasePaginationSchema.extend({
	clinicId: clinicIdSchema,
	...BaseSearchSchema.shape,
	...DateRangeSchema.shape,
	...BaseSortingSchema.shape,
})

/**
 * Advanced clinic query with filters
 */
export const AdvancedClinicQuerySchema = ClinicQuerySchema.extend({
	filters: z
		.object({
			booleanFilters: z.record(z.string(), z.boolean()).optional(),
			categories: z.array(z.string()).optional(),
			rangeFilters: z
				.record(
					z.string(),
					z.object({
						max: z.number().optional(),
						min: z.number().optional(),
					})
				)
				.optional(),
			status: z.array(z.string()).optional(),
			tags: z.array(z.string()).optional(),
		})
		.optional(),
	include: z
		.object({
			counts: z.array(z.string()).optional(),
			metadata: z.boolean().default(false),
			relations: z.array(z.string()).optional(),
		})
		.optional(),
})

// ==================== PATIENT QUERY SCHEMAS ====================

/**
 * Patient search and filter schema
 */
export const PatientQuerySchema = ClinicQuerySchema.extend({
	demographics: z
		.object({
			ageRange: z
				.object({
					max: z.number().int().max(130).optional(),
					min: z.number().int().min(0).optional(),
				})
				.optional(),
			bloodGroup: z.array(z.string()).optional(),
			gender: z.array(z.enum(['MALE', 'FEMALE'])).optional(),
		})
		.optional(),
	doctorId: doctorIdSchema.optional(),
	medical: z
		.object({
			hasActivePrescriptions: z.boolean().optional(),
			hasAllergies: z.boolean().optional(),
			hasChronicConditions: z.boolean().optional(),
			lastVisitAfter: dateSchema.optional(),
			lastVisitBefore: dateSchema.optional(),
		})
		.optional(),
	patientId: patientIdSchema.optional(),
})

/**
 * Patient analytics query
 */
export const PatientAnalyticsQuerySchema = z.object({
	clinicId: clinicIdSchema,
	dateRange: DateRangeSchema,
	demographics: z
		.object({
			ageGroups: z
				.array(
					z.object({
						label: z.string(),
						max: z.number(),
						min: z.number(),
					})
				)
				.optional(),
			gender: z.boolean().default(true),
		})
		.optional(),
	groupBy: z.enum(['day', 'week', 'month', 'quarter', 'year']).optional(),
	metrics: z.array(
		z.enum([
			'total_patients',
			'new_patients',
			'active_patients',
			'age_distribution',
			'gender_distribution',
			'visit_frequency',
			'prescription_stats',
		])
	),
})

// ==================== MEDICAL RECORD QUERY SCHEMAS ====================

/**
 * Medical records query with clinical filters
 */
export const MedicalRecordQuerySchema = ClinicQuerySchema.extend({
	clinical: z
		.object({
			accessLevel: z
				.array(z.enum(['STANDARD', 'SENSITIVE', 'RESTRICTED']))
				.optional(),
			diagnosis: z.string().optional(),
			hasAttachments: z.boolean().optional(),
			isConfidential: z.boolean().optional(),
			symptoms: z.string().optional(),
			treatment: z.string().optional(),
		})
		.optional(),
	doctorId: doctorIdSchema.optional(),
	encounterStatus: z
		.array(z.enum(['PENDING', 'COMPLETED', 'CANCELLED']))
		.optional(),
	encounterType: z
		.array(
			z.enum([
				'CONSULTATION',
				'VACCINATION',
				'SCREENING',
				'FOLLOW_UP',
				'NUTRITION',
				'NEWBORN',
				'LACTATION',
				'OTHER',
			])
		)
		.optional(),
	patientId: patientIdSchema.optional(),
	soap: z
		.object({
			assessment: z.string().optional(),
			objective: z.string().optional(),
			plan: z.string().optional(),
			subjective: z.string().optional(),
		})
		.optional(),
})

/**
 * Vital signs query with medical context
 */
export const VitalSignsQuerySchema = ClinicQuerySchema.extend({
	abnormalOnly: z.boolean().default(false),
	ageContext: z
		.object({
			ageDays: z.number().int().optional(),
			ageMonths: z.number().int().optional(),
			ageYears: z.number().int().optional(),
		})
		.optional(),
	encounterId: idSchema.optional(),
	patientId: patientIdSchema.optional(),
	valueRanges: z
		.record(
			z.string(),
			z.object({
				max: z.number().optional(),
				min: z.number().optional(),
				unit: z.string().optional(),
			})
		)
		.optional(),
	vitalTypes: z
		.array(
			z.enum([
				'TEMPERATURE',
				'BLOOD_PRESSURE',
				'HEART_RATE',
				'RESPIRATORY_RATE',
				'OXYGEN_SATURATION',
				'HEIGHT',
				'WEIGHT',
				'BMI',
			])
		)
		.optional(),
})

// ==================== PRESCRIPTION QUERY SCHEMAS ====================

/**
 * Prescription query with medication filters
 */
export const PrescriptionQuerySchema = ClinicQuerySchema.extend({
	doctorId: doctorIdSchema.optional(),
	medication: z
		.object({
			category: z.string().optional(),
			dosageUnit: z
				.array(
					z.enum([
						'MG',
						'ML',
						'TABLET',
						'MCG',
						'G',
						'IU',
						'DROP',
						'SPRAY',
						'PUFF',
						'UNIT',
					])
				)
				.optional(),
			drugId: idSchema.optional(),
			name: z.string().optional(),
		})
		.optional(),
	patientId: patientIdSchema.optional(),
	pharmacy: z
		.object({
			dispensedBy: z.array(idSchema).optional(),
			dispensedDateRange: DateRangeSchema.optional(),
			hasRefills: z.boolean().optional(),
		})
		.optional(),
	prescription: z
		.object({
			endDateRange: DateRangeSchema.optional(),
			isChronic: z.boolean().optional(),
			issuedDateRange: DateRangeSchema.optional(),
			requiresPriorAuth: z.boolean().optional(),
			status: z
				.array(z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED', 'ON_HOLD']))
				.optional(),
		})
		.optional(),
})

// ==================== APPOINTMENT QUERY SCHEMAS ====================

/**
 * Appointment query with scheduling filters
 */
export const AppointmentQuerySchema = ClinicQuerySchema.extend({
	appointment: z
		.object({
			dateRange: DateRangeSchema,
			duration: z
				.object({
					max: z.number().int().max(480).optional(), // minutes
					min: z.number().int().min(5).optional(), // minutes
				})
				.optional(),
			status: z
				.array(
					z.enum(['PENDING', 'SCHEDULED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'])
				)
				.optional(),
			timeRange: z
				.object({
					endTime: z
						.string()
						.regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
						.optional(),
					startTime: z
						.string()
						.regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
						.optional(),
				})
				.optional(),
			type: z
				.array(
					z.enum([
						'CONSULTATION',
						'VACCINATION',
						'PROCEDURE',
						'EMERGENCY',
						'CHECKUP',
						'FOLLOW_UP',
						'FEEDING_SESSION',
						'OTHER',
					])
				)
				.optional(),
		})
		.optional(),
	doctorId: doctorIdSchema.optional(),
	patientId: patientIdSchema.optional(),
	scheduling: z
		.object({
			includeCancelled: z.boolean().default(false),
			includeNoShow: z.boolean().default(false),
			showAvailableOnly: z.boolean().default(false),
		})
		.optional(),
	serviceId: idSchema.optional(),
})

// ==================== AGGREGATION QUERY SCHEMAS ====================

/**
 * Analytics and aggregation query
 */
export const AnalyticsQuerySchema = z.object({
	clinicId: clinicIdSchema,
	comparison: z
		.object({
			compareWith: z
				.enum(['previous_period', 'same_period_last_year'])
				.optional(),
			periodOffset: z.number().int().default(1), // For comparison
		})
		.optional(),
	dateRange: DateRangeSchema,
	filters: z
		.object({
			doctorIds: z.array(idSchema).optional(),
			patientSegments: z.array(z.string()).optional(),
			serviceIds: z.array(idSchema).optional(),
		})
		.optional(),
	groupBy: z.enum(['hour', 'day', 'week', 'month', 'quarter', 'year']),
	metrics: z.array(
		z.enum([
			'patient_count',
			'appointment_count',
			'revenue',
			'prescription_count',
			'visit_duration',
			'no_show_rate',
			'cancellation_rate',
			'patient_satisfaction',
		])
	),
})

/**
 * Export query with format options
 */
export const ExportQuerySchema = z.object({
	clinicId: clinicIdSchema,
	dateRange: DateRangeSchema.optional(),
	entityType: z.enum([
		'patients',
		'appointments',
		'medical_records',
		'prescriptions',
		'vital_signs',
	]),
	fields: z.array(z.string()).optional(), // Specific fields to include
	filters: z.record(z.string(), z.any()).optional(), // Dynamic filters based on entity type
	format: z.enum(['csv', 'xlsx', 'pdf', 'json']).default('csv'),
	options: z
		.object({
			dateFormat: z.enum(['ISO', 'US', 'EU']).default('ISO'),
			includeHeaders: z.boolean().default(true),
			language: z.string().default('en'),
			timezone: z.string().optional(),
		})
		.optional(),
})

// ==================== TYPE EXPORTS ====================
export type BasePaginationInput = z.infer<typeof BasePaginationSchema>
export type CursorPaginationInput = z.infer<typeof CursorPaginationSchema>
export type BaseSortingInput = z.infer<typeof BaseSortingSchema>
export type DateRangeInput = z.infer<typeof DateRangeSchema>
export type BaseSearchInput = z.infer<typeof BaseSearchSchema>
export type ClinicQueryInput = z.infer<typeof ClinicQuerySchema>
export type AdvancedClinicQueryInput = z.infer<typeof AdvancedClinicQuerySchema>
export type PatientQueryInput = z.infer<typeof PatientQuerySchema>
export type PatientAnalyticsQueryInput = z.infer<
	typeof PatientAnalyticsQuerySchema
>
export type MedicalRecordQueryInput = z.infer<typeof MedicalRecordQuerySchema>
export type VitalSignsQueryInput = z.infer<typeof VitalSignsQuerySchema>
export type PrescriptionQueryInput = z.infer<typeof PrescriptionQuerySchema>
export type AppointmentQueryInput = z.infer<typeof AppointmentQuerySchema>
export type AnalyticsQueryInput = z.infer<typeof AnalyticsQuerySchema>
export type ExportQueryInput = z.infer<typeof ExportQuerySchema>
