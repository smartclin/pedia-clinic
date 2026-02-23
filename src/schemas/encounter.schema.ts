import z from 'zod'

import {
	clinicIdSchema,
	dateSchema,
	encounterStatusSchema,
	encounterTypeSchema,
	genderSchema,
	idSchema,
} from './helpers/enums'

// ==================== MEDICAL VALIDATION HELPERS ====================
const icd10CodeSchema = z
	.string()
	.regex(/^[A-Z]\d{2}(\.\d{1,3})?$/, 'Invalid ICD-10 code format')
	.optional()
const temperatureSchema = z.number().min(30).max(45)

export const VitalSignsShape = z.object({
	ageDays: z.number().int().min(0).max(474_800).optional(),
	ageMonths: z.number().int().min(0).max(1560).optional(),
	bmi: z.number().min(10).max(80).optional(),
	bodyTemperature: temperatureSchema.optional(),
	clinicId: clinicIdSchema.optional(),
	diastolic: z.number().min(30).max(150).optional(),
	encounterId: idSchema.optional(),
	gender: genderSchema.optional(),
	heartRate: z.number().min(20).max(300).optional(),
	height: z.number().min(20).max(300).optional(),
	id: z.uuid().optional(),
	medicalId: idSchema.optional(),
	notes: z.string().max(1000).optional(),
	oxygenSaturation: z.number().min(50).max(100).optional(),
	patientId: idSchema,
	recordedAt: dateSchema.default(() => new Date()),
	respiratoryRate: z.number().min(5).max(100).optional(),
	systolic: z.number().min(50).max(250).optional(),
	weight: z.number().min(0.5).max(500).optional(),
})

export const VitalSignsBaseSchema = VitalSignsShape.refine(
	data => {
		// Validate blood pressure relationship
		if (data.systolic && data.diastolic && data.systolic <= data.diastolic) {
			return false
		}
		return true
	},
	{
		message: 'Systolic pressure must be greater than diastolic pressure',
		path: ['systolic'],
	}
).refine(
	data => {
		// Age-appropriate vital signs validation
		if (data.ageDays !== undefined) {
			const ageInMonths = Math.floor(data.ageDays / 30.44)

			// Infant heart rate validation
			if (
				ageInMonths < 12 &&
				data.heartRate &&
				(data.heartRate < 80 || data.heartRate > 200)
			) {
				return false
			}

			// Child heart rate validation
			if (
				ageInMonths >= 12 &&
				ageInMonths < 156 &&
				data.heartRate &&
				(data.heartRate < 60 || data.heartRate > 140)
			) {
				return false
			}
		}
		return true
	},
	{
		message: 'Heart rate outside normal range for patient age',
		path: ['heartRate'],
	}
)
// ==================== DIAGNOSIS SCHEMAS ====================
export const DiagnosisBaseSchema = z.object({
	appointmentId: idSchema.optional(),
	clinicId: clinicIdSchema.optional(),
	date: dateSchema.default(() => new Date()),
	diagnosis: z
		.string()
		.min(1, 'Diagnosis is required')
		.max(2000, 'Diagnosis must be less than 2000 characters'),
	doctorId: idSchema,
	followUpPlan: z
		.string()
		.max(2000, 'Follow-up plan must be less than 2000 characters')
		.optional(),
	icd10Code: icd10CodeSchema,
	isChronic: z.boolean().default(false),
	medicalId: idSchema.optional(),
	notes: z
		.string()
		.max(2000, 'Notes must be less than 2000 characters')
		.optional(),
	patientId: idSchema,
	prescribedMedications: z
		.string()
		.max(2000, 'Medications must be less than 2000 characters')
		.optional(),
	requiresFollowUp: z.boolean().default(true),
	severity: z.enum(['MILD', 'MODERATE', 'SEVERE', 'CRITICAL']).optional(),
	status: encounterStatusSchema.default('PENDING'),
	symptoms: z
		.string()
		.min(1, 'Symptoms are required')
		.max(5000, 'Symptoms must be less than 5000 characters'),
	treatment: z
		.string()
		.max(3000, 'Treatment must be less than 3000 characters')
		.optional(),
	type: encounterTypeSchema.default('CONSULTATION'),
})

export const DiagnosisCreateSchema = DiagnosisBaseSchema.extend({
	clinicId: clinicIdSchema, // Required for create
})

export const DiagnosisUpdateSchema = DiagnosisBaseSchema.partial().extend({
	id: idSchema,
})

export const DiagnosisFilterSchema = z.object({
	clinicId: clinicIdSchema.optional(),
	dateRange: z
		.object({
			from: dateSchema.optional(),
			to: dateSchema.optional(),
		})
		.optional()
		.refine(
			data => {
				if (data?.from && data.to) {
					return data.from <= data.to
				}
				return true
			},
			{
				message: 'From date must be before to date',
				path: ['to'],
			}
		),
	doctorId: idSchema.optional(),
	endDate: z.date(),
	isChronic: z.boolean().optional(),
	limit: z.number().int().min(1).max(100).default(20),
	page: z.number().int().min(1).default(1),
	patientId: idSchema.optional(),
	search: z.string().max(100).optional(),
	severity: z.enum(['MILD', 'MODERATE', 'SEVERE', 'CRITICAL']).optional(),
	sortBy: z
		.enum(['date', 'patientName', 'diagnosis', 'severity'])
		.default('date'),
	sortOrder: z.enum(['asc', 'desc']).default('desc'),
	startDate: z.date(),
	status: encounterStatusSchema.optional(),
	type: encounterTypeSchema.optional(),
})
export const DiagnosisByIdSchema = DiagnosisBaseSchema.extend({
	id: idSchema,
})

export const VitalSignsByMedicalRecordSchema = VitalSignsShape.pick({
	medicalId: true,
})

// ==================== VITAL SIGNS SCHEMAS ====================

export const VitalSignsCreateSchema = VitalSignsShape
export const VitalSignsByIdSchema = VitalSignsShape.pick({
	id: true,
})
export const VitalSignsByPatientSchema = VitalSignsShape.extend({
	endDate: dateSchema.optional(),

	limit: z.number().int().min(1).max(100).optional(),
	startDate: dateSchema.optional(),
})
export const DiagnosisByMedicalRecordSchema = DiagnosisBaseSchema.pick({
	clinicId: true,
	medicalId: true,
})
export const VitalSignsUpdateSchema = VitalSignsShape.partial().extend({
	id: idSchema,
})
export const DiagnosisByAppointmentSchema = DiagnosisBaseSchema.pick({
	appointmentId: true,
	clinicId: true,
})
export const VitalSignsFilterSchema = z.object({
	abnormalOnly: z.boolean().optional(),
	clinicId: clinicIdSchema.optional(),
	dateRange: z
		.object({
			from: dateSchema.optional(),
			to: dateSchema.optional(),
		})
		.optional(),
	encounterId: idSchema.optional(),
	limit: z.number().int().min(1).max(100).default(50),
	medicalId: idSchema.optional(),
	page: z.number().int().min(1).default(1),
	patientId: idSchema.optional(),
	sortBy: z.enum(['recordedAt', 'patientName']).default('recordedAt'),
	sortOrder: z.enum(['asc', 'desc']).default('desc'),
	vitalType: z
		.enum([
			'TEMPERATURE',
			'BLOOD_PRESSURE',
			'HEART_RATE',
			'RESPIRATORY_RATE',
			'OXYGEN_SATURATION',
		])
		.optional(),
})

// ==================== TYPE EXPORTS ====================
export type DiagnosisCreateInput = z.infer<typeof DiagnosisCreateSchema>
export type DiagnosisUpdateInput = z.infer<typeof DiagnosisUpdateSchema>
export type DiagnosisFilterInput = z.infer<typeof DiagnosisFilterSchema>

export type VitalSignsCreateInput = z.infer<typeof VitalSignsCreateSchema>
export type VitalSignsUpdateInput = z.infer<typeof VitalSignsUpdateSchema>
export type VitalSignsFilterInput = z.infer<typeof VitalSignsFilterSchema>
