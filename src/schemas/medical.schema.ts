import { z } from 'zod'

import {
	clinicIdSchema,
	dateSchema,
	idSchema,
	labStatusSchema,
} from './helpers/enums'

// ==================== MEDICAL RECORDS SCHEMAS ====================
export const MedicalRecordBaseSchema = z.object({
	accessLevel: z
		.enum(['STANDARD', 'SENSITIVE', 'RESTRICTED'])
		.default('STANDARD'),
	appointmentId: idSchema,
	assessment: z.string().max(2000).optional(),
	attachments: z.url().optional(),
	clinicId: clinicIdSchema,
	diagnosis: z.string().min(1, 'Diagnosis is required').max(2000),
	doctorId: idSchema,
	followUpDate: dateSchema.optional(),
	// HIPAA compliance
	isConfidential: z.boolean().default(false),
	labRequest: z.string().max(2000).optional(),
	notes: z.string().max(5000).optional(),
	objective: z.string().max(3000).optional(),
	patientId: idSchema,
	plan: z.string().max(3000).optional(),
	// SOAP note structure
	subjective: z.string().max(3000).optional(),
	symptoms: z.string().min(1, 'Symptoms are required').max(5000),
	treatmentPlan: z.string().max(3000).optional(),
})

export const MedicalRecordCreateSchema = MedicalRecordBaseSchema

export const MedicalRecordUpdateSchema =
	MedicalRecordBaseSchema.partial().extend({
		id: idSchema,
	})

export const MedicalRecordFilterSchema = z.object({
	accessLevel: z.enum(['STANDARD', 'SENSITIVE', 'RESTRICTED']).optional(),
	appointmentId: idSchema.optional(),
	clinicId: clinicIdSchema,
	dateRange: z
		.object({
			from: dateSchema.optional(),
			to: dateSchema.optional(),
		})
		.optional(),
	doctorId: idSchema.optional(),
	endDate: z.date(),
	isConfidential: z.boolean().optional(),
	limit: z.number().int().min(1).max(100).default(20),
	offset: z.number().int().min(0).default(0),
	page: z.number().int().min(1).default(1),
	patientId: idSchema.optional(),
	search: z.string().max(100).optional(),
	sortBy: z
		.enum(['createdAt', 'patientName', 'doctorName', 'followUpDate'])
		.default('createdAt'),
	sortOrder: z.enum(['asc', 'desc']).default('desc'),
	startDate: z.date(),
})

// ==================== LAB TEST SCHEMAS ====================
export const LabTestBaseSchema = z.object({
	notes: z.string().max(1000).optional(),
	orderedBy: idSchema.optional(), // Doctor ID
	patientId: idSchema,
	performedBy: idSchema.optional(), // Lab technician ID
	recordId: idSchema,
	referenceRange: z.string().max(500).optional(),
	reportDate: dateSchema.optional(),
	result: z.string().max(2000),
	sampleCollectionDate: dateSchema.optional(),
	sampleType: z.string().max(100).optional(),
	serviceId: idSchema,
	status: labStatusSchema.default('PENDING'),
	testDate: dateSchema.default(() => new Date()),
	units: z.string().max(50).optional(),
})
export const MedicalRecordByIdSchema = MedicalRecordBaseSchema.extend({
	clinicId: clinicIdSchema,
	id: idSchema,
	limit: z.number().int().min(1).max(100).optional(),
	offset: z.number().int().min(0).default(0),
	page: z.number().int().min(1).default(1),
	sortBy: z
		.enum(['createdAt', 'patientName', 'doctorName', 'followUpDate'])
		.default('createdAt'),
	sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const LabTestCreateSchema = LabTestBaseSchema

export const LabTestUpdateSchema = LabTestBaseSchema.partial().extend({
	id: idSchema,
})
export const LabTestByIdSchema = LabTestBaseSchema.extend({
	clinicId: clinicIdSchema,
	id: idSchema,
	limit: z.number().int().min(1).max(100).optional(),
	offset: z.number().int().min(0).default(0),
	page: z.number().int().min(1).default(1),
	sortBy: z
		.enum(['createdAt', 'patientName', 'doctorName', 'followUpDate'])
		.default('createdAt'),
	sortOrder: z.enum(['asc', 'desc']).default('desc'),
})
export const LabTestByMedicalRecordSchema = LabTestBaseSchema.extend({
	clinicId: clinicIdSchema,
	limit: z.number().int().min(1).max(100).optional(),
	medicalId: idSchema,
	offset: z.number().int().min(0).default(0),
	page: z.number().int().min(1).default(1),
	sortBy: z
		.enum(['createdAt', 'patientName', 'doctorName', 'followUpDate'])
		.default('createdAt'),
	sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const LabTestFilterSchema = z.object({
	endDate: dateSchema.optional(),
	limit: z.number().int().min(1).max(100).default(20),
	medicalId: idSchema.optional(),
	page: z.number().int().min(1).default(1),
	patientId: idSchema.optional(),
	serviceId: idSchema.optional(),
	startDate: dateSchema.optional(),
	status: labStatusSchema.optional(),
})
export type MedicalRecordCreateInput = z.infer<typeof MedicalRecordCreateSchema>
export type MedicalRecordUpdateInput = z.infer<typeof MedicalRecordUpdateSchema>
export type MedicalRecordFilterInput = z.infer<typeof MedicalRecordFilterSchema>
export type LabTestCreateInput = z.infer<typeof LabTestCreateSchema>
export type LabTestUpdateInput = z.infer<typeof LabTestUpdateSchema>
export type LabTestFilterInput = z.infer<typeof LabTestFilterSchema>
