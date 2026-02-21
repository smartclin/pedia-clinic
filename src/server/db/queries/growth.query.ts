/**
 * 🔵 GROWTH MODULE - QUERY LAYER
 *
 * RESPONSIBILITIES:
 * - ONLY raw Prisma database queries
 * - NO business logic, validation, or error handling
 * - NO cache directives ('use cache')
 * - NO imports from service/cache layers
 * - ALL queries wrapped with dedupeQuery()
 *
 * PATTERN: Pure Data Access Object (DAO)
 */

import { dedupeQuery } from '@/cache/dedupe'
import type { Prisma } from '@/prisma/browser'
import type { ChartType, Gender, GrowthStatus } from '@/types'

import { db } from '..'

export const growthQueries = {
	checkMeasurementExists: dedupeQuery(async (id: string) => {
		return db.growthRecord.findUnique({
			select: { id: true },
			where: { id },
		})
	}),

	// ==================== VALIDATION QUERIES ====================

	checkPatientExists: dedupeQuery(async (patientId: string) => {
		return db.patient.findUnique({
			select: {
				clinicId: true,
				dateOfBirth: true,
				gender: true,
				id: true,
			},
			where: { id: patientId },
		})
	}),

	countGrowthRecordsByPatient: dedupeQuery(async (patientId: string) => {
		return db.growthRecord.count({
			where: { patientId },
		})
	}),

	countMeasurementsByPatient: dedupeQuery(async (patientId: string) => {
		return db.growthRecord.count({
			where: { patientId },
		})
	}),

	createGrowthRecord: dedupeQuery(
		async (data: Prisma.GrowthRecordCreateInput) => {
			return db.growthRecord.create({
				data,
			})
		}
	),

	// ==================== CREATE OPERATIONS ====================

	createMeasurement: dedupeQuery(
		async (data: {
			patientId: string
			date: Date
			weight: number
			height?: number | null
			ageDays: number
			weightForAgeZ?: number | null
			heightForAgeZ?: number | null
			growthStatus?: GrowthStatus | null
		}) => {
			return db.growthRecord.create({
				data: {
					ageDays: data.ageDays,
					date: data.date,
					growthStatus: data.growthStatus ?? null,
					height: data.height ?? null,
					heightForAgeZ: data.heightForAgeZ ?? null,
					patientId: data.patientId,
					weight: data.weight,
					weightForAgeZ: data.weightForAgeZ ?? null,
				},
			})
		}
	),

	// ==================== DELETE OPERATIONS ====================

	deleteGrowthRecord: dedupeQuery(async (id: string) => {
		return db.growthRecord.delete({
			where: { id },
		})
	}),

	findClosestWHOStandard: dedupeQuery(
		async (params: {
			gender: Gender
			chartType: ChartType
			ageDays: number
			ageMonths: number
		}) => {
			const { gender, chartType, ageDays, ageMonths } = params

			// Try exact age months first
			return db.wHOGrowthStandard.findFirst({
				orderBy: [{ ageInMonths: 'asc' }, { ageDays: 'asc' }],
				where: {
					chartType,
					gender,
					OR: [
						{ ageInMonths: ageMonths },
						// For infants <24 months, try age days within range
						...(ageMonths < 24
							? [
									{
										ageDays: {
											gte: Math.max(0, ageDays - 7),
											lte: ageDays + 7,
										},
									},
								]
							: []),
					],
				},
			})
		}
	),

	// ==================== GROWTH RECORD QUERIES ====================

	findGrowthRecordById: dedupeQuery(async (id: string) => {
		return db.growthRecord.findUnique({
			include: {
				medical: {
					select: {
						appointmentId: true,
						diagnosis: true,
						id: true,
					},
				},
				patient: {
					select: {
						clinicId: true,
						dateOfBirth: true,
						firstName: true,
						gender: true,
						id: true,
						lastName: true,
					},
				},
				vitalSigns: true,
			},
			where: { id },
		})
	}),

	findGrowthRecordsByClinic: dedupeQuery(
		async (clinicId: string, options?: { limit?: number; offset?: number }) => {
			return db.growthRecord.findMany({
				include: {
					patient: {
						select: {
							dateOfBirth: true,
							firstName: true,
							gender: true,
							id: true,
							lastName: true,
						},
					},
				},
				orderBy: { date: 'desc' },
				skip: options?.offset || 0,
				take: options?.limit || 50,
				where: {
					patient: { clinicId },
				},
			})
		}
	),

	findGrowthRecordsByPatient: dedupeQuery(
		async (
			patientId: string,
			options?: { limit?: number; offset?: number }
		) => {
			return db.growthRecord.findMany({
				include: {
					patient: {
						select: {
							clinicId: true,
							dateOfBirth: true,
							gender: true,
						},
					},
				},
				orderBy: { date: 'desc' },
				skip: options?.offset || 0,
				take: options?.limit || 100,
				where: { patientId },
			})
		}
	),

	findLatestGrowthRecordByPatient: dedupeQuery(async (patientId: string) => {
		return db.growthRecord.findFirst({
			orderBy: { date: 'desc' },
			where: { patientId },
		})
	}),

	findLatestMeasurementByPatient: dedupeQuery(async (patientId: string) => {
		return db.growthRecord.findFirst({
			orderBy: { recordedAt: 'desc' },
			where: { patientId },
		})
	}),
	// ==================== MEASUREMENT QUERIES ====================

	findMeasurementById: dedupeQuery(async (id: string) => {
		return db.growthRecord.findUnique({
			include: {
				patient: {
					select: {
						clinicId: true,
						dateOfBirth: true,
						firstName: true,
						gender: true,
						id: true,
						lastName: true,
					},
				},
			},
			where: { id },
		})
	}),

	findMeasurementsByPatient: dedupeQuery(
		async (
			patientId: string,
			options?: { limit?: number; offset?: number }
		) => {
			return db.growthRecord.findMany({
				include: {
					patient: {
						select: {
							clinicId: true,
							dateOfBirth: true,
							gender: true,
						},
					},
				},
				orderBy: { recordedAt: 'desc' },
				skip: options?.offset || 0,
				take: options?.limit || 100,
				where: { patientId },
			})
		}
	),

	// ==================== WHO STANDARDS QUERIES ====================

	findWHOStandards: dedupeQuery(
		async (params: {
			gender: Gender
			chartType: 'WFA' | 'HFA' | 'HcFA'
			ageMonthsMin?: number
			ageMonthsMax?: number
		}) => {
			const { chartType, gender, ageMonthsMin, ageMonthsMax } = params

			const where: Prisma.WHOGrowthStandardWhereInput = {
				chartType,
				gender,
			}

			if (ageMonthsMin !== undefined || ageMonthsMax !== undefined) {
				where.ageInMonths = {
					...(ageMonthsMin !== undefined && { gte: ageMonthsMin }),
					...(ageMonthsMax !== undefined && { lte: ageMonthsMax }),
				}
			}

			return db.wHOGrowthStandard.findMany({
				orderBy: [{ ageInMonths: 'asc' }, { ageDays: 'asc' }],
				where,
			})
		}
	),

	// ==================== AGGREGATION QUERIES ====================

	getGrowthStatsByClinic: dedupeQuery(
		async (
			clinicId: string,
			dateRange?: { startDate: Date; endDate: Date }
		) => {
			const where = {
				patient: { clinicId },
				...(dateRange && {
					date: {
						gte: dateRange.startDate,
						lte: dateRange.endDate,
					},
				}),
			}

			return db.$transaction([
				db.growthRecord.count({ where }),
				db.patient.count({
					where: {
						clinicId,
						growthRecords: { some: {} },
					},
				}),
				db.growthRecord.groupBy({
					_count: true,
					by: ['classification'],
					orderBy: {
						date: 'asc',
					},
					where,
				}),
			])
		}
	),

	softDeleteGrowthRecord: dedupeQuery(async (id: string) => {
		return db.growthRecord.update({
			data: {
				deletedAt: new Date(),
			},
			where: { id },
		})
	}),

	// ==================== UPDATE OPERATIONS ====================

	updateGrowthRecord: dedupeQuery(
		async (
			id: string,
			data: Partial<{
				weight: number
				height: number
				headCircumference: number
				bmi: number
				notes: string
				classification: string
			}>
		) => {
			return db.growthRecord.update({
				data: {
					...data,
					updatedAt: new Date(),
				},
				include: {
					patient: {
						select: {
							clinicId: true,
							id: true,
						},
					},
				},
				where: { id },
			})
		}
	),
} as const

export type GrowthQueries = typeof growthQueries
