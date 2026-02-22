import { TRPCError } from '@trpc/server'

import { systemQueries } from '@/server/db/queries'
import type { ChartType, Gender } from '@/types'

export async function calculatePediatricDosage(
	drugName: string,
	weightKg: number,
	gestationalAgeWeeks?: number,
	postNatalAgeDays?: number,
	clinicalIndication?: string
) {
	const drug = await systemQueries.getDrugByName(drugName)

	if (!drug) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: `Drug ${drugName} not found`,
		})
	}

	let guidelines = drug.guidelines

	// Filter by clinical indication if provided
	if (clinicalIndication) {
		guidelines = guidelines.filter(
			(g: { clinicalIndication: string }) =>
				g.clinicalIndication.toLowerCase() === clinicalIndication.toLowerCase()
		)
	}

	// Filter by gestational age if provided
	if (gestationalAgeWeeks !== undefined) {
		guidelines = guidelines.filter(
			(g: {
				gestationalAgeWeeksMin: number | null
				gestationalAgeWeeksMax: number | null
			}) => {
				if (
					g.gestationalAgeWeeksMin &&
					gestationalAgeWeeks < g.gestationalAgeWeeksMin
				)
					return false
				if (
					g.gestationalAgeWeeksMax &&
					gestationalAgeWeeks > g.gestationalAgeWeeksMax
				)
					return false
				return true
			}
		)
	}

	// Filter by post-natal age if provided
	if (postNatalAgeDays !== undefined) {
		guidelines = guidelines.filter(
			(g: {
				postNatalAgeDaysMin: number | null
				postNatalAgeDaysMax: number | null
			}) => {
				if (g.postNatalAgeDaysMin && postNatalAgeDays < g.postNatalAgeDaysMin)
					return false
				if (g.postNatalAgeDaysMax && postNatalAgeDays > g.postNatalAgeDaysMax)
					return false
				return true
			}
		)
	}

	if (guidelines.length === 0) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'No matching dosage guidelines found',
		})
	}

	// Use the first matching guideline
	const guideline = guidelines[0]

	let minDose = null
	let maxDose = null

	if (guideline?.minDosePerKg && guideline.maxDosePerKg) {
		minDose = guideline.minDosePerKg * weightKg
		maxDose = guideline.maxDosePerKg * weightKg
	}

	return {
		calculatedDose: {
			max: maxDose,
			min: minDose,
			unit: guideline?.doseUnit,
		},
		dosagePerKg: {
			max: guideline?.maxDosePerKg,
			min: guideline?.minDosePerKg,
		},
		drug: drug.name,
		frequency: guideline?.frequencyDays,
		indication: guideline?.clinicalIndication,
		infusionTime: guideline?.minInfusionTimeMin,
		maxDosePer24h: guideline?.maxDosePer24h,
		preparation: {
			diluent: guideline?.compatibilityDiluent,
			finalConcentration: guideline?.finalConcentrationMgMl,
			stockConcentration: guideline?.stockConcentrationMgMl,
		},
		route: guideline?.route,
		weightKg,
	}
}
/**
 * Calculate Z-score for a measurement using WHO standards
 */
export async function calculateZScore(
	gender: Gender,
	chartType: ChartType,
	ageDays: number,
	measurementValue: number
) {
	const standards = await systemQueries.getClosestGrowthStandards(
		gender,
		chartType,
		ageDays
	)

	if (!(standards.lower && standards.upper)) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'Growth standards not found for this age',
		})
	}

	// Linear interpolation between two closest ages
	const lower = standards.lower
	const upper = standards.upper

	if (lower.ageDays === ageDays) {
		return calculateZScoreFromStandard(
			lower as { lValue: number; mValue: number; sValue: number },
			measurementValue
		)
	}

	if (upper.ageDays === ageDays) {
		return calculateZScoreFromStandard(
			upper as { lValue: number; mValue: number; sValue: number },
			measurementValue
		)
	}

	// Interpolate LMS parameters
	const ratio = (ageDays - lower.ageDays) / (upper.ageDays - lower.ageDays)

	const L =
		(lower.lValue ?? 0) + ratio * ((upper.lValue ?? 0) - (lower.lValue ?? 0))
	const M =
		(lower.mValue ?? 0) + ratio * ((upper.mValue ?? 0) - (lower.mValue ?? 0))
	const S =
		(lower.sValue ?? 0) + ratio * ((upper.sValue ?? 0) - (lower.sValue ?? 0))

	// Calculate Z-score using LMS method
	if (L === 0) {
		return Math.log(measurementValue / M) / S
	}

	return ((measurementValue / M) ** L - 1) / (L * S)
}

/**
 * Calculate Z-score from a single standard
 */
export function calculateZScoreFromStandard(
	standard: { lValue: number; mValue: number; sValue: number },
	measurementValue: number
) {
	const { lValue: L, mValue: M, sValue: S } = standard

	if (L === 0) {
		return Math.log(measurementValue / M) / S
	}

	return ((measurementValue / M) ** L - 1) / (L * S)
}

export function classifyGrowth(chartType: ChartType, zScore: number): string {
	switch (chartType) {
		case 'WFA': // Weight-for-age
			if (zScore < -3) return 'Severely underweight'
			if (zScore < -2) return 'Underweight'
			if (zScore > 2) return 'Overweight'
			if (zScore > 3) return 'Obese'
			return 'Normal'

		case 'HFA': // Height-for-age
			if (zScore < -3) return 'Severely stunted'
			if (zScore < -2) return 'Stunted'
			return 'Normal'

		case 'HcFA': // Head circumference-for-age
			if (zScore < -3) return 'Severely microcephalic'
			if (zScore < -2) return 'Microcephalic'
			if (zScore > 2) return 'Macrocephalic'
			if (zScore > 3) return 'Severely macrocephalic'
			return 'Normal'

		default:
			return 'Normal'
	}
}

export async function getDueVaccines(
	_patientId: string,
	dateOfBirth: Date,
	completedVaccines: { vaccineName: string; doseNumber?: number }[]
) {
	const schedule = await systemQueries.getVaccineSchedule()
	const ageDays = Math.floor(
		(Date.now() - dateOfBirth.getTime()) / (1000 * 60 * 60 * 24)
	)

	const completedSet = new Set(
		completedVaccines.map(v => `${v.vaccineName}-${v.doseNumber || 1}`)
	)

	return schedule
		.filter(
			(vaccine: {
				ageInDaysMin: number | null
				ageInDaysMax: number | null
				vaccineName: string
				dosesRequired: number
			}) => {
				// Check age eligibility
				if (vaccine.ageInDaysMin && ageDays < vaccine.ageInDaysMin) return false
				if (vaccine.ageInDaysMax && ageDays > vaccine.ageInDaysMax) return false

				// Check if already completed
				const key = `${vaccine.vaccineName}-${vaccine.dosesRequired}`
				return !completedSet.has(key)
			}
		)
		.map(
			(vaccine: {
				ageInDaysMin: number | null
				ageInDaysMax: number | null
				vaccineName: string
				dosesRequired: number
			}) => ({
				...vaccine,
				dueDate: new Date(
					dateOfBirth.getTime() +
						(vaccine.ageInDaysMin || 0) * 24 * 60 * 60 * 1000
				),
				isOverdue: vaccine.ageInDaysMax
					? ageDays > vaccine.ageInDaysMax
					: false,
			})
		)
}

export function zScoreToPercentile(zScore: number): number {
	// Using the standard normal CDF approximation
	const sign = zScore < 0 ? -1 : 1
	const x = Math.abs(zScore)
	const t = 1 / (1 + 0.231_641_9 * x)
	const d = 0.398_942_3 * Math.exp((-x * x) / 2)
	const p =
		d *
		t *
		(0.319_381_5 +
			t * (-0.356_563_8 + t * (1.781_478 + t * (-1.821_256 + t * 1.330_274))))

	return 100 * (0.5 + sign * (0.5 - p))
}
