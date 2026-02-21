import { dedupeQuery } from '@/cache/dedupe'
import type { ChartType, Gender } from '@/prisma/browser'
import { db } from '@/server/db'

export const systemQueries = {
	/**
	 * 🔵 Get all drugs
	 */
	getAllDrugs: dedupeQuery(async () => {
		return await db.drug.findMany({
			include: {
				guidelines: true,
			},
			orderBy: { name: 'asc' },
		})
	}),

	/**
	 * 🔵 Get all WHO growth standards (for cache warming)
	 */
	getAllWHOGrowthStandards: dedupeQuery(async () => {
		return await db.wHOGrowthStandard.findMany({
			orderBy: [{ gender: 'asc' }, { chartType: 'asc' }, { ageDays: 'asc' }],
		})
	}),

	/**
	 * 🔵 Get closest growth standard for age interpolation
	 */
	getClosestGrowthStandards: dedupeQuery(
		async (gender: Gender, chartType: ChartType, ageDays: number) => {
			const [lower, upper] = await Promise.all([
				db.wHOGrowthStandard.findFirst({
					orderBy: { ageDays: 'desc' },
					where: {
						ageDays: { lte: ageDays },
						chartType,
						gender,
					},
				}),
				db.wHOGrowthStandard.findFirst({
					orderBy: { ageDays: 'asc' },
					where: {
						ageDays: { gte: ageDays },
						chartType,
						gender,
					},
				}),
			])

			return { lower, upper }
		}
	),

	/**
	 * 🔵 Get dose guidelines for a drug
	 */
	getDoseGuidelines: dedupeQuery(async (drugId: string) => {
		return await db.doseGuideline.findMany({
			orderBy: [{ clinicalIndication: 'asc' }, { route: 'asc' }],
			where: { drugId },
		})
	}),

	/**
	 * 🔵 Get drug by ID
	 */
	getDrugById: dedupeQuery(async (id: string) => {
		return await db.drug.findUnique({
			include: {
				guidelines: true,
			},
			where: { id },
		})
	}),

	/**
	 * 🔵 Get drug by name
	 */
	getDrugByName: dedupeQuery(async (name: string) => {
		return await db.drug.findUnique({
			include: {
				guidelines: true,
			},
			where: { name },
		})
	}),

	/**
	 * 🔵 Get growth standard by exact age and gender
	 */
	getGrowthStandardByAge: dedupeQuery(
		async (gender: Gender, chartType: ChartType, ageDays: number) => {
			return await db.wHOGrowthStandard.findFirst({
				where: {
					ageDays,
					chartType,
					gender,
				},
			})
		}
	),

	/**
	 * 🔵 Get vaccine by name
	 */
	getVaccineByName: dedupeQuery(async (name: string) => {
		return await db.vaccineSchedule.findMany({
			orderBy: { ageInDaysMin: 'asc' },
			where: { vaccineName: name },
		})
	}),

	/**
	 * 🔵 Get vaccine schedule
	 */
	getVaccineSchedule: dedupeQuery(async () => {
		return await db.vaccineSchedule.findMany({
			orderBy: [{ ageInDaysMin: 'asc' }, { vaccineName: 'asc' }],
		})
	}),
	/**
	 * 🔵 Get WHO growth standards by gender and measurement type
	 */
	getWHOGrowthStandards: dedupeQuery(
		async (gender: Gender, chartType: ChartType) => {
			return await db.wHOGrowthStandard.findMany({
				orderBy: {
					ageDays: 'asc',
				},
				where: {
					chartType,
					gender,
				},
			})
		}
	),

	/**
	 * 🔵 Search drugs
	 */
	searchDrugs: dedupeQuery(async (query: string, limit = 20) => {
		return await db.drug.findMany({
			include: {
				guidelines: {
					take: 1, // Just to check if guidelines exist
				},
			},
			orderBy: { name: 'asc' },
			take: limit as number,
			where: {
				name: {
					contains: query,
					mode: 'insensitive',
				},
			},
		})
	}),
}
