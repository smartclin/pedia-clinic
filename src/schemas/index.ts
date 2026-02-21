export * from './admin.schema'
export * from './appointment.schema'
export * from './auth.schema'
export * from './clinic.schema'
export * from './doctor.schema'
export * from './encounter.schema'
export * from './growth.schema'
export * from './medical.schema'
export * from './patient.schema'
export * from './prescription.schema'
export * from './service.schema'
export * from './vac.schema'
export * from './visit.schema'

import z from 'zod'

import { genderSchema } from './helpers/enums'

export const DiagnosisSchema = z.object({
	diagnosis: z.string({
		error: 'Diagnosis required',
	}),
	doctorId: z.string(),
	followUpPlan: z.string().optional(),
	medicalId: z.string(),
	notes: z.string().optional(),
	patientId: z.string(),
	prescribedMedications: z.string().optional(),
	symptoms: z.string({
		error: 'Symptoms required',
	}),
})

export const workingDaySchema = z.object({
	closeTime: z.string(),
	day: z.enum([
		'sunday',
		'monday',
		'tuesday',
		'wednesday',
		'thursday',
		'friday',
		'saturday',
	]),
	startTime: z.string(),
})
export type Day = z.infer<typeof workingDaySchema>

export const PaymentSchema = z.object({
	billDate: z.date(),
	discount: z.number(),
	id: z.string(),
	totalAmount: z.number(),
})

export type PaymentInput = z.infer<typeof PaymentSchema>
export const VitalSignsSchema = z.object({
	bodyTemperature: z.number().optional(),
	diastolic: z.number().optional(),
	encounterId: z.string().optional(),
	gender: genderSchema,
	growth: z
		.object({
			headCircumference: z.number().optional(),
			height: z.number().optional(),
			weight: z.number().optional(),
		})
		.optional(),
	heartRate: z.number().optional(),
	medicalId: z.string(),
	notes: z.string().optional(),
	oxygenSaturation: z.number().optional(),
	patientId: z.string(),
	recordedAt: z.date(),
	respiratoryRate: z.number().optional(),
	systolic: z.number().optional(),
})
export type VitalSignsInput = z.infer<typeof VitalSignsSchema>

export const PatientBillSchema = z.object({
	appointmentId: z.string(),
	billId: z.string(),
	clinicId: z.string(),
	quantity: z.number({
		error: 'Quantity is required',
	}),
	serviceDate: z.string(),
	serviceId: z.string(),
	totalCost: z.number({
		error: 'Total cost is required',
	}),
	unitCost: z.number({
		error: 'Unit cost is required',
	}),
})
export const AddNewBillInputSchema = PatientBillSchema.extend({
	appointmentId: z.string().optional(),
	billId: z.string().optional(),
})

export type AddNewBillInput = z.infer<typeof AddNewBillInputSchema>
