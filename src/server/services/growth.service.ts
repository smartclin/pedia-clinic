// modules/growth/growth.service.ts

import { TRPCError } from '@trpc/server'
import { differenceInMonths } from 'date-fns'
import { cacheLife, cacheTag, revalidateTag } from 'next/cache'

import type {
  GrowthComparisonInput,
  GrowthPercentileInput,
  GrowthStandardsInput,
  GrowthTrendsInput,
  UpdateGrowthRecordInput,
  VelocityCalculationInput,
} from '@/schemas'
import { growthQueries } from '@/server/db/queries'
import type { ChartType, Gender } from '@/types'
import {
  calculateLMSZScore,
  calculateZScore,
  getAgeInDays,
  type LMSDataPoint,
  zScoreToPercentile,
} from '@/utils'

import { cacheHelpers } from '../../lib/cache/helpers'
import { CACHE_PROFILES } from '../../lib/cache/profiles'
import { CACHE_TAGS } from '../../lib/cache/tags'
import {
  type AgeCalculation,
  calculateAverage,
  getGrowthInterpretation,
} from '../../utils/date/calculate-age'
import { validateClinicAccess } from '../utils'
import { calculateAge } from './appointment.service'

// ==================== TYPE DEFINITIONS ====================

export interface ZScoreChartData {
  gender: 'MALE' | 'FEMALE'
  chartType: 'WFA' | 'HFA' | 'HcFA'
  points: LMSDataPoint[]
  ageRange: {
    minAgeDays: number
    maxAgeDays: number
    minAgeMonths: number
    maxAgeMonths: number
  }
  metadata: {
    totalPoints: number
    dataSource: 'WHO'
    lastUpdated: Date
  }
}

export interface PatientZScoreData {
  ageDays: number
  ageMonths: number
  weight?: number | null
  height?: number | null
  weightForAgeZ?: number | null
  heightForAgeZ?: number | null
  zScore?: number | null
  percentile?: number | null
  classification: string
  date: Date
}

export interface ClinicGrowthOverview {
  stats: {
    totalMeasurements: number
    patientsMeasured: number
    classifications: Array<{
      classification: string | null
      _count: { _all: number }
    }>
  }
  recentMeasurements: Array<{
    id: string
    date: Date
    patientId: string
    weight?: number | null
    height?: number | null
    classification?: string | null
    measurementType?: string | null
    patient: {
      id: string
      firstName: string
      lastName: string
      dateOfBirth: Date
      gender: string | null
    }
  }>
}

// ==================== SERVICE CLASS ====================

// ==================== QUERY METHODS (CACHED) ====================

export async function getGrowthRecordById(id: string) {
  'use cache'
  cacheTag(CACHE_TAGS.growth.byId(id))
  cacheLife(CACHE_PROFILES.medicalShort)

  const record = await growthQueries.findGrowthRecordById(id)
  if (!record) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Growth record not found',
    })
  }
  return record
}

export async function getGrowthRecordsByPatient(
  patientId: string,
  clinicId: string,
  options?: { limit?: number; offset?: number }
) {
  'use cache'
  const limit = options?.limit || 50
  cacheTag(
    CACHE_TAGS.patient.growth(patientId),
    `growth:patient:${patientId}:limit:${limit}`
  )
  cacheLife(CACHE_PROFILES.medicalMedium)

  // Verify patient belongs to clinic
  await verifyPatientAccess(patientId, clinicId)

  return growthQueries.findGrowthRecordsByPatient(patientId, options)
}

export async function getLatestGrowthRecord(
  patientId: string,
  clinicId: string
) {
  'use cache'
  cacheTag(CACHE_TAGS.patient.growth(patientId))
  cacheLife(CACHE_PROFILES.medicalShort)

  await verifyPatientAccess(patientId, clinicId)
  return growthQueries.findLatestGrowthRecordByPatient(patientId)
}

export async function getRecentGrowthRecords(clinicId: string, limit = 20) {
  'use cache'
  cacheTag(
    CACHE_TAGS.growth.recent(clinicId),
    `growth:clinic:${clinicId}:recent`
  )
  cacheLife(CACHE_PROFILES.medicalShort)

  return growthQueries.findGrowthRecordsByClinic(clinicId, { limit })
}

export async function getPatientMeasurements(
  patientId: string,
  clinicId: string,
  limit = 50
) {
  'use cache'
  cacheTag(
    CACHE_TAGS.patient.growth(patientId),
    CACHE_TAGS.patient.vitalSigns(patientId),
    `patient:measurements:${patientId}`
  )
  cacheLife(CACHE_PROFILES.medicalMedium)

  await verifyPatientAccess(patientId, clinicId)

  const [measurements, growthRecords] = await Promise.all([
    growthQueries.findMeasurementsByPatient(patientId, { limit }),
    growthQueries.findGrowthRecordsByPatient(patientId, { limit }),
  ])

  return {
    growthRecords,
    measurements,
    summary: {
      averageHeight: calculateAverage(growthRecords, 'height'),
      averageWeight: calculateAverage(growthRecords, 'weight'),
      latestGrowthRecord: growthRecords[0] || null,
      latestMeasurement: measurements[0] || null,
      totalGrowthRecords: growthRecords.length,
      totalMeasurements: measurements.length,
    },
  }
}

export async function getGrowthSummary(patientId: string, clinicId: string) {
  'use cache'
  cacheTag(
    CACHE_TAGS.patient.growth(patientId),
    `patient:growth:summary:${patientId}`
  )
  cacheLife(CACHE_PROFILES.medicalShort)

  await verifyPatientAccess(patientId, clinicId)

  const [records, latest] = await Promise.all([
    growthQueries.findGrowthRecordsByPatient(patientId),
    growthQueries.findLatestGrowthRecordByPatient(patientId),
  ])

  return {
    firstRecordDate: records.at(-1)?.date ?? null,
    hasData: records.length > 0,
    lastRecordDate: records[0]?.date ?? null,
    latestRecord: latest,
    totalRecords: records.length,
  }
}

export async function getClinicGrowthOverview(
  clinicId: string
): Promise<ClinicGrowthOverview> {
  'use cache'
  cacheTag(CACHE_TAGS.growth.byClinic(clinicId), `clinic:growth:${clinicId}`)
  cacheLife(CACHE_PROFILES.medicalMedium)

  const [recentMeasurements, patientsWithData, stats] = await Promise.all([
    growthQueries.findGrowthRecordsByClinic(clinicId, { limit: 50 }),
    growthQueries.countGrowthRecordsByPatient(clinicId),
    growthQueries.getGrowthStatsByClinic(clinicId),
  ])

  return {
    recentMeasurements: recentMeasurements.slice(
      0,
      10
    ) as ClinicGrowthOverview['recentMeasurements'],
    stats: {
      classifications:
        stats[2] as ClinicGrowthOverview['stats']['classifications'],
      patientsMeasured: patientsWithData,
      totalMeasurements: stats[0],
    },
  }
}

// ==================== WHO STANDARDS METHODS (CACHED) ====================

export async function getWHOStandards(input: GrowthStandardsInput) {
  'use cache'
  const { gender, chartType, ageMonthsMin, ageMonthsMax } = input
  const cacheKey = `who:${gender}:${chartType}:${ageMonthsMin || 'all'}:${ageMonthsMax || 'all'}`
  cacheTag(cacheKey, `who:standards:${gender}:${chartType}`)
  cacheLife(CACHE_PROFILES.medicalLong)

  return growthQueries.findWHOStandards({
    ageMonthsMax,
    ageMonthsMin,
    chartType,
    gender,
  })
}

export async function getWHOStandardsMap() {
  'use cache'
  cacheTag('who:standards:map')
  cacheLife(CACHE_PROFILES.medicalLong)

  const [
    maleWeight,
    femaleWeight,
    maleHeight,
    femaleHeight,
    maleHeadCircumference,
    femaleHeadCircumference,
  ] = await Promise.all([
    growthQueries.findWHOStandards({ chartType: 'WFA', gender: 'MALE' }),
    growthQueries.findWHOStandards({ chartType: 'WFA', gender: 'FEMALE' }),
    growthQueries.findWHOStandards({ chartType: 'HFA', gender: 'MALE' }),
    growthQueries.findWHOStandards({ chartType: 'HFA', gender: 'FEMALE' }),
    growthQueries.findWHOStandards({ chartType: 'HcFA', gender: 'MALE' }),
    growthQueries.findWHOStandards({ chartType: 'HcFA', gender: 'FEMALE' }),
  ])

  const map = new Map()
  map.set('MALE_Weight', maleWeight)
  map.set('FEMALE_Weight', femaleWeight)
  map.set('MALE_Height', maleHeight)
  map.set('FEMALE_Height', femaleHeight)
  map.set('MALE_HeadCircumference', maleHeadCircumference)
  map.set('FEMALE_HeadCircumference', femaleHeadCircumference)

  return map
}

// ==================== CALCULATION METHODS (CACHED) ====================

export async function calculatePercentile(input: GrowthPercentileInput) {
  'use cache'
  const { patientId, measurement } = input
  cacheTag(
    `percentile:calc:${patientId}:${measurement.type}:${measurement.ageMonths}`
  )
  cacheLife(CACHE_PROFILES.medicalShort)

  const patient = await growthQueries.checkPatientExists(patientId)
  if (!patient) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Patient not found',
    })
  }

  let chartType: ChartType
  switch (measurement.type) {
    case 'WFA':
      chartType = 'WFA'
      break
    case 'HFA':
      chartType = 'HFA'
      break
    case 'HcFA':
      chartType = 'HcFA'
      break
    default:
      throw new Error('Invalid measurement type')
  }

  const ageDays = measurement.ageMonths * 30.44

  const standard = await growthQueries.findClosestWHOStandard({
    ageDays,
    ageMonths: measurement.ageMonths,
    chartType,
    gender: patient.gender as Gender,
  })

  if (!standard) {
    return {
      classification: 'No standard available',
      percentile: null,
      standardAgeMonths: measurement.ageMonths,
      zScore: null,
    }
  }

  const zScore = calculateLMSZScore(
    measurement.value,
    Number(standard.lValue),
    Number(standard.mValue),
    Number(standard.sValue)
  )

  const percentile = zScoreToPercentile(zScore)
  const classification = getGrowthInterpretation(zScore)

  return {
    classification,
    percentile,
    standardAgeMonths:
      standard.ageInMonths || Math.floor((standard.ageDays || 0) / 30.44),
    standardValues: {
      median: standard.mValue,
      sd1neg: standard.sd1neg,
      sd1pos: standard.sd1pos,
      sd2neg: standard.sd2neg,
      sd2pos: standard.sd2pos,
      sd3neg: standard.sd3neg,
      sd3pos: standard.sd3pos,
    },
    zScore: Number(zScore.toFixed(3)),
  }
}

export async function getGrowthTrends(input: GrowthTrendsInput) {
  'use cache'
  const { patientId, chartType, timeRange, clinicId } = input
  const timeKey = timeRange?.startDate
    ? `:${timeRange.startDate.toISOString()}`
    : ''
  cacheTag(
    CACHE_TAGS.patient.growth(patientId),
    `trends:${patientId}:${chartType}${timeKey}`
  )
  cacheLife(CACHE_PROFILES.medicalMedium)

  await verifyPatientAccess(patientId, clinicId)

  const records = await growthQueries.findGrowthRecordsByPatient(patientId)

  const trends = records
    .filter(record => {
      if (timeRange) {
        if (timeRange.startDate && record.date < timeRange.startDate)
          return false
        if (timeRange.endDate && record.date > timeRange.endDate) return false
      }
      return true
    })
    .map(record => {
      let value: number | null = null
      let zScore: number | null = null

      switch (chartType) {
        case 'WFA':
          value = record.weight
          zScore = record.weightForAgeZ?.toNumber() ?? null
          break
        case 'HFA':
          value = record.height
          zScore = record.heightForAgeZ?.toNumber() ?? null
          break
        case 'HcFA':
          value = record.headCircumference?.toNumber() ?? null
          zScore = record.hcForAgeZ?.toNumber() ?? null
          break
        default:
          break
      }

      return {
        ageMonths: record.ageMonths,
        date: record.date,
        id: record.id,
        percentile: zScore ? zScoreToPercentile(zScore) : null,
        value,
        zScore,
      }
    })
    .filter(trend => trend.value !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  let velocity = null
  if (trends.length >= 2) {
    const first = trends[0]
    const last = trends.at(-1)

    if (first?.value && last?.value) {
      const daysDiff =
        (last.date.getTime() - first.date.getTime()) / (1000 * 60 * 60 * 24)
      const valueDiff = last.value - first.value

      velocity = {
        perDay: Number((valueDiff / daysDiff).toFixed(4)),
        perMonth: Number(((valueDiff / daysDiff) * 30.44).toFixed(4)),
        perYear: Number(((valueDiff / daysDiff) * 365.25).toFixed(4)),
      }
    }
  }

  return {
    summary: {
      currentPercentile: trends.at(-1)?.percentile || null,
      currentValue: trends.at(-1)?.value || null,
      firstDate: trends[0]?.date || null,
      lastDate: trends.at(-1)?.date || null,
      totalMeasurements: trends.length,
    },
    trends,
    velocity,
  }
}

export async function calculateVelocity(input: VelocityCalculationInput) {
  'use cache'
  const { patientId, clinicId, chartType, startDate, endDate } = input
  cacheTag(
    `velocity:${patientId}:${chartType}:${startDate.toISOString()}:${endDate.toISOString()}`
  )
  cacheLife(CACHE_PROFILES.medicalShort)

  await verifyPatientAccess(patientId, clinicId)

  const records = await growthQueries.findGrowthRecordsByPatient(patientId)

  const filtered = records
    .filter(r => {
      let value: number | null | undefined
      switch (chartType) {
        case 'WFA':
          value = r.weight
          break
        case 'HFA':
          value = r.height
          break
        case 'HcFA':
          value = r.headCircumference?.toNumber()
          break
        default:
          break
      }

      return (
        r.date >= startDate &&
        r.date <= endDate &&
        value !== null &&
        value !== undefined
      )
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  if (filtered.length < 2) return null

  const first = filtered[0]
  const last = filtered.at(-1)

  if (!(last && first)) return null

  const msDiff = last.date.getTime() - first.date.getTime()
  if (msDiff <= 0) return null

  const daysDiff = msDiff / (1000 * 60 * 60 * 24)

  const getVal = (r: typeof first) =>
    chartType === 'WFA'
      ? r.weight
      : chartType === 'HFA'
        ? r.height
        : r.headCircumference?.toNumber()

  const firstValue = Number(getVal(first) ?? 0)
  const lastValue = Number(getVal(last) ?? 0)
  const valueDiff = lastValue - firstValue

  return {
    ageChangeMonths: (last.ageMonths ?? 0) - (first.ageMonths ?? 0),
    daysBetween: Math.round(daysDiff),
    perDay: Number((valueDiff / daysDiff).toFixed(4)),
    perMonth: Number(((valueDiff / daysDiff) * 30.44).toFixed(4)),
    perWeek: Number(((valueDiff / daysDiff) * 7).toFixed(4)),
    perYear: Number(((valueDiff / daysDiff) * 365.25).toFixed(4)),
    totalChange: Number(valueDiff.toFixed(4)),
  }
}

export async function compareGrowth(input: GrowthComparisonInput) {
  'use cache'
  const { patientId, chartType, referenceAgeMonths, comparisonType, clinicId } =
    input
  cacheTag(
    `compare:${patientId}:${comparisonType}:${chartType || 'all'}:${referenceAgeMonths || 'none'}`
  )
  cacheLife(CACHE_PROFILES.medicalShort)

  await verifyPatientAccess(patientId, clinicId)

  const latestRecord =
    await growthQueries.findLatestGrowthRecordByPatient(patientId)

  if (!latestRecord) {
    return {
      comparison: 'No data available',
      details: null,
      status: 'unknown',
    }
  }

  const currentAgeMonths = latestRecord.ageMonths || 0

  switch (comparisonType) {
    case 'age': {
      const ageDifference = currentAgeMonths - referenceAgeMonths
      return {
        comparison: 'Age',
        details: {
          currentAgeMonths,
          differenceMonths: ageDifference,
          referenceAgeMonths,
        },
        status: ageDifference >= 0 ? 'ahead' : 'behind',
      }
    }

    case 'percentile': {
      let currentValue: number | null = null
      switch (chartType) {
        case 'WFA':
          currentValue = latestRecord.weight
          break
        case 'HFA':
          currentValue = latestRecord.height
          break
        case 'HcFA':
          currentValue = Number(latestRecord.headCircumference)
          break
        default:
          break
      }

      if (!(currentValue && latestRecord.gender)) {
        return {
          comparison: 'Percentile',
          details: null,
          status: 'no_data',
        }
      }

      const percentileResult = await calculatePercentile({
        date: new Date(),
        measurement: {
          ageMonths: currentAgeMonths,
          type: chartType,
          value: currentValue,
        },
        patientId,
      })

      return {
        comparison: 'Percentile',
        details: {
          classification: percentileResult.classification,
          currentPercentile: percentileResult.percentile,
          zScore: percentileResult.zScore,
        },
        status:
          percentileResult.classification?.toLowerCase().replace(/ /g, '_') ||
          'unknown',
      }
    }

    case 'velocity': {
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

      const velocity = await calculateVelocity({
        chartType,
        clinicId,
        endDate: new Date(),
        patientId,
        startDate: threeMonthsAgo,
      })

      if (!velocity) {
        return {
          comparison: 'Velocity',
          details: null,
          status: 'insufficient_data',
        }
      }

      let status = 'normal'
      if (chartType === 'WFA') {
        if (velocity.perMonth < 0.1) status = 'slow'
        else if (velocity.perMonth > 0.5) status = 'fast'
      } else if (chartType === 'HFA') {
        if (velocity.perMonth < 0.3) status = 'slow'
        else if (velocity.perMonth > 1.0) status = 'fast'
      }

      return {
        comparison: 'Velocity',
        details: {
          daysBetween: velocity.daysBetween,
          perMonth: velocity.perMonth,
          perYear: velocity.perYear,
          totalChange: velocity.totalChange,
        },
        status,
      }
    }

    default:
      return {
        comparison: 'Unknown',
        details: null,
        status: 'unknown',
      }
  }
}

export async function calculateMultipleZScores(
  measurements: Array<{
    ageDays: number
    weight: number
    gender: 'MALE' | 'FEMALE'
  }>
) {
  'use cache'
  const hash = measurements
    .map(m => `${m.gender}:${m.ageDays}:${m.weight}`)
    .join('|')
  cacheTag(`zscore:multiple:${hash}`)
  cacheLife(CACHE_PROFILES.medicalShort)

  const results = await Promise.all(
    measurements.map(m => calculateZScores(m.ageDays, m.weight, m.gender))
  )

  const validResults = results.filter(r => r.zScore !== null)

  return {
    results,
    statistics: {
      averagePercentile:
        validResults.length > 0
          ? Number(
            (
              validResults.reduce((sum, r) => sum + (r.percentile || 0), 0) /
              validResults.length
            ).toFixed(1)
          )
          : null,
      averageZScore:
        validResults.length > 0
          ? Number(
            (
              validResults.reduce((sum, r) => sum + (r.zScore || 0), 0) /
              validResults.length
            ).toFixed(3)
          )
          : null,
      classifications: validResults.reduce(
        (acc, r) => {
          acc[r.classification] = (acc[r.classification] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      ),
      total: results.length,
      valid: validResults.length,
    },
  }
}

export async function getGrowthProjection(
  patientId: string,
  clinicId: string,
  measurementType: string,
  projectionMonths = 12
) {
  'use cache'
  cacheTag(
    `projection:${patientId}:${measurementType}:${projectionMonths}`,
    CACHE_TAGS.patient.growth(patientId)
  )
  cacheLife(CACHE_PROFILES.medicalShort)

  await verifyPatientAccess(patientId, clinicId)

  const trends = await getGrowthTrends({
    chartType: measurementType as 'WFA' | 'HFA' | 'HcFA',
    clinicId,
    patientId,
    timeRange: {
      endDate: new Date(),
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    },
  })

  if (trends.trends.length < 2) {
    return {
      confidence: 'low',
      message: 'Insufficient data for projection',
      projections: [],
    }
  }

  const recent = trends.trends.slice(0, 3)
  const averageGrowth =
    recent.reduce((acc, curr, idx, arr) => {
      if (idx === 0) return 0
      const currValue = curr.value ?? 0
      const prevValue = arr[idx - 1]?.value ?? 0
      const currAge = curr.ageMonths ?? 0
      const prevAge = arr[idx - 1]?.ageMonths ?? 0
      const ageDiff = currAge - prevAge

      if (ageDiff === 0) return acc
      return acc + (currValue - prevValue) / ageDiff
    }, 0) / Math.max(recent.length - 1, 1)

  const lastMeasurement = recent[0]
  const projections = []

  for (let i = 1; i <= projectionMonths; i += 3) {
    const projectedAgeMonths = (lastMeasurement?.ageMonths || 0) + i
    const projectedValue = (lastMeasurement?.value || 0) + averageGrowth * i

    projections.push({
      ageMonths: projectedAgeMonths,
      confidence: Math.max(0.7 - i * 0.05, 0.3),
      projectedValue,
    })
  }

  return {
    averageMonthlyGrowth: averageGrowth,
    confidence: averageGrowth > 0 ? 'moderate' : 'low',
    currentAgeMonths: lastMeasurement?.ageMonths || 0,
    currentValue: lastMeasurement?.value || 0,
    projections,
  }
}

// ==================== CHART DATA METHODS (CACHED) ====================

export async function getZScoreChartData(
  gender: 'MALE' | 'FEMALE',
  chartType: 'WFA' | 'HFA' | 'HcFA' = 'WFA'
): Promise<ZScoreChartData> {
  'use cache'
  cacheTag(`chart:zscore:${gender}:${chartType}`)
  cacheLife(CACHE_PROFILES.medicalLong)

  const whoRecords = await growthQueries.findWHOStandards({
    chartType,
    gender,
  })

  if (!whoRecords.length) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `No WHO growth data found for ${gender} ${chartType}`,
    })
  }

  const points: LMSDataPoint[] = whoRecords.map(record => ({
    ageDays: record.ageDays,
    ageMonths: record.ageInMonths ?? 0,
    gender: record.gender,
    lValue: record.lValue ?? 0,
    mValue: record.mValue ?? 0,
    sd0: record.sd0 ?? 0,
    sd1neg: record.sd1neg ?? 0,
    sd1pos: record.sd1pos ?? 0,
    sd2neg: record.sd2neg ?? 0,
    sd2pos: record.sd2pos ?? 0,
    sd3neg: record.sd3neg ?? 0,
    sd3pos: record.sd3pos ?? 0,
    sd4neg: record.sd4neg ?? 0,
    sd4pos: record.sd4pos ?? 0,
    sValue: record.sValue ?? 0,
  }))

  const ageRange = {
    maxAgeDays: Math.max(...points.map(p => p.ageDays)),
    maxAgeMonths: Math.max(...points.map(p => p.ageMonths ?? 0)),
    minAgeDays: Math.min(...points.map(p => p.ageDays)),
    minAgeMonths: Math.min(...points.map(p => p.ageMonths ?? 0)),
  }

  return {
    ageRange,
    chartType,
    gender,
    metadata: {
      dataSource: 'WHO',
      lastUpdated: new Date(),
      totalPoints: points.length,
    },
    points,
  }
}

export async function getPatientZScoreChart(
  patientId: string,
  clinicId: string,
  chartType: 'WFA' | 'HFA' | 'HcFA' = 'WFA'
) {
  'use cache'
  cacheTag(
    `chart:patient:${patientId}:${chartType}`,
    CACHE_TAGS.patient.growth(patientId)
  )
  cacheLife(CACHE_PROFILES.medicalShort)

  await verifyPatientAccess(patientId, clinicId)

  const patient = await growthQueries.checkPatientExists(patientId)
  if (!patient) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Patient not found',
    })
  }

  const [chartData, measurements] = await Promise.all([
    getZScoreChartData(patient.gender as 'MALE' | 'FEMALE', chartType),
    growthQueries.findMeasurementsByPatient(patientId),
  ])

  const patientData: PatientZScoreData[] = measurements.map(m => {
    let zScore: number | null = 0
    if (chartType === 'WFA') zScore = m.weightForAgeZ?.toNumber() ?? null
    else if (chartType === 'HFA') zScore = m.heightForAgeZ?.toNumber() ?? 0
    else if (chartType === 'HcFA') zScore = m.hcForAgeZ?.toNumber() ?? 0

    return {
      ageDays: m.ageDays ?? 0,
      ageMonths: Math.floor((m.ageDays ?? 0) / 30.44),
      classification: m.classification ?? 'Unknown',
      date: m.date,
      height: m.height,
      percentile:
        zScore !== null
          ? (zScoreToPercentile(zScore) as unknown as number)
          : null,
      weight: m.weight,
      zScore,
    }
  })

  const combined = chartData.points.map(chartPoint => {
    const patientPoint = patientData.find(
      p => Math.abs(p.ageDays - chartPoint.ageDays) < 15
    )

    return {
      ageDays: chartPoint.ageDays,
      ageMonths: chartPoint.ageMonths,
      chart: chartPoint,
      patient: patientPoint,
    }
  })

  return {
    chartData,
    combined,
    patientData,
  }
}

export async function getZScoreAreas(
  gender: 'MALE' | 'FEMALE',
  chartType: 'WFA' | 'HFA' | 'HcFA' = 'WFA'
) {
  'use cache'
  cacheTag(`chart:areas:${gender}:${chartType}`)
  cacheLife(CACHE_PROFILES.medicalLong)

  const chartData = await getZScoreChartData(gender, chartType)

  const sdAreaDefinitions = [
    { color: '#ff4444', name: 'Severe Underweight', sdLevel: -3 },
    { color: '#ff8800', name: 'Moderate Underweight', sdLevel: -2 },
    { color: '#ffbb33', name: 'Mild Underweight', sdLevel: -1 },
    { color: '#00C851', name: 'Normal', sdLevel: 0 },
    { color: '#ffbb33', name: 'Mild Overweight', sdLevel: 1 },
    { color: '#ff8800', name: 'Moderate Overweight', sdLevel: 2 },
    { color: '#ff4444', name: 'Severe Overweight', sdLevel: 3 },
  ]

  const sdAreas = sdAreaDefinitions.map(def => {
    const data = chartData.points.map(point => {
      let lower: number
      let upper: number

      switch (def.sdLevel) {
        case -3:
          lower = point.sd4neg || point.sd3neg
          upper = point.sd3neg
          break
        case -2:
          lower = point.sd3neg
          upper = point.sd2neg
          break
        case -1:
          lower = point.sd2neg
          upper = point.sd1neg
          break
        case 0:
          lower = point.sd1neg
          upper = point.sd1pos
          break
        case 1:
          lower = point.sd1pos
          upper = point.sd2pos
          break
        case 2:
          lower = point.sd2pos
          upper = point.sd3pos
          break
        case 3:
          lower = point.sd3pos
          upper = point.sd4pos || point.sd3pos
          break
        default:
          lower = point.sd0
          upper = point.sd0
      }

      return {
        ageDays: point.ageDays,
        ageMonths: point.ageMonths,
        lower,
        upper,
      }
    })

    return {
      color: def.color,
      data,
      name: def.name,
      sdLevel: def.sdLevel,
    }
  })

  const median = chartData.points.map(point => ({
    ageDays: point.ageDays,
    ageMonths: point.ageMonths,
    value: point.sd0,
  }))

  return { median, sdAreas }
}

export interface ZScoreResult {
  ageDays: number
  ageMonths: number
  classification: string
  expectedWeight: {
    median: number | null
    range: {
      max: number | null
      min: number | null
    }
  }
  gender: 'MALE' | 'FEMALE'
  percentile: number | null
  weight: number
  zScore: number | null
  referenceValues?: {
    median: number
    sd2neg: number
    sd2pos: number
  }
}

export interface CreateGrowthRecordInput {
  patientId: string
  clinicId?: string
  date: Date
  weight?: number | null
  height?: number | null
  headCircumference?: number | null
  notes?: string | null
}

/**
 * Calculate Z-scores for a patient's growth measurements
 * Cached for 15 minutes since WHO standards don't change frequently
 */
export async function calculateZScores(
  ageDays: number,
  weight: number,
  gender: 'MALE' | 'FEMALE'
): Promise<ZScoreResult> {
  'use cache'
  cacheLife(CACHE_PROFILES.medicalShort)
  cacheTag(`zscore:${gender}:${Math.floor(ageDays / 30)}`) // Cache by month bucket

  const growthDataMap = await getWHOStandardsMap()

  // Calculate Z-score using the WHO standards
  const result = calculateZScore(
    growthDataMap,
    gender as 'MALE' | 'FEMALE',
    ageDays,
    weight
  )

  return {
    ageDays,
    ageMonths: Math.floor(ageDays / 30.44),
    classification: result.whoClassification,
    expectedWeight: {
      median: result.referenceValues?.median ?? null,
      range: {
        max: result.referenceValues?.sd2pos ?? null,
        min: result.referenceValues?.sd2neg ?? null,
      },
    },
    gender,
    percentile: result.percentile,
    weight,
    zScore: result.zScore,
    referenceValues: result.referenceValues,
  }
}
/**
 * Create a new growth record for a patient
 * Validates clinic access and calculates Z-scores automatically
 */
export async function createGrowthRecord(
  input: CreateGrowthRecordInput,
  userId: string
) {
  // Input validation
  if (!input.patientId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Patient ID is required',
    })
  }

  if (!input.date) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Measurement date is required',
    })
  }

  if (!input.weight && !input.height && !input.headCircumference) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message:
        'At least one measurement (weight, height, or head circumference) is required',
    })
  }

  // Verify clinic access if clinicId is provided
  if (input.clinicId) {
    await validateClinicAccess(input.clinicId, userId)
  }

  // Verify patient exists and belongs to clinic
  const patient = await growthQueries.getPatientWithClinic(input.patientId)

  if (!patient) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Patient not found',
    })
  }

  // If clinicId wasn't provided, use the patient's clinic
  const clinicId = input.clinicId || patient.clinicId

  // Verify patient belongs to the clinic
  if (patient.clinicId !== clinicId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Patient does not belong to this clinic',
    })
  }

  // Calculate age at measurement date
  const ageDays = getAgeInDays(patient.dateOfBirth, input.date)

  if (ageDays < 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Measurement date cannot be before birth date',
    })
  }

  const ageMonths = differenceInMonths(input.date, patient.dateOfBirth)

  // Get WHO standards map once for all calculations
  const growthDataMap = await getWHOStandardsMap()
  const gender = patient.gender as 'MALE' | 'FEMALE'

  // Calculate Z-scores for available measurements
  const [weightZScore, heightZScore, headCircumferenceZScore] =
    await Promise.all([
      input.weight
        ? calculateZScore(
          growthDataMap,
          gender as 'MALE' | 'FEMALE',
          ageDays,
          input.weight
        )
        : Promise.resolve(null),
      input.height
        ? calculateZScore(
          growthDataMap,
          gender as 'MALE' | 'FEMALE',
          ageDays,
          input.height
        )
        : Promise.resolve(null),
      input.headCircumference
        ? calculateZScore(
          growthDataMap,
          gender as 'MALE' | 'FEMALE',
          ageDays,
          input.headCircumference
        )
        : Promise.resolve(null),
    ])

  // Calculate BMI if both weight and height are available
  let bmi = null
  if (input.weight && input.height && input.height > 0) {
    const heightInMeters = input.height / 100
    bmi = Number((input.weight / (heightInMeters * heightInMeters)).toFixed(1))
  }

  // Create growth record
  const growthRecord = await growthQueries.createGrowthRecord({
    patient: { connect: { id: input.patientId } },
    clinic: { connect: { id: clinicId } },
    date: input.date,
    ageDays,
    ageMonths,
    weight: input.weight,
    height: input.height,
    headCircumference: input.headCircumference,
    bmi,
    weightForAgeZ: weightZScore?.zScore,
    heightForAgeZ: heightZScore?.zScore,
    hcForAgeZ: headCircumferenceZScore?.zScore,
    classification:
      weightZScore &&
        typeof weightZScore === 'object' &&
        'whoClassification' in weightZScore
        ? weightZScore.whoClassification
        : null,
    notes: input.notes,
    recordedAt: new Date(),
    recordedBy: { connect: { id: userId } },
  })

  // Invalidate cache tags
  await Promise.all([
    // Patient-specific caches
    cacheHelpers.patient.invalidateMedical(input.patientId, clinicId),
    cacheHelpers.patient.invalidateGrowth(input.patientId, clinicId),

    // Clinic-wide caches
    cacheHelpers.clinic.invalidateDashboard(clinicId),

    // Growth chart caches
    revalidateTag(`growth:patient:${input.patientId}`, 'max'),
    revalidateTag(`growth:clinic:${clinicId}`, 'max'),
  ])

  return growthRecord
}
export async function updateGrowthRecord(
  id: string,
  input: UpdateGrowthRecordInput,
  userId: string
) {
  const existing = await growthQueries.findGrowthRecordById(id)
  if (!existing) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Growth record not found',
    })
  }

  await validateClinicAccess(existing.clinicId ?? '', userId)

  const updated = await growthQueries.updateGrowthRecord(id, {
    ...input,
    headCircumference: input.headCircumference ?? undefined,
    notes: input.notes ?? undefined,
  })

  // Cache invalidation
  cacheHelpers.patient.invalidateMedical(
    existing.patientId,
    existing.clinicId ?? ''
  )
  cacheHelpers.admin.invalidateDashboard(existing.clinicId ?? '')

  return updated
}

export async function deleteGrowthRecord(id: string, userId: string) {
  const existing = await growthQueries.findGrowthRecordById(id)
  if (!existing) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Growth record not found',
    })
  }

  await validateClinicAccess(existing.clinicId ?? '', userId)

  await growthQueries.deleteGrowthRecord(id)

  // Cache invalidation
  cacheHelpers.patient.invalidateMedical(
    existing.patientId,
    existing.clinicId ?? ''
  )
  cacheHelpers.admin.invalidateDashboard(existing.clinicId ?? '')
}

// ==================== HELPER METHODS ====================

export async function verifyPatientAccess(patientId: string, clinicId: string) {
  const patient = await growthQueries.checkPatientExists(patientId)
  if (!patient) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Patient not found',
    })
  }
  if (patient.clinicId !== clinicId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Patient does not belong to clinic',
    })
  }
  return patient
}

export async function getPatientAgeService(
  patientId: string,
  dateOfBirth: Date
): Promise<AgeCalculation> {
  'use cache'
  cacheLife('hours') // Cache for hours, revalidate after 15 min
  cacheTag(`patient-${patientId}-age`)

  // Pure calculation - no I/O, just business logic
  return calculateAge(dateOfBirth) as unknown as AgeCalculation
}

/**
 * Batch age calculation service (also cached)
 */
export async function getPatientsAgeService(
  patients: Array<{ id: string; dateOfBirth: Date }>
): Promise<Map<string, AgeCalculation>> {
  'use cache'
  cacheLife('hours')

  // Create composite tag for all patients in this batch
  const patientIds = patients.map(p => p.id).join('-')
  cacheTag(`patients-${patientIds}-age`)

  const results = new Map()
  for (const patient of patients) {
    results.set(patient.id, calculateAge(patient.dateOfBirth))
  }
  return results
}
