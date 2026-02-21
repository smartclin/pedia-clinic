import { z } from 'zod'

export const clinicGetOneSchema = z.object({
	id: z.string().min(1, { message: 'Id is required' }),
})

export const clinicCreateSchema = z.object({
	address: z.string().optional(),
	emai: z.email().optional(),
	name: z.string().min(1, 'Clinic name is required'),
	phone: z.string().optional(),
})

export const clinicGetByIdSchema = z.object({
	id: z.uuid(),
})

export type ClinicGetOneInput = z.infer<typeof clinicGetOneSchema>
export type ClinicCreateInput = z.infer<typeof clinicCreateSchema>
export type ClinicGetByIdInput = z.infer<typeof clinicGetByIdSchema>
export const reviewSchema = z.object({
	clinicId: z.uuid().optional(),
	comment: z
		.string()
		.min(1, 'Review must be at least 10 characters long')
		.max(500, 'Review must not exceed 500 characters'),
	patientId: z.string(),
	rating: z.number(),
	staffId: z.string(),
})
export type ReviewFormValues = z.infer<typeof reviewSchema>

export const DashboardStatsInputSchema = z.object({
	from: z.coerce.date(),
	to: z.coerce.date(),
})

export const MedicalRecordsSummaryInputSchema = z.object({
	clinicId: z.string().min(1),
})

export type DashboardStatsInput = z.infer<typeof DashboardStatsInputSchema>
export type MedicalRecordsSummaryInput = z.infer<
	typeof MedicalRecordsSummaryInputSchema
>
