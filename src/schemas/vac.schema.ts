/**
 * ⚪ VACCINATION MODULE - SCHEMA LAYER
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
	idSchema,
	patientIdSchema,
	staffIdSchema,
} from './helpers/enums'

// ==================== BASE SCHEMAS ====================

// ==================== ENUM SCHEMAS ====================

export const immunizationStatusSchema = z.enum([
	'COMPLETED',
	'PENDING',
	'DELAYED',
	'EXEMPTED',
])

export const vaccineRouteSchema = z.enum([
	'IM', // Intramuscular
	'SC', // Subcutaneous
	'ID', // Intradermal
	'PO', // Oral
	'IN', // Intranasal
])

// ==================== VACCINE SCHEDULE SCHEMAS ====================

export const VaccineScheduleSchema = z.object({
	ageInDaysMax: z.number().int().min(0).optional(),
	ageInDaysMin: z.number().int().min(0).optional(),
	description: z.string().optional(),
	dosesRequired: z.number().int().min(1, 'Doses required must be at least 1'),
	id: idSchema.optional(),
	isMandatory: z.boolean().default(true),
	lotNumberFormat: z.string().optional(),
	manufacturer: z.string().optional(),
	minimumInterval: z
		.number()
		.int()
		.min(0, 'Minimum interval cannot be negative')
		.optional(),
	recommendedAge: z.string().min(1, 'Recommended age is required'),
	route: vaccineRouteSchema.default('IM'),
	vaccineName: z.string().min(1, 'Vaccine name is required'),
})

// ==================== IMMUNIZATION RECORD SCHEMAS ====================

export const ImmunizationCreateSchema = z.object({
	administeredByDoctorId: idSchema.optional(),
	administeredByStaffId: staffIdSchema,
	clinicId: clinicIdSchema.optional(), // Will be derived from patient
	date: dateSchema,
	dose: z.string().optional(),
	expirationDate: dateSchema.optional(),
	lotNumber: z.string().optional(),
	manufacturer: z.string().optional(),
	medicalRecordId: idSchema.optional(),
	nextDueDate: dateSchema.optional(),
	notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
	patientId: patientIdSchema,
	route: vaccineRouteSchema.optional(),
	site: z.string().optional(), // e.g., "Left deltoid", "Right thigh"
	status: immunizationStatusSchema.default('COMPLETED'),
	vaccine: z.string().min(1, 'Vaccine name is required'),
})

export const ImmunizationUpdateSchema = z.object({
	administeredByDoctorId: idSchema.optional(),
	administeredByStaffId: staffIdSchema,
	date: dateSchema.optional(),
	dose: z.string().optional(),
	expirationDate: dateSchema.optional(),
	id: idSchema,
	lotNumber: z.string().optional(),
	manufacturer: z.string().optional(),
	nextDueDate: dateSchema.optional(),
	notes: z.string().max(1000).optional(),
	route: vaccineRouteSchema.optional(),
	site: z.string().optional(),
	status: immunizationStatusSchema.optional(),
})

export const ImmunizationRecordSchema = z.object({
	administeredByStaffId: z.string().nullable(),
	createdAt: dateSchema,
	date: dateSchema,
	dose: z.string().nullable(),
	id: idSchema,
	lotNumber: z.string().nullable(),
	notes: z.string().nullable(),
	patientId: patientIdSchema,
	status: immunizationStatusSchema,
	updatedAt: dateSchema,
	vaccine: z.string(),
})

// ==================== VACCINATION SCHEDULING SCHEMAS ====================

export const ScheduleVaccinationSchema = z.object({
	clinicId: clinicIdSchema.optional(),
	doseNumber: z.number().int().min(1).optional(),
	dueDate: dateSchema,
	notes: z.string().optional(),
	patientId: patientIdSchema,
	scheduleId: idSchema.optional(), // Reference to vaccine schedule
	vaccineName: z.string().min(1, 'Vaccine name is required'),
})

export const DueVaccinationSchema = z.object({
	daysOverdue: z.number().int(),
	doseNumber: z.number().optional(),
	dueDate: dateSchema,
	isOverdue: z.boolean(),
	patientAgeMonths: z.number(),
	patientId: patientIdSchema,
	patientName: z.string(),
	scheduleId: z.string().optional(),
	vaccineName: z.string(),
})

// ==================== FILTER SCHEMAS ====================

export const VaccinationByIdSchema = z.object({
	id: idSchema,
})

export const VaccinationByPatientSchema = z.object({
	clinicId: clinicIdSchema,
	includeCompleted: z.boolean().default(true),
	limit: z.number().min(1).max(100).default(50),
	offset: z.number().min(0).default(0),
	patientId: patientIdSchema,
})

export const VaccinationByClinicSchema = z.object({
	clinicId: clinicIdSchema,
	endDate: dateSchema.optional(),
	limit: z.number().min(1).max(100).default(50),
	offset: z.number().min(0).default(0),
	startDate: dateSchema.optional(),
	status: immunizationStatusSchema.optional(),
})

export const UpcomingVaccinationsSchema = z.object({
	clinicId: clinicIdSchema,
	daysAhead: z.number().int().min(1).max(365).default(30),
	isOverDue: z.boolean().default(false),
	limit: z.number().min(1).max(100).default(20),
})

export const OverdueVaccinationsSchema = z.object({
	clinicId: clinicIdSchema,
	daysOverdue: z.number().int().min(0).default(0),
	limit: z.number().min(1).max(100).default(20),
})

export const VaccineScheduleFilterSchema = z.object({
	ageMonths: z.number().int().min(0).max(240).optional(),
	isMandatory: z.boolean().optional(),
	limit: z.number().min(1).max(100).default(50),
	vaccineName: z.string().optional(),
})

// ==================== COUNT SCHEMAS ====================

export const UpcomingCountSchema = z.object({
	clinicId: clinicIdSchema,
	daysAhead: z.number().int().min(1).max(365).default(30),
})

export const OverdueCountSchema = z.object({
	clinicId: clinicIdSchema,
	daysOverdue: z.number().int().min(0).default(0),
})

export const CompletionRateSchema = z.object({
	clinicId: clinicIdSchema,
	endDate: dateSchema,
	startDate: dateSchema,
})
export const DeleteImmunizationSchema = z.object({
	clinicId: clinicIdSchema,
	id: idSchema,
	patientId: patientIdSchema,
})
export type DeleteImmunizationInput = z.infer<typeof DeleteImmunizationSchema>
export const calculateDueVaccinesSchema = z.object({
	clinicId: clinicIdSchema,

	// The history of what the patient has already received
	completedVaccines: z.array(
		z.object({
			administrationDate: z.coerce.date(), // Coerce handles strings from JSON/Forms
			// We use number here for the logic,
			// service layer will map this to "Dose X" string if needed
			doseNumber: z.number().int().positive(),
			vaccineName: z.string(),
		})
	),
	// Current age in days for window calculations
	patientAgeDays: z.number().min(0),
	// The unique identifier (usually patientId)
	patientId: idSchema,
})

// Export type for use in Service and Action layers
export type CalculateDueVaccinesInput = z.infer<
	typeof calculateDueVaccinesSchema
>
// ==================== TYPE INFERENCES ====================

export type VaccineScheduleInput = z.infer<typeof VaccineScheduleSchema>
export type ImmunizationCreateInput = z.infer<typeof ImmunizationCreateSchema>
export type ImmunizationUpdateInput = z.infer<typeof ImmunizationUpdateSchema>
export type ScheduleVaccinationInput = z.infer<typeof ScheduleVaccinationSchema>
export type DueVaccination = z.infer<typeof DueVaccinationSchema>

export type VaccinationByIdInput = z.infer<typeof VaccinationByIdSchema>
export type VaccinationByPatientInput = z.infer<
	typeof VaccinationByPatientSchema
>
export type VaccinationByClinicInput = z.infer<typeof VaccinationByClinicSchema>
export type UpcomingVaccinationsInput = z.infer<
	typeof UpcomingVaccinationsSchema
>
export type OverdueVaccinationsInput = z.infer<typeof OverdueVaccinationsSchema>
export type VaccineScheduleFilterInput = z.infer<
	typeof VaccineScheduleFilterSchema
>

export type UpcomingCountInput = z.infer<typeof UpcomingCountSchema>
export type OverdueCountInput = z.infer<typeof OverdueCountSchema>
export type CompletionRateInput = z.infer<typeof CompletionRateSchema>

// ==================== CONSTANTS ====================

export const VACCINE_STATUS = {
	COMPLETED: 'COMPLETED',
	DELAYED: 'DELAYED',
	EXEMPTED: 'EXEMPTED',
	PENDING: 'PENDING',
} as const

export const VACCINE_STATUS_LABELS: Record<
	keyof typeof VACCINE_STATUS,
	string
> = {
	COMPLETED: 'Completed',
	DELAYED: 'Delayed',
	EXEMPTED: 'Exempted',
	PENDING: 'Pending',
} as const

export const VACCINE_STATUS_COLORS: Record<
	keyof typeof VACCINE_STATUS,
	string
> = {
	COMPLETED: 'green',
	DELAYED: 'orange',
	EXEMPTED: 'gray',
	PENDING: 'yellow',
} as const

export const VACCINE_ROUTES = {
	ID: 'Intradermal',
	IM: 'Intramuscular',
	IN: 'Intranasal',
	PO: 'Oral',
	SC: 'Subcutaneous',
} as const

export const COMMON_VACCINES = [
	'BCG',
	'Hepatitis B',
	'DTaP',
	'Hib',
	'IPV',
	'PCV',
	'Rotavirus',
	'MMR',
	'Varicella',
	'Hepatitis A',
	'Influenza',
	'HPV',
	'Tdap',
	'Meningococcal',
] as const
