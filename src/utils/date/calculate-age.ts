// src/lib/date/calculate-age.ts

// No "use cache" here - this is a utility library, not a service
// Cache directives belong in the service layer

// Constants (unchanged - these are fine)
const MS_PER_DAY = 1000 * 60 * 60 * 24
const DAYS_PER_MONTH = 30.436875
const _MONTHS_PER_YEAR = 12

// Types (unchanged - these are fine)
export interface AgeCalculation {
	years: number
	months: number
	days: number
	totalMonths: number
	totalDays: number
	displayString: string
	detailedString: string
	// Add ISO format for database storage
	isoString: string
	// Add age group for filtering
	ageGroup: 'infant' | 'toddler' | 'preschool' | 'school' | 'adolescent'
}

export interface GrowthCalculation {
	zScore: number
	percentile: number
	interpretation: string
	classification: GrowthClassification
}

export type GrowthClassification =
	| 'severely_underweight'
	| 'underweight'
	| 'risk_underweight'
	| 'normal'
	| 'risk_overweight'
	| 'overweight'
	| 'severely_overweight'

/**
 * Calculate precise age from date of birth to reference date
 * Pure function - no side effects, no caching
 */
export function calculateFullAge(
	dateOfBirth: Date | string,
	referenceDate: Date | string = new Date()
): AgeCalculation {
	// Input validation (unchanged)
	const dob = new Date(dateOfBirth)
	const ref = new Date(referenceDate)

	if (Number.isNaN(dob.getTime()) || Number.isNaN(ref.getTime())) {
		throw new Error('Invalid date provided')
	}

	if (dob > ref) {
		throw new Error('Date of birth cannot be in the future')
	}

	// Calculate total days (unchanged)
	const totalDays = Math.floor((ref.getTime() - dob.getTime()) / MS_PER_DAY)

	// Calculate years and months (unchanged)
	let years = ref.getFullYear() - dob.getFullYear()
	let months = ref.getMonth() - dob.getMonth()
	let days = ref.getDate() - dob.getDate()

	if (days < 0) {
		months--
		const lastMonth = new Date(ref.getFullYear(), ref.getMonth(), 0)
		days += lastMonth.getDate()
	}

	if (months < 0) {
		years--
		months += 12
	}

	const totalMonths = years * 12 + months

	// Determine age group (new - useful for filtering)
	const ageGroup = getAgeGroup(totalMonths)

	// Generate ISO string for database (new)
	const isoString = `${years.toString().padStart(4, '0')}-${months
		.toString()
		.padStart(2, '0')}-${days.toString().padStart(2, '0')}`

	// Display strings (unchanged but improved with null checks)
	const displayString = years === 0 ? `${months}m` : `${years}y ${months}m`

	const detailedString =
		years === 0
			? `${months} month${months !== 1 ? 's' : ''}`
			: months === 0
				? `${years} year${years !== 1 ? 's' : ''}`
				: `${years} year${years !== 1 ? 's' : ''} ${months} month${months !== 1 ? 's' : ''}`

	return {
		years,
		months,
		days,
		totalMonths,
		totalDays,
		displayString,
		detailedString,
		isoString,
		ageGroup,
	}
}

/**
 * Get age group based on total months (new)
 * Useful for filtering and UI segmentation
 */
function getAgeGroup(totalMonths: number): AgeCalculation['ageGroup'] {
	if (totalMonths < 12) return 'infant' // 0-11 months
	if (totalMonths < 36) return 'toddler' // 1-2 years
	if (totalMonths < 72) return 'preschool' // 3-5 years
	if (totalMonths < 144) return 'school' // 6-11 years
	return 'adolescent' // 12+ years
}

/**
 * Pure calculation functions - NO "use cache" here
 * These belong in the service layer with cache directives
 */
export function calculateAgeInMonths(
	dateOfBirth: Date | string,
	referenceDate: Date | string = new Date()
): number {
	return calculateFullAge(dateOfBirth, referenceDate).totalMonths
}

export function calculateAgeInDays(
	dateOfBirth: Date | string,
	referenceDate: Date | string = new Date()
): number {
	return calculateFullAge(dateOfBirth, referenceDate).totalDays
}

/**
 * Calculate Z-score (pure function)
 */
export function calculateFullZScore(
	measurement: number,
	L: number,
	M: number,
	S: number
): number {
	if (M <= 0 || S <= 0) {
		throw new Error('Invalid LMS parameters')
	}

	if (measurement <= 0) {
		throw new Error('Measurement must be positive')
	}

	if (Math.abs(L) < 1e-10) {
		return Math.log(measurement / M) / S
	}

	return ((measurement / M) ** L - 1) / (L * S)
}

/**
 * Convert Z-score to percentile (pure function)
 */
export function zScoreFullToPercentile(zScore: number): number {
	if (zScore > 5) return 99.9999
	if (zScore < -5) return 0.0001

	const sign = zScore < 0 ? -1 : 1
	const Z = Math.abs(zScore)

	const t = 1 / (1 + 0.2316419 * Z)
	const d = 0.3989423 * Math.exp((-Z * Z) / 2)

	const p =
		d *
		t *
		(0.3193815 +
			t * (-0.3565638 + t * (1.7814779 + t * (-1.821256 + t * 1.3302744))))

	const percentile = 0.5 * (1 + sign * (0.5 - p)) * 100
	return Math.round(percentile * 10) / 10
}

/**
 * Get growth classification (pure function)
 */
export function getGrowthClassification(zScore: number): GrowthClassification {
	if (zScore < -3) return 'severely_underweight'
	if (zScore < -2) return 'underweight'
	if (zScore < -1) return 'risk_underweight'
	if (zScore <= 1) return 'normal'
	if (zScore <= 2) return 'risk_overweight'
	if (zScore <= 3) return 'overweight'
	return 'severely_overweight'
}

/**
 * Get growth interpretation (pure function)
 */
export function getGrowthInterpretation(zScore: number): string {
	const classification = getGrowthClassification(zScore)

	const interpretations: Record<GrowthClassification, string> = {
		severely_underweight: 'Severely underweight',
		underweight: 'Underweight',
		risk_underweight: 'Risk of underweight',
		normal: 'Normal',
		risk_overweight: 'Risk of overweight',
		overweight: 'Overweight',
		severely_overweight: 'Severely overweight',
	}

	return interpretations[classification]
}

/**
 * Calculate complete growth metrics (pure function)
 */
export function calculateGrowthMetrics(
	measurement: number,
	L: number,
	M: number,
	S: number
): GrowthCalculation {
	const zScore = calculateFullZScore(measurement, L, M, S)
	const percentile = zScoreFullToPercentile(zScore)
	const interpretation = getGrowthInterpretation(zScore)
	const classification = getGrowthClassification(zScore)

	return {
		zScore: Math.round(zScore * 100) / 100,
		percentile,
		interpretation,
		classification,
	}
}

/**
 * Calculate average (pure function)
 */
export function calculateAverage<
	T extends { weight?: number | null; height?: number | null },
>(measurements: T[], field: 'weight' | 'height'): number | null {
	if (!measurements || measurements.length === 0) return null

	const values = measurements
		.map(m => m[field])
		.filter((val): val is number => val != null && !Number.isNaN(val))

	if (values.length === 0) return null

	const sum = values.reduce((acc, val) => acc + val, 0)
	return Number((sum / values.length).toFixed(2))
}

/**
 * BMI calculation (pure function)
 */
export function calculateBMI(weightKg: number, heightCm: number): number {
	const heightM = heightCm / 100
	return Number((weightKg / (heightM * heightM)).toFixed(1))
}

/**
 * Age conversion utilities (pure functions)
 */
export const ageConverters = {
	daysToMonths: (days: number): number =>
		Number((days / DAYS_PER_MONTH).toFixed(2)),
	monthsToDays: (months: number): number => Math.round(months * DAYS_PER_MONTH),
	monthsToYears: (
		months: number
	): { years: number; remainingMonths: number } => ({
		years: Math.floor(months / 12),
		remainingMonths: months % 12,
	}),
	yearsToMonths: (years: number): number => years * 12,
}
