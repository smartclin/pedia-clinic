import z from 'zod'

import {
	ChartType,
	Gender,
	GrowthStatus,
	MeasurementType,
} from '../types/prisma-types'
import {
	clinicIdSchema,
	dateSchema,
	genderSchema,
	idSchema,
	patientIdSchema,
} from './helpers/enums'
export const measurementTypeSchema = z.enum(MeasurementType)
export const whoChartTypeSchema = z.enum(ChartType)

// // ==================== PEDIATRIC VALIDATION HELPERS ====================
// const pediatricAgeSchema = z
//   .object({
//     ageDays: z.number().int().min(0).max(1825), // 0-5 years
//     ageMonths: z.number().int().min(0).max(60), // 0-5 years
//     ageYears: z.number().int().min(0).max(5) // 0-5 years
//   })
//   .refine(
//     data => {
//       // Convert all to days for consistency check
//       const daysFromMonths = (data.ageMonths || 0) * 30.44;
//       const daysFromYears = (data.ageYears || 0) * 365.25;
//       const totalDays = Math.max(data.ageDays || 0, daysFromMonths, daysFromYears);
//       return totalDays <= 1825; // Max 5 years
//     },
//     {
//       message: 'Pediatric age cannot exceed 5 years',
//       path: ['ageYears']
//     }
//   );

const growthStatusSchema = z.enum(GrowthStatus)

// ==================== GROWTH RECORD SCHEMAS ====================
export const GrowthRecordShape = z.object({
	// Age information
	ageDays: z.number().int().min(0).max(1825),
	ageMonths: z.number().int().min(0).max(60),
	ageYears: z.number().int().min(0).max(5),
	bmi: z.number().min(5).max(50).optional(),
	bmiForAgeZ: z.number().min(-5).max(5).optional(),
	classification: z.string().max(100).optional(),
	clinicId: clinicIdSchema,
	date: dateSchema.default(() => new Date()),
	encounterId: idSchema.optional(),
	gender: genderSchema,
	// Classification
	growthStatus: growthStatusSchema.default('NORMAL'),
	hcForAgeZ: z.number().min(-5).max(5).optional(),
	headCircumference: z.number().min(20).max(60).optional(), // cm (for infants < 2 years)
	height: z.number().min(20).max(250), // cm
	heightForAgeZ: z.number().min(-5).max(5).optional(),
	// Additional info
	measurementType: measurementTypeSchema.default('Weight'),
	medicalId: idSchema.optional(),
	notes: z.string().max(1000).optional(),
	patientId: patientIdSchema,
	percentile: z.number().min(0).max(100).optional(),
	recordedAt: dateSchema.default(() => new Date()),
	vitalSignsId: idSchema.optional(),
	// Measurements
	weight: z.number().min(0.5).max(200), // kg
	// WHO standards
	weightForAgeZ: z.number().min(-5).max(5).optional(),
	zScore: z.number().min(-5).max(5).optional(),
})

export const GrowthRecordBaseSchema = GrowthRecordShape.refine(
	data => {
		// Head circumference should only be measured for children under 2 years
		if (data.headCircumference && data.ageMonths && data.ageMonths >= 24) {
			return false
		}
		return true
	},
	{
		message:
			'Head circumference should only be measured for children under 24 months',
		path: ['headCircumference'],
	}
)
	.refine(
		data => {
			// Validate age consistency
			const daysFromMonths = (data.ageMonths || 0) * 30.44
			const daysFromYears = (data.ageYears || 0) * 365.25
			const maxDays = Math.max(data.ageDays || 0, daysFromMonths, daysFromYears)
			return maxDays <= 1825
		},
		{
			message: 'Pediatric age cannot exceed 5 years',
			path: ['ageYears'],
		}
	)
	.refine(
		data => {
			// Calculate BMI if weight and height are provided
			if (data.weight && data.height && !data.bmi) {
				const calculatedBmi = data.weight / (data.height / 100) ** 2
				return calculatedBmi >= 5 && calculatedBmi <= 50
			}
			return true
		},
		{
			message: 'Calculated BMI is outside valid range (5-50)',
			path: ['weight'],
		}
	)
export const GrowthRecordCreateSchema = GrowthRecordShape.extend({
	clinicId: clinicIdSchema.optional(), // Required for create
})

export type GrowthRecordCreateInput = z.infer<typeof GrowthRecordCreateSchema>
export type GrowthRecordUpdateInput = z.infer<typeof GrowthRecordUpdateSchema>

// ==================== GROWTH ANALYSIS SCHEMAS ====================
export const GrowthPercentileCalculationSchema = z.object({
	ageDays: z.number().int().min(0).max(1825),
	gender: genderSchema,
	measurementType: z.enum(['Weight', 'Height', 'HeadCircumference', 'BMI']),
	patientId: patientIdSchema,
	useWHOStandards: z.boolean().default(true),
	value: z.number().positive(),
})

export const GrowthVelocityCalculationSchema = z
	.object({
		endDate: dateSchema,
		measurementType: z.enum(['Weight', 'Height']),
		patientId: patientIdSchema,
		startDate: dateSchema,
		timeUnit: z.enum(['days', 'weeks', 'months']).default('months'),
	})
	.refine(data => data.endDate > data.startDate, {
		message: 'End date must be after start date',
		path: ['endDate'],
	})
export const GrowthRecordsByPatientSchema = z.object({
	clinicId: clinicIdSchema,
	limit: z.number().int().min(1).max(100).default(50),
	offset: z.number().int().min(0).default(0),
	patientId: patientIdSchema,
})
export const GrowthTrendAnalysisSchema = z.object({
	analysisType: z
		.enum(['percentile_trend', 'velocity', 'z_score_change'])
		.default('percentile_trend'),
	measurementType: z.enum(['Weight', 'Height', 'BMI']),
	patientId: patientIdSchema,
	timeRange: z
		.object({
			endDate: dateSchema.optional(),
			startDate: dateSchema.optional(),
		})
		.optional(),
})

// ==================== WHO STANDARDS SCHEMAS ====================
export const WHOStandardsQuerySchema = z.object({
	ageMonths: z.number().int().min(0).max(60),
	gender: genderSchema,
	includePercentiles: z.boolean().default(true),
	includeZScores: z.boolean().default(true),
	measurementType: z.enum(['WFA', 'HFA', 'HcFA', 'BFA']), // Weight-for-Age, Height-for-Age, etc.
	percentileRange: z
		.object({
			max: z.number().min(50).max(97).default(97),
			min: z.number().min(0).max(50).default(3),
		})
		.optional(),
})

// ==================== GROWTH ALERT SCHEMAS ====================
export const GrowthAlertSchema = z.object({
	ageAtMeasurement: z.number().int(),
	alertType: z.enum([
		'FALLING_PERCENTILES',
		'STUNTING',
		'WASTING',
		'RAPID_WEIGHT_GAIN',
		'NO_GAIN',
		'OVERWEIGHT_RISK',
	]),
	currentValue: z.number(),
	isActive: z.boolean().default(true),
	measurementType: z.enum(['Weight', 'Height', 'BMI']),
	notes: z.string().max(500).optional(),
	patientId: patientIdSchema,
	previousValue: z.number(),
	severity: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']),
	threshold: z.number(),
})

// ==================== FILTER SCHEMAS ====================
export const GrowthRecordFilterSchema = z.object({
	ageRange: z
		.object({
			maxMonths: z.number().int().min(0).max(60).optional(),
			minMonths: z.number().int().min(0).max(60).optional(),
		})
		.optional()
		.refine(
			data => {
				if (data?.minMonths !== undefined && data.maxMonths !== undefined) {
					return data.minMonths <= data.maxMonths
				}
				return true
			},
			{
				message: 'Minimum age must be less than or equal to maximum age',
				path: ['maxMonths'],
			}
		),
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
	gender: genderSchema.optional(),
	growthStatus: growthStatusSchema.optional(),
	limit: z.number().int().min(1).max(100).default(20),
	measurementType: z
		.enum(['Weight', 'Height', 'HeadCircumference', 'BMI'])
		.optional(),
	page: z.number().int().min(1).default(1),
	patientId: patientIdSchema.optional(),
	percentileRange: z
		.object({
			max: z.number().min(0).max(100).optional(),
			min: z.number().min(0).max(100).optional(),
		})
		.optional(),
	sortBy: z
		.enum(['date', 'measurementType', 'percentile', 'zScore'])
		.default('date'),
	sortOrder: z.enum(['asc', 'desc']).default('desc'),
})
export const GrowthRecordByIdSchema = z.object({
	id: z.string(),
})
export const GrowthRecordByPatientSchema = z.object({
	clinicId: z.string().optional(),
	id: z.string(),
	patientId: z.string(),
})

// Export types
export type CreateGrowthRecordInput = z.infer<typeof GrowthRecordCreateSchema>
export type UpdateGrowthRecordInput = z.infer<typeof GrowthRecordUpdateSchema>
export type GrowthRecordByIdInput = z.infer<typeof GrowthRecordByIdSchema>
export type GrowthRecordsByPatientInput = z.infer<
	typeof GrowthRecordByPatientSchema
>

export const growthStandardsSchema = z.object({
	ageMonthsMax: z.number().min(0).max(240).optional(),
	ageMonthsMin: z.number().min(0).max(240).optional(),
	chartType: z.enum(['WFA', 'HFA', 'HcFA']),
	gender: z.enum(Object.values(Gender) as [Gender, ...Gender[]]),
}) satisfies z.ZodType<unknown>

export const growthPercentileSchema = z.object({
	date: z.date(),
	measurement: z.object({
		ageMonths: z.number().min(0).max(240),
		type: z.enum(['WFA', 'HFA', 'HcFA']),
		value: z.number().min(0).max(500),
	}),
	patientId: z.uuid(),
}) satisfies z.ZodType<unknown>

export const growthTrendsSchema = z.object({
	chartType: z.enum(['WFA', 'HFA', 'HcFA']),
	clinicId: z.uuid(),
	patientId: z.uuid(),
	timeRange: z
		.object({
			endDate: z.coerce.date().optional(),
			startDate: z.coerce.date().optional(),
		})
		.optional(),
}) satisfies z.ZodType<unknown>

export const velocityCalculationSchema = z.object({
	chartType: z.enum(['WFA', 'HFA', 'HcFA']),
	clinicId: z.uuid(),
	endDate: z.coerce.date(),
	patientId: z.uuid(),
	startDate: z.coerce.date(),
}) satisfies z.ZodType<unknown>

export const growthComparisonSchema = z.object({
	chartType: z.enum(['WFA', 'HFA', 'HcFA']),
	clinicId: z.uuid(),
	comparisonType: z.enum(['age', 'percentile', 'velocity']).default('age'),
	patientId: z.uuid(),
	referenceAgeMonths: z.number().min(0).max(240),
}) satisfies z.ZodType<unknown>

export type GrowthStandardsInput = z.infer<typeof growthStandardsSchema>
export type GrowthPercentileInput = z.infer<typeof growthPercentileSchema>
export type GrowthTrendsInput = z.infer<typeof growthTrendsSchema>
export type VelocityCalculationInput = z.infer<typeof velocityCalculationSchema>
export type GrowthComparisonInput = z.infer<typeof growthComparisonSchema>

// ==================== BASE SCHEMAS ====================

// ==================== MEASUREMENT SCHEMAS ====================

export const weightSchema = z
	.number()
	.min(0.1, 'Weight must be at least 0.1 kg')
	.max(200, 'Weight must be at most 200 kg')

export const heightSchema = z
	.number()
	.min(10, 'Height must be at least 10 cm')
	.max(250, 'Height must be at most 250 cm')
	.optional()

export const headCircumferenceSchema = z
	.number()
	.min(20, 'Head circumference must be at least 20 cm')
	.max(60, 'Head circumference must be at most 60 cm')
	.optional()

export const bmiSchema = z
	.number()
	.min(5, 'BMI must be at least 5')
	.max(50, 'BMI must be at most 50')
	.optional()

export const ageDaysSchema = z
	.number()
	.min(0, 'Age cannot be negative')
	.max(1825, 'Age cannot exceed 5 years (1825 days)')

export const ageMonthsSchema = z
	.number()
	.min(0, 'Age cannot be negative')
	.max(60, 'Age cannot exceed 5 years (60 months)')

export const zScoreSchema = z
	.number()
	.min(-5, 'Z-score must be between -5 and 5')
	.max(5, 'Z-score must be between -5 and 5')
	.optional()

export const percentileSchema = z
	.number()
	.min(0, 'Percentile must be between 0 and 100')
	.max(100, 'Percentile must be between 0 and 100')
	.optional()

// ==================== INPUT SCHEMAS ====================

export const GrowthRecordUpdateSchema = z
	.object({
		bmi: bmiSchema,
		classification: z.string().optional(),
		headCircumference: headCircumferenceSchema,
		height: heightSchema,
		id: idSchema,
		notes: z.string().max(1000).optional(),
		weight: weightSchema.optional(),
	})
	.partial()

export const DeleteGrowthRecordSchema = z.object({
	id: idSchema,
	patientId: patientIdSchema,
})

// ==================== CACHE INVALIDATION SCHEMAS ====================

export const InvalidateGrowthCacheSchema = z.object({
	clinicId: clinicIdSchema,
	patientId: patientIdSchema,
})

// ==================== WHO STANDARDS SCHEMAS ====================

export const GrowthStandardsSchema = z.object({
	ageMonthsMax: ageMonthsSchema.optional(),
	ageMonthsMin: ageMonthsSchema.optional(),
	chartType: z.enum(['WFA', 'HFA', 'HcFA']),
	gender: genderSchema,
})

// ==================== PERCENTILE CALCULATION SCHEMAS ====================

export const MeasurementValueSchema = z.object({
	ageMonths: ageMonthsSchema,
	chartType: z.enum(['WFA', 'HFA', 'HcFA']),
	value: z.number().positive(),
})

export const GrowthPercentileSchema = z.object({
	ageMonths: ageMonthsSchema,
	chartType: z.enum(['WFA', 'HFA', 'HcFA']),
	date: dateSchema.default(() => new Date()),
	patientId: patientIdSchema,
	value: z.number().positive(),
})

// ==================== TRENDS SCHEMAS ====================

export const GrowthTrendsSchema = z.object({
	chartType: z.enum(['WFA', 'HFA', 'HcFA']),
	clinicId: clinicIdSchema,
	patientId: patientIdSchema,
	timeRange: z
		.object({
			endDate: dateSchema.optional(),
			startDate: dateSchema.optional(),
		})
		.optional(),
})

// ==================== VELOCITY SCHEMAS ====================

export const VelocityCalculationSchema = z
	.object({
		chartType: z.enum(['WFA', 'HFA', 'HcFA']),
		clinicId: clinicIdSchema,
		endDate: dateSchema,
		patientId: patientIdSchema,
		startDate: dateSchema,
	})
	.refine(data => data.endDate >= data.startDate, {
		message: 'End date must be after start date',
		path: ['endDate'],
	})

// ==================== COMPARISON SCHEMAS ====================

export const GrowthComparisonSchema = z.object({
	chartType: z.enum(['WFA', 'HFA', 'HcFA']),
	clinicId: clinicIdSchema,
	comparisonType: z.enum(['age', 'percentile', 'velocity']),
	patientId: patientIdSchema,
	referenceAgeMonths: ageMonthsSchema,
})

// ==================== Z-SCORE SCHEMAS ====================

export const ZScoreCalculationSchema = z.object({
	ageDays: ageDaysSchema,
	gender: genderSchema,
	weight: weightSchema,
})

export const MultipleZScoreSchema = z.object({
	measurements: z.array(ZScoreCalculationSchema),
})

// ==================== CHART SCHEMAS ====================

export const ZScoreChartSchema = z.object({
	chartType: z.enum(['WFA', 'HFA', 'HcFA']).default('WFA'),
	gender: genderSchema,
})

export const PatientZScoreChartSchema = z.object({
	chartType: z.enum(['WFA', 'HFA', 'HcFA']).default('WFA'),

	clinicId: clinicIdSchema,
	id: idSchema,
	patientId: patientIdSchema,
})

// ==================== PROJECTION SCHEMAS ====================

export const GrowthProjectionSchema = z.object({
	chartType: z.enum(['WFA', 'HFA', 'HcFA']),
	clinicId: clinicIdSchema,
	patientId: patientIdSchema,
	projectionMonths: z.number().min(1).max(24).default(12),
})

// ==================== TYPE INFERENCES ====================
export type DeleteGrowthRecordInput = z.infer<typeof DeleteGrowthRecordSchema>
export type InvalidateGrowthCacheInput = z.infer<
	typeof InvalidateGrowthCacheSchema
>
export type ZScoreCalculationInput = z.infer<typeof ZScoreCalculationSchema>
export type MultipleZScoreInput = z.infer<typeof MultipleZScoreSchema>
export type ZScoreChartInput = z.infer<typeof ZScoreChartSchema>
export type PatientZScoreChartInput = z.infer<typeof PatientZScoreChartSchema>
export type GrowthProjectionInput = z.infer<typeof GrowthProjectionSchema>

// ==================== CONSTANTS ====================

export const GROWTH_CLASSIFICATIONS = {
	NORMAL: 'Normal',
	OVERWEIGHT: 'Overweight',
	RISK_OVERWEIGHT: 'Risk of overweight',
	RISK_UNDERWEIGHT: 'Risk of underweight',
	SEVERE_OVERWEIGHT: 'Severely overweight',
	SEVERE_UNDERWEIGHT: 'Severely underweight',
	UNDERWEIGHT: 'Underweight',
} as const

export const MEASUREMENT_TYPES = {
	BMI: 'bmi',
	HEAD_CIRCUMFERENCE: 'headCircumference',
	HEIGHT: 'height',
	WEIGHT: 'weight',
} as const

export const WHO_MEASUREMENT_TYPES = {
	HcFA: 'HcFA',
	HFA: 'HFA',
	WFA: 'WFA',
} as const

export const COMPARISON_TYPES = {
	AGE: 'age',
	PERCENTILE: 'percentile',
	VELOCITY: 'velocity',
} as const
