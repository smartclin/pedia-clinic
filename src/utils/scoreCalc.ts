// src/lib/zscoreCalc.ts

import {
	differenceInDays,
	differenceInMonths,
	differenceInYears,
	isBefore,
} from 'date-fns'

import { db } from '@/db/index'

// --- Type Definitions ---
// Note: You need to properly import db or define its type

export type GrowthStatus =
	| 'NORMAL'
	| 'UNDERWEIGHT'
	| 'STUNTED'
	| 'WASTED'
	| 'OVERWEIGHT'
	| 'OBESE'

export interface LMSDataPoint {
	ageMonths?: number
	gender: 'MALE' | 'FEMALE'
	ageDays: number
	lValue: number
	mValue: number
	sValue: number
	sd0: number
	sd1neg: number
	sd1pos: number
	sd2neg: number
	sd2pos: number
	sd3neg: number
	sd3pos: number
	sd4neg: number | null
	sd4pos: number | null
}

export type GrowthDataMap = Map<string, LMSDataPoint[]>

export interface ZScoreResult {
	zScore: number | null
	percentile: number | null
	whoClassification: string
	exactMatch: boolean
	interpolated: boolean
	referenceValues: {
		median: number
		sd1neg: number
		sd1pos: number
		sd2neg: number
		sd2pos: number
		sd3neg: number
		sd3pos: number
	}
}

export interface GrowthAssessment {
	zScore: number | null
	percentile: number | null
	classification: string
	severity: 'normal' | 'mild' | 'moderate' | 'severe'
	recommendation: string
	interpolated: boolean
}

// --- Core Z-Score Calculation ---
export function calculateLMSZScore(
	x: number,
	l: number,
	m: number,
	s: number
): number {
	// Input validation
	if (m <= 0 || s <= 0) {
		throw new Error('Invalid LMS parameters: M and S must be positive')
	}

	if (l === 0) {
		return Math.log(x / m) / s
	}
	return ((x / m) ** l - 1) / (l * s)
}

// --- Classification Functions ---
export function classifyGrowthStatus(
	weightZ?: number | null,
	heightZ?: number | null,
	bmiZ?: number | null
): GrowthStatus {
	if (bmiZ !== undefined && bmiZ !== null) {
		if (bmiZ > 3) return 'OBESE'
		if (bmiZ > 2) return 'OVERWEIGHT'
	}

	if (weightZ !== undefined && weightZ !== null && weightZ < -2)
		return 'UNDERWEIGHT'
	if (heightZ !== undefined && heightZ !== null && heightZ < -2)
		return 'STUNTED'

	return 'NORMAL'
}

export async function checkGrowthAlerts(
	vitalId: string,
	data: {
		weightForAgeZ?: number | null
		heightForAgeZ?: number | null
	}
) {
	if (
		(data.weightForAgeZ && data.weightForAgeZ < -3) ||
		(data.heightForAgeZ && data.heightForAgeZ < -3)
	) {
		// Future: notify doctor / add alert table
		console.warn(`🚨 Severe growth deviation for vital ${vitalId}`)
	}
}

// --- WHO Percentiles Calculation ---
export async function calculateWHOPercentiles(
	weight: number | undefined,
	height: number | undefined,
	gender: 'MALE' | 'FEMALE',
	ageDays: number
) {
	const results: {
		weightForAgeZ?: number | null
		heightForAgeZ?: number | null
		hcForAgeZ?: number | null
		growthStatus: string
	} = {
		growthStatus: 'NORMAL',
	}

	if (weight) {
		const wfa = await db.wHOGrowthStandard.findFirst({
			where: {
				ageDays,
				chartType: 'WFA',
				gender,
				measurementType: 'Weight',
			},
		})

		if (wfa) {
			results.weightForAgeZ = calculateLMSZScore(
				weight,
				wfa.lValue ?? 0,
				wfa.mValue ?? 0,
				wfa.sValue ?? 0
			)
		}
	}

	if (height) {
		const hfa = await db.wHOGrowthStandard.findFirst({
			where: {
				ageDays,
				chartType: 'HFA',
				gender,
				measurementType: 'Height',
			},
		})

		if (hfa) {
			results.heightForAgeZ = calculateLMSZScore(
				height,
				hfa.lValue ?? 0,
				hfa.mValue ?? 0,
				hfa.sValue ?? 0
			)
		}
	}

	results.growthStatus = classifyGrowthStatus(
		results.weightForAgeZ,
		results.heightForAgeZ
	)

	return results
}

// --- Age Calculation Utilities ---
export const getAgeInDays = (dob: Date, measurementDate: Date): number => {
	if (isBefore(measurementDate, dob)) return -1
	return differenceInDays(measurementDate, dob)
}

export const getAgeInMonths = (dob: Date, measurementDate: Date): number =>
	differenceInMonths(measurementDate, dob)

export const getAgeYMD = (
	dob: Date,
	measurementDate: Date
): { years: number; months: number; days: number } => {
	const years = differenceInYears(measurementDate, dob)
	const months = differenceInMonths(measurementDate, dob) % 12

	// Calculate remaining days more accurately
	const yearMonthDate = new Date(dob)
	yearMonthDate.setFullYear(dob.getFullYear() + years)
	yearMonthDate.setMonth(dob.getMonth() + months)

	const days = differenceInDays(measurementDate, yearMonthDate)

	return { days, months, years }
}

// --- Data Lookup with Interpolation ---
const findClosestLMSData = (
	dataArray: LMSDataPoint[],
	ageDays: number
): {
	lower: LMSDataPoint | null
	upper: LMSDataPoint | null
	exact: LMSDataPoint | null
} => {
	if (!dataArray.length) {
		return { exact: null, lower: null, upper: null }
	}

	const sortedData = [...dataArray].sort((a, b) => a.ageDays - b.ageDays)

	// Exact match
	const exactMatch = sortedData.find(d => d.ageDays === ageDays)
	if (exactMatch) {
		return { exact: exactMatch, lower: exactMatch, upper: exactMatch }
	}

	// Find bounding points
	let lower: LMSDataPoint | null = null
	let upper: LMSDataPoint | null = null

	for (let i = 0; i < sortedData.length - 1; i++) {
		const current = sortedData[i]
		const next = sortedData[i + 1]

		if (
			current &&
			next &&
			current.ageDays <= ageDays &&
			next.ageDays >= ageDays
		) {
			lower = current
			upper = next
			break
		}
	}

	// Handle edge cases
	const firstItem = sortedData[0]
	const lastItem = sortedData.at(-1)

	if (!(lower || upper)) {
		if (firstItem && firstItem.ageDays > ageDays) {
			upper = firstItem
		} else if (lastItem && lastItem.ageDays < ageDays) {
			lower = lastItem
		}
	}

	return { exact: null, lower, upper }
}

const interpolateLMS = (
	lower: LMSDataPoint,
	upper: LMSDataPoint,
	targetAgeDays: number
): LMSDataPoint => {
	const ageRange = upper.ageDays - lower.ageDays
	const progress =
		ageRange === 0 ? 0 : (targetAgeDays - lower.ageDays) / ageRange

	const interpolate = (lowerVal: number, upperVal: number): number =>
		lowerVal + (upperVal - lowerVal) * progress

	const interpolateNullable = (
		lowerVal: number | null,
		upperVal: number | null
	): number | null => {
		if (lowerVal === null || upperVal === null) return null
		return interpolate(lowerVal, upperVal)
	}

	return {
		ageDays: targetAgeDays, // Fixed: removed ?? ''
		gender: lower.gender,
		lValue: interpolate(lower.lValue, upper.lValue),
		mValue: interpolate(lower.mValue, upper.mValue),
		sd0: interpolate(lower.sd0, upper.sd0),
		sd1neg: interpolate(lower.sd1neg, upper.sd1neg),
		sd1pos: interpolate(lower.sd1pos, upper.sd1pos),
		sd2neg: interpolate(lower.sd2neg, upper.sd2neg),
		sd2pos: interpolate(lower.sd2pos, upper.sd2pos),
		sd3neg: interpolate(lower.sd3neg, upper.sd3neg),
		sd3pos: interpolate(lower.sd3pos, upper.sd3pos),
		sd4neg: interpolateNullable(lower.sd4neg, upper.sd4neg),
		sd4pos: interpolateNullable(lower.sd4pos, upper.sd4pos),
		sValue: interpolate(lower.sValue, upper.sValue),
	}
}

const getLMSData = (
	dataMap: GrowthDataMap,
	gender: string,
	ageDays: number
): { data: LMSDataPoint | null; interpolated: boolean } => {
	const key = gender
	const dataArray = dataMap.get(key)

	if (!dataArray?.length) {
		return { data: null, interpolated: false }
	}

	const { lower, upper, exact } = findClosestLMSData(dataArray, ageDays)

	if (exact) {
		return { data: exact, interpolated: false }
	}

	if (lower && upper) {
		return { data: interpolateLMS(lower, upper, ageDays), interpolated: true }
	}

	// Use closest available data point
	const closest = dataArray.reduce((prev, curr) =>
		Math.abs(curr.ageDays - ageDays) < Math.abs(prev.ageDays - ageDays)
			? curr
			: prev
	)

	return { data: closest, interpolated: true }
}

// --- Z-Score Conversion and Classification ---
export const zScoreToPercentile = (zScore: number): number => {
	if (zScore < -6) return 0.01
	if (zScore > 6) return 99.99

	const sign = zScore < 0 ? -1 : 1
	const x = Math.abs(zScore) / Math.sqrt(2)
	const t = 1 / (1 + 0.327_591_1 * x)

	const erf =
		1 -
		((((1.061_405_429 * t - 1.453_152_027) * t + 1.421_413_741) * t -
			0.284_496_736) *
			t +
			0.254_829_592 * t * Math.exp(-x * x))
	const percentile = 0.5 * (1 + sign * erf)

	return Math.max(
		0.01,
		Math.min(99.99, Math.round(percentile * 100 * 100) / 100)
	)
}

export const classifyWFA = (
	zScore: number | null
): {
	classification: string
	severity: 'normal' | 'mild' | 'moderate' | 'severe'
	recommendation: string
} => {
	if (zScore === null) {
		return {
			classification: 'Unable to assess',
			recommendation: 'Please verify age and measurement data',
			severity: 'normal',
		}
	}

	if (zScore < -3) {
		return {
			classification: 'Severe Underweight',
			recommendation:
				'Urgent medical assessment required. Consider referral to pediatric nutrition specialist.',
			severity: 'severe',
		}
	}
	if (zScore < -2) {
		return {
			classification: 'Moderate Underweight',
			recommendation:
				'Nutritional intervention needed. Monitor growth closely and provide dietary counseling.',
			severity: 'moderate',
		}
	}
	if (zScore < -1) {
		return {
			classification: 'Mild Underweight',
			recommendation:
				'Monitor growth pattern. Provide nutritional education and follow up in 1 month.',
			severity: 'mild',
		}
	}
	if (zScore <= 1) {
		return {
			classification: 'Normal Weight',
			recommendation:
				'Continue current feeding practices. Regular growth monitoring recommended.',
			severity: 'normal',
		}
	}
	if (zScore <= 2) {
		return {
			classification: 'Overweight',
			recommendation:
				'Monitor growth pattern. Encourage balanced diet and physical activity.',
			severity: 'mild',
		}
	}
	if (zScore <= 3) {
		return {
			classification: 'Obese',
			recommendation:
				'Nutritional counseling required. Assess dietary habits and physical activity levels.',
			severity: 'moderate',
		}
	}
	return {
		classification: 'Severely Obese',
		recommendation:
			'Urgent medical assessment. Comprehensive management plan needed.',
		severity: 'severe',
	}
}

// --- Enhanced Z-Score Calculation ---
export const calculateEnhancedZScore = (
	dataMap: GrowthDataMap,
	gender: 'MALE' | 'FEMALE',
	ageDays: number,
	measuredValue: number
): ZScoreResult => {
	if (measuredValue <= 0 || ageDays < 0 || ageDays > 1856) {
		return {
			exactMatch: false,
			interpolated: false,
			percentile: null,
			referenceValues: {
				median: 0,
				sd1neg: 0,
				sd1pos: 0,
				sd2neg: 0,
				sd2pos: 0,
				sd3neg: 0,
				sd3pos: 0,
			},
			whoClassification: 'Invalid input data',
			zScore: null,
		}
	}

	// Use default measureType 0 for the enhanced z-score lookup.
	// Explicitly provide a number as the measureType argument.
	const { data: lms, interpolated } = getLMSData(dataMap, gender, ageDays)

	if (lms == null) {
		return {
			exactMatch: false,
			interpolated: false,
			percentile: null,
			referenceValues: {
				median: 0,
				sd1neg: 0,
				sd1pos: 0,
				sd2neg: 0,
				sd2pos: 0,
				sd3neg: 0,
				sd3pos: 0,
			},
			whoClassification: 'No reference data available',
			zScore: null,
		}
	}

	const { lValue: L, mValue: M, sValue: S } = lms

	if (M <= 0 || S <= 0) {
		return {
			exactMatch: !interpolated,
			interpolated,
			percentile: null,
			referenceValues: {
				median: M,
				sd1neg: lms.sd1neg,
				sd1pos: lms.sd1pos,
				sd2neg: lms.sd2neg,
				sd2pos: lms.sd2pos,
				sd3neg: lms.sd3neg,
				sd3pos: lms.sd3pos,
			},
			whoClassification: 'Invalid reference data',
			zScore: null,
		}
	}

	let zScore: number
	try {
		zScore = calculateLMSZScore(measuredValue, L, M, S)

		if (!Number.isFinite(zScore)) {
			zScore = measuredValue > M ? 10 : -10
		}
	} catch {
		return {
			exactMatch: !interpolated,
			interpolated,
			percentile: null,
			referenceValues: {
				median: M,
				sd1neg: lms.sd1neg,
				sd1pos: lms.sd1pos,
				sd2neg: lms.sd2neg,
				sd2pos: lms.sd2pos,
				sd3neg: lms.sd3neg,
				sd3pos: lms.sd3pos,
			},
			whoClassification: 'Calculation error',
			zScore: null,
		}
	}

	const percentile = zScoreToPercentile(zScore)
	const classification = classifyWFA(zScore).classification

	return {
		exactMatch: !interpolated,
		interpolated,
		percentile,
		referenceValues: {
			median: M,
			sd1neg: lms.sd1neg,
			sd1pos: lms.sd1pos,
			sd2neg: lms.sd2neg,
			sd2pos: lms.sd2pos,
			sd3neg: lms.sd3neg,
			sd3pos: lms.sd3pos,
		},
		whoClassification: classification,
		zScore: Math.round(zScore * 100) / 100,
	}
}

// --- Assessment and Utility Functions ---
export const assessGrowth = (
	dataMap: GrowthDataMap,
	gender: 'MALE' | 'FEMALE',
	ageDays: number,
	measuredValue: number
): GrowthAssessment => {
	const result = calculateEnhancedZScore(
		dataMap,
		gender,
		ageDays,
		measuredValue
	)
	const classification = classifyWFA(result.zScore)

	return {
		classification: classification.classification,
		interpolated: result.interpolated,
		percentile: result.percentile,
		recommendation: classification.recommendation,
		severity: classification.severity,
		zScore: result.zScore,
	}
}

export const calculateMultipleZScores = (
	dataMap: GrowthDataMap,
	measurements: Array<{
		ageDays: number
		weight: number
		date: Date
	}>,
	gender: 'MALE' | 'FEMALE'
): Array<GrowthAssessment & { ageDays: number; date: Date; weight: number }> =>
	measurements.map(measurement => ({
		...assessGrowth(dataMap, gender, measurement.ageDays, measurement.weight),
		ageDays: measurement.ageDays,
		date: measurement.date,
		weight: measurement.weight,
	}))

export const predictWeight = (
	currentAssessment: GrowthAssessment,
	currentWeight: number,
	currentAgeDays: number,
	targetAgeDays: number
): { predictedWeight: number; confidence: 'low' | 'medium' | 'high' } => {
	if (
		!currentAssessment.zScore ||
		currentAssessment.zScore < -2 ||
		currentAssessment.zScore > 2
	) {
		return { confidence: 'low', predictedWeight: currentWeight }
	}

	const daysDifference = targetAgeDays - currentAgeDays
	const growthRate = currentAssessment.zScore > 0 ? 0.015 : 0.012
	const predictedWeight = currentWeight + growthRate * daysDifference

	let confidence: 'low' | 'medium' | 'high' = 'medium'
	if (currentAssessment.zScore >= -1 && currentAssessment.zScore <= 1) {
		confidence = 'high'
	} else if (currentAssessment.severity === 'severe') {
		confidence = 'low'
	}

	return {
		confidence,
		predictedWeight: Math.round(predictedWeight * 100) / 100,
	}
}

// --- Data Map Creation ---
export const createGrowthDataMap = (records: LMSDataPoint[]): GrowthDataMap => {
	const map: GrowthDataMap = new Map()

	for (const record of records) {
		const chartKey = record.gender
		const arr = map.get(chartKey)

		if (arr) {
			arr.push(record)
		} else {
			map.set(chartKey, [record])
		}
	}

	for (const [, arr] of map) {
		arr.sort((a, b) => a.ageDays - b.ageDays)
	}

	return map
}

export const createValidatedGrowthDataMap = (
	records: LMSDataPoint[]
): GrowthDataMap => {
	const validRecords = records.filter(
		record =>
			record.ageDays >= 0 &&
			record.mValue > 0 &&
			record.sValue > 0 &&
			record.gender
	)

	return createGrowthDataMap(validRecords)
}

export const calculateZScore = (
	dataMap: GrowthDataMap,
	gender: 'MALE' | 'FEMALE',
	ageDays: number,
	measuredValue: number
): ZScoreResult => {
	// Input validation
	if (measuredValue <= 0 || ageDays < 0 || ageDays > 1856) {
		// 5 years = 1825 days + buffer
		return {
			exactMatch: false,
			interpolated: false,
			percentile: null,
			referenceValues: {
				median: 0,
				sd1neg: 0,
				sd1pos: 0,
				sd2neg: 0,
				sd2pos: 0,
				sd3neg: 0,
				sd3pos: 0,
			},
			whoClassification: 'Invalid input data',
			zScore: null,
		}
	}

	// Get LMS data with interpolation
	const { data: lms, interpolated } = getLMSData(dataMap, gender, ageDays)

	if (!lms) {
		return {
			exactMatch: false,
			interpolated: false,
			percentile: null,
			referenceValues: {
				median: 0,
				sd1neg: 0,
				sd1pos: 0,
				sd2neg: 0,
				sd2pos: 0,
				sd3neg: 0,
				sd3pos: 0,
			},
			whoClassification: 'No reference data available',
			zScore: null,
		}
	}

	const { lValue: L, mValue: M, sValue: S } = lms

	// Validate LMS parameters
	if (M <= 0 || S <= 0) {
		return {
			exactMatch: !interpolated,
			interpolated,
			percentile: null,
			referenceValues: {
				median: M,
				sd1neg: lms.sd1neg,
				sd1pos: lms.sd1pos,
				sd2neg: lms.sd2neg,
				sd2pos: lms.sd2pos,
				sd3neg: lms.sd3neg,
				sd3pos: lms.sd3pos,
			},
			whoClassification: 'Invalid reference data',
			zScore: null,
		}
	}

	// Calculate Z-score using LMS method
	let zScore: number
	try {
		if (L === 0) {
			zScore = Math.log(measuredValue / M) / S
		} else {
			zScore = ((measuredValue / M) ** L - 1) / (L * S)
		}

		// Handle extreme values
		if (!Number.isFinite(zScore)) {
			zScore = measuredValue > M ? 10 : -10 // Extreme values
		}
	} catch (error) {
		console.error('Error calculating Z-score:', error)
		return {
			exactMatch: !interpolated,
			interpolated,
			percentile: null,
			referenceValues: {
				median: M,
				sd1neg: lms.sd1neg,
				sd1pos: lms.sd1pos,
				sd2neg: lms.sd2neg,
				sd2pos: lms.sd2pos,
				sd3neg: lms.sd3neg,
				sd3pos: lms.sd3pos,
			},
			whoClassification: 'Calculation error',
			zScore: null,
		}
	}

	const percentile = zScoreToPercentile(zScore)
	const classification = classifyWFA(zScore).classification

	return {
		exactMatch: !interpolated,
		interpolated,
		percentile,
		referenceValues: {
			median: M,
			sd1neg: lms.sd1neg,
			sd1pos: lms.sd1pos,
			sd2neg: lms.sd2neg,
			sd2pos: lms.sd2pos,
			sd3neg: lms.sd3neg,
			sd3pos: lms.sd3pos,
		},
		whoClassification: classification,
		zScore: Math.round(zScore * 100) / 100,
	}
}
