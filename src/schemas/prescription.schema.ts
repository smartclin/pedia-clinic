import { z } from 'zod'

import {
	clinicIdSchema,
	DoseGuidelineRouteEnum,
	dateSchema,
	doctorIdSchema,
	dosageUnitSchema,
	drugRouteSchema,
	idSchema,
	patientIdSchema,
} from './helpers/enums'
export const DoseGuidelineBaseSchema = z.object({
	clinicalIndication: z
		.string()
		.min(1, 'Clinical indication is required')
		.max(500),
	compatibilityDiluent: z.string().max(100).optional(),
	doseUnit: z.string().max(20).optional(),
	drugId: idSchema,
	finalConcentrationMgMl: z.number().min(0).optional(),
	frequencyDays: z.string().max(100).optional(),
	gestationalAgeWeeksMax: z.number().min(0).max(45).optional(),
	gestationalAgeWeeksMin: z.number().min(0).max(45).optional(),
	maxDosePer24h: z.number().min(0).optional(),
	maxDosePerKg: z.number().min(0).optional(),
	minDosePerKg: z.number().min(0).optional(),
	minInfusionTimeMin: z.number().int().min(0).optional(),
	postNatalAgeDaysMax: z.number().min(0).max(3650).optional(),
	postNatalAgeDaysMin: z.number().min(0).max(3650).optional(),
	route: DoseGuidelineRouteEnum,
	stockConcentrationMgMl: z.number().min(0).optional(),
})

export const DoseGuidelineCreateSchema = DoseGuidelineBaseSchema

export const DoseGuidelineUpdateSchema =
	DoseGuidelineBaseSchema.partial().extend({
		id: idSchema,
	})

// ==================== DRUG SCHEMAS ====================
export const DrugBaseSchema = z.object({
	brandNames: z.array(z.string().max(200)).optional(),
	contraindications: z.array(z.string().max(500)).optional(),
	controlledSchedule: z.enum(['I', 'II', 'III', 'IV', 'V']).optional(),
	description: z.string().max(2000).optional(),
	drugClass: z.string().max(100).optional(),
	genericName: z.string().max(200).optional(),
	indications: z.array(z.string().max(500)).optional(),
	isActive: z.boolean().default(true),
	isControlled: z.boolean().default(false),
	manufacturer: z.string().max(200).optional(),
	name: z
		.string()
		.min(1, 'Drug name is required')
		.max(200, 'Drug name must be less than 200 characters')
		.regex(/^[a-zA-Z0-9\s\-./]+$/, 'Drug name contains invalid characters'),
	pregnancyCategory: z.enum(['A', 'B', 'C', 'D', 'X', 'N']).optional(),
	requiresPriorAuth: z.boolean().default(false),
	sideEffects: z.array(z.string().max(500)).optional(),
	warnings: z.array(z.string().max(500)).optional(),
})

export const DrugCreateSchema = DrugBaseSchema

export const DrugUpdateSchema = DrugBaseSchema.partial().extend({
	id: idSchema,
})

export const DrugFilterSchema = z.object({
	drugClass: z.string().max(100).optional(),
	isActive: z.boolean().optional(),
	isControlled: z.boolean().optional(),
	limit: z.number().int().min(1).max(100).default(20),
	page: z.number().int().min(1).default(1),
	requiresPriorAuth: z.boolean().optional(),
	search: z.string().max(100).optional(),
})

// Types
export type DoseGuidelineCreateInput = z.infer<typeof DoseGuidelineCreateSchema>
export type DoseGuidelineUpdateInput = z.infer<typeof DoseGuidelineUpdateSchema>
export type DrugCreateInput = z.infer<typeof DrugCreateSchema>
export type DrugUpdateInput = z.infer<typeof DrugUpdateSchema>
export type DrugFilterInput = z.infer<typeof DrugFilterSchema>

export const PharmacyRefillSchema = z.object({
	notes: z.string().max(500).optional(),
	prescriptionId: idSchema,
	requestedBy: idSchema.optional(),
	requestedDate: dateSchema.default(() => new Date()),
	status: z
		.enum(['PENDING', 'APPROVED', 'DENIED', 'FILLED'])
		.default('PENDING'),
})

// ==================== PRESCRIPTION VERIFICATION SCHEMAS ====================
export const PrescriptionVerificationSchema = z.object({
	checkedAllergies: z.boolean().default(false),
	checkedContraindications: z.boolean().default(false),
	checkedDosing: z.boolean().default(false),
	checkedInteractions: z.boolean().default(false),
	clinicalCheckNotes: z.string().max(1000).optional(),
	notes: z.string().max(1000).optional(),
	prescriptionId: idSchema,
	status: z.enum(['APPROVED', 'REJECTED', 'NEEDS_CLARIFICATION']),
	verifiedBy: idSchema,
	verifiedDate: dateSchema.default(() => new Date()),
})

// ==================== PEDIATRIC-SPECIFIC SCHEMAS ====================
export const PediatricDoseCheckSchema = z.object({
	age: z.number().min(0).max(18), // Age in years
	checkedGuidelines: z.boolean().default(false),
	diagnosis: z.string().max(500),
	dosePerKg: z.number().optional(),
	gestationalAge: z.number().min(20).max(45).optional(), // For neonates
	isWithinGuidelines: z.boolean(),
	maxDosePerDay: z.number().optional(),
	patientId: patientIdSchema,
	prescriptionId: idSchema,
	recommendations: z.array(z.string()).optional(),
	warnings: z.array(z.string()).optional(),
	weight: z.number().min(0.1).max(200), // Weight in kg
})
export type PrescriptionVerificationInput = z.infer<
	typeof PrescriptionVerificationSchema
>
export type PediatricDoseCheckInput = z.infer<typeof PediatricDoseCheckSchema>
// ==================== PRESCRIPTION VALIDATION HELPERS ====================
const medicationNameSchema = z
	.string()
	.min(1, 'Medication name is required')
	.max(200, 'Medication name must be less than 200 characters')
	.regex(
		/^[a-zA-Z0-9\s-]+$/,
		'Medication name can only contain letters, numbers, spaces, and hyphens'
	)

const dosageValueSchema = z
	.number()
	.min(0.01, 'Dosage must be greater than 0')
	.max(1000, 'Dosage cannot exceed 1000 units')
	.refine(val => Number.isFinite(val), 'Dosage must be a valid number')

const frequencySchema = z
	.string()
	.min(1, 'Frequency is required')
	.max(100, 'Frequency must be less than 100 characters')
	.regex(
		/^(once|twice|\d+ times?) (daily|weekly|monthly|every \d+ hours?)$/i,
		'Invalid frequency format. Use formats like "once daily", "twice daily", "3 times daily", "every 4 hours"'
	)

const durationSchema = z
	.string()
	.min(1, 'Duration is required')
	.max(50, 'Duration must be less than 50 characters')
	.regex(
		/^\d+ (days?|weeks?|months?)$/,
		'Invalid duration format. Use formats like "7 days", "2 weeks", "3 months"'
	)

// ==================== PRESCRIBED ITEM SCHEMAS ====================
export const PrescribedItemBaseSchema = z
	.object({
		dosageUnit: dosageUnitSchema,
		dosageValue: dosageValueSchema,
		drugId: idSchema,
		drugRoute: drugRouteSchema.optional(),
		duration: durationSchema,
		frequency: frequencySchema,
		instructions: z
			.string()
			.max(1000, 'Instructions must be less than 1000 characters')
			.optional(),
		isActive: z.boolean().default(true),
		prescriptionId: idSchema,
		prn: z.boolean().default(false), // As needed (pro re nata)
		quantity: z.number().min(1).max(1000).optional(), // Total quantity to dispense
		refills: z.number().int().min(0).max(12).optional(), // Number of refills allowed
		strength: z.string().max(50).optional(), // e.g., "500mg", "10mg/ml"
	})
	.refine(
		data => {
			// Validate dosage based on unit
			if (data.dosageUnit === 'MG' && data.dosageValue > 1000) {
				return false
			}
			if (data.dosageUnit === 'ML' && data.dosageValue > 100) {
				return false
			}
			if (data.dosageUnit === 'TABLET' && data.dosageValue > 20) {
				return false
			}
			return true
		},
		{
			message: 'Dosage value exceeds maximum for specified unit',
			path: ['dosageValue'],
		}
	)

export const PrescribedItemCreateSchema = PrescribedItemBaseSchema

export const PrescribedItemUpdateSchema =
	PrescribedItemBaseSchema.partial().extend({
		id: idSchema,
	})

// ==================== PRESCRIPTION SCHEMAS ====================
export const PrescriptionBaseSchema = z
	.object({
		clinicId: clinicIdSchema,
		doctorId: doctorIdSchema,
		encounterId: idSchema,
		endDate: dateSchema.optional(),
		instructions: z
			.string()
			.max(2000, 'Instructions must be less than 2000 characters')
			.optional(),
		isChronic: z.boolean().default(false),
		issuedDate: dateSchema.default(() => new Date()),
		medicalRecordId: idSchema,
		medicationName: medicationNameSchema.optional(), // Legacy field for free-text entry
		patientId: patientIdSchema,
		pharmacyNotes: z.string().max(500).optional(),
		prescribedItems: z
			.array(PrescribedItemBaseSchema.omit({ prescriptionId: true }))
			.min(1, 'At least one prescribed item is required'),
		priorAuthorizationCode: z.string().max(50).optional(),
		requiresPriorAuthorization: z.boolean().default(false),
		status: z
			.enum(['ACTIVE', 'COMPLETED', 'CANCELLED', 'ON_HOLD'])
			.default('ACTIVE'),
	})
	.refine(
		data => {
			// Validate end date is after issue date
			if (data.endDate && data.endDate <= data.issuedDate) {
				return false
			}
			return true
		},
		{
			message: 'End date must be after issue date',
			path: ['endDate'],
		}
	)
	.refine(
		data => {
			// Validate prior authorization requirement
			if (data.requiresPriorAuthorization && !data.priorAuthorizationCode) {
				return false
			}
			return true
		},
		{
			message:
				'Prior authorization code is required when prior authorization is required',
			path: ['priorAuthorizationCode'],
		}
	)

export const PrescriptionCreateSchema = PrescriptionBaseSchema.extend({
	clinicId: clinicIdSchema, // Required for create
})

export const PrescriptionUpdateSchema = PrescriptionBaseSchema.partial().extend(
	{
		id: idSchema,
	}
)

// ==================== PRESCRIPTION FILTER SCHEMAS ====================
export const PrescriptionFilterSchema = z.object({
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
	doctorId: doctorIdSchema.optional(),
	encounterId: idSchema.optional(),
	isChronic: z.boolean().optional(),
	limit: z.number().int().min(1).max(100).default(20),
	medicalRecordId: idSchema.optional(),
	medicationName: z.string().max(100).optional(),
	page: z.number().int().min(1).default(1),
	patientId: patientIdSchema,
	search: z.string().max(100).optional(),
	sortBy: z
		.enum(['issuedDate', 'patientName', 'medicationName', 'status'])
		.default('issuedDate'),
	sortOrder: z.enum(['asc', 'desc']).default('desc'),
	status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED', 'ON_HOLD']).optional(),
})

// ==================== DRUG INTERACTION SCHEMAS ====================
export const DrugInteractionSchema = z.object({
	description: z.string().max(1000),
	drugId1: idSchema,
	drugId2: idSchema,
	isActive: z.boolean().default(true),
	recommendation: z.string().max(1000).optional(),
	severity: z.enum(['MINOR', 'MODERATE', 'MAJOR', 'CONTRAINDICATED']),
})

export const DrugInteractionCheckSchema = z.object({
	drugIds: z
		.array(idSchema)
		.min(2, 'At least two drugs are required for interaction check'),
	patientId: patientIdSchema.optional(), // Include for patient-specific interactions
})

// ==================== ALLERGY SCHEMAS ====================
export const MedicationAllergySchema = z.object({
	drugId: idSchema.optional(), // For known drugs
	isActive: z.boolean().default(true),
	medicationName: medicationNameSchema, // For free-text allergies
	notes: z.string().max(1000).optional(),
	patientId: patientIdSchema,
	reaction: z
		.string()
		.max(500, 'Reaction description must be less than 500 characters'),
	reactionType: z.enum(['MILD', 'MODERATE', 'SEVERE', 'ANAPHYLAXIS']),
	reportedBy: z
		.enum(['PATIENT', 'DOCTOR', 'FAMILY', 'OTHER'])
		.default('PATIENT'),
	reportedDate: dateSchema.default(() => new Date()),
	severity: z.enum(['MILD', 'MODERATE', 'SEVERE', 'ANAPHYLAXIS']),
})

// ==================== PHARMACY SCHEMAS ====================
export const PharmacyDispenseSchema = z.object({
	batchNumber: z.string().max(50).optional(),
	dispensedBy: idSchema, // Pharmacist ID
	dispensedDate: dateSchema.default(() => new Date()),
	expiryDate: dateSchema.optional(),
	pharmacyNotes: z.string().max(500).optional(),
	prescribedItemId: idSchema,
	prescriptionId: idSchema,
	quantityDispensed: z.number().min(0.01).max(1000),
	remainingRefills: z.number().int().min(0).max(12),
})

// ==================== TYPE EXPORTS ====================
export type PrescribedItemCreateInput = z.infer<
	typeof PrescribedItemCreateSchema
>
export type PrescribedItemUpdateInput = z.infer<
	typeof PrescribedItemUpdateSchema
>
export type PrescriptionCreateInput = z.infer<typeof PrescriptionCreateSchema>
export type PrescriptionUpdateInput = z.infer<typeof PrescriptionUpdateSchema>
export type PrescriptionFilterInput = z.infer<typeof PrescriptionFilterSchema>
export type DrugInteractionInput = z.infer<typeof DrugInteractionSchema>
export type DrugInteractionCheckInput = z.infer<
	typeof DrugInteractionCheckSchema
>
export type MedicationAllergyInput = z.infer<typeof MedicationAllergySchema>
export type PharmacyDispenseInput = z.infer<typeof PharmacyDispenseSchema>
