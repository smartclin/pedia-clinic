import {
	endOfMonth,
	format,
	getMonth,
	isBefore,
	isSameDay,
	parseISO,
	setHours,
	setMinutes,
	setSeconds,
	startOfYear,
} from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { ApiError } from 'next/dist/server/api-utils'

import { appointmentQueries, doctorQueries } from '@/server/db/queries'

import type { AppointmentStatus } from '../types/prisma-types'
import { generateTimeSlots } from './time'

const DEFAULT_TIMEZONE = 'Africa/Cairo'

interface Appointment {
	appointmentDate: Date
	status: AppointmentStatus | null
}

function isValidStatus(status: string): status is AppointmentStatus {
	return ['CANCELLED', 'COMPLETED', 'NO_SHOW', 'PENDING', 'SCHEDULED'].includes(
		status
	)
}

const initializeMonthlyData = () => {
	const currentYear = new Date().getFullYear()
	const currentMonthIndex = getMonth(new Date())

	return Array.from({ length: currentMonthIndex + 1 }, (_, index) => ({
		appointment: 0,
		completed: 0,
		name: format(new Date(currentYear, index), 'MMM'),
	}))
}

export const processAppointments = (appointments: Appointment[]) => {
	const monthlyData = initializeMonthlyData()
	const appointmentCounts: Record<AppointmentStatus, number> = {
		CANCELLED: 0,
		COMPLETED: 0,
		NO_SHOW: 0,
		PENDING: 0,
		SCHEDULED: 0,
	}

	const currentYearStart = startOfYear(new Date())
	const currentMonthEnd = endOfMonth(new Date())

	for (const appointment of appointments) {
		const { status, appointmentDate } = appointment

		// Aggregate counts for appointments within the current year and up to the current month
		if (
			appointmentDate >= currentYearStart &&
			appointmentDate <= currentMonthEnd
		) {
			const monthIndex = getMonth(appointmentDate)
			const monthData = monthlyData[monthIndex]
			if (monthData) {
				monthData.appointment += 1
				if (status === 'COMPLETED') {
					monthData.completed += 1
				}
			}
		}

		// Aggregate counts for all appointments by status
		if (status && isValidStatus(status)) {
			appointmentCounts[status] += 1
		}
	}

	return { appointmentCounts, monthlyData }
}

export async function getDoctorAvailableTimes(
	doctorId: string,
	dateStr: string
) {
	const doctor = await doctorQueries.findById(doctorId)

	if (!doctor) {
		throw new ApiError(404, 'DOCTOR_NOT_FOUND')
	}
	// Ensure all required doctor fields are not null
	if (
		doctor.availableToWeekDay == null ||
		!doctor.availableFromTime ||
		!doctor.availableToTime
	) {
		return []
	}

	const date = parseISO(dateStr)
	const dayOfWeek = date.getDay()

	const doctorIsAvailable =
		dayOfWeek >= (doctor.availableFromWeekDay ?? 0) &&
		dayOfWeek <= doctor.availableToWeekDay

	if (!doctorIsAvailable) {
		return []
	}

	const appointments = await appointmentQueries.findByDoctor(doctorId)
	const appointmentsOnDate = appointments
		.filter((a: { appointmentDate: Date }) =>
			isSameDay(new Date(a.appointmentDate), date)
		)
		.map((a: { appointmentDate: Date }) =>
			format(
				toZonedTime(new Date(a.appointmentDate), DEFAULT_TIMEZONE),
				'HH:mm:ss'
			)
		)

	const slots = generateTimeSlots()

	const [fromHour, fromMinute] = doctor.availableFromTime.split(':').map(Number)

	const doctorFrom = setSeconds(
		setMinutes(setHours(date, fromHour ?? 0), fromMinute ?? 0),
		0
	)

	const doctorTo = setSeconds(
		setMinutes(
			setHours(date, Number(doctor.availableToTime.split(':')[0])),
			Number(doctor.availableToTime.split(':')[1])
		),
		0
	)

	const now = toZonedTime(new Date(), DEFAULT_TIMEZONE)
	const todayStr = format(now, 'yyyy-MM-dd')

	return slots
		.map(time => {
			const [hStr, mStr] = time.split(':')
			const h = hStr ? Number(hStr) : 0
			const m = mStr ? Number(mStr) : 0

			const slotTime = setSeconds(setMinutes(setHours(date, h), m), 0)

			let available =
				slotTime >= doctorFrom &&
				slotTime <= doctorTo &&
				!appointmentsOnDate.includes(format(slotTime, 'HH:mm:ss'))

			if (format(date, 'yyyy-MM-dd') === todayStr && isBefore(slotTime, now)) {
				available = false
			}

			return { available, label: time.slice(0, 5), value: time }
		})
		.filter(Boolean)
}

// =========== HELPER FUNCTIONS ===========
export interface VitalSignsCalculationInput {
	systolic?: number | string | null
	diastolic?: number | string | null
	heartRate?: number | string | null
	temperature?: number | string | null
	recordedAt?: Date | null
	createdAt?: Date | null
}
export function processVitalSignsData(data: VitalSignsCalculationInput[]) {
	if (!data.length) {
		return {
			average: '0/0',
			data: [],
			heartRateData: [],
			summary: {
				hasAbnormalValues: false,
				lastRecorded: null,
				totalReadings: 0,
			},
			temperatureData: [],
		}
	}

	interface VitalAccumulator {
		sys: number
		dia: number
		heartRate: number
		temperature: number
	}

	const averages = data.reduce<VitalAccumulator>(
		(acc, curr) => {
			// 2. Convert to Number immediately to fix "string | number" operator errors
			const sys = Number(curr.systolic) || 120
			const dia = Number(curr.diastolic) || 80
			const hr = Number(curr.heartRate) || 72
			const temp = Number(curr.temperature) || 36.6

			return {
				dia: acc.dia + dia,
				heartRate: acc.heartRate + hr,
				sys: acc.sys + sys,
				temperature: acc.temperature + temp,
			}
		},
		// 3. Initial value matches VitalAccumulator
		{ dia: 0, heartRate: 0, sys: 0, temperature: 0 }
	)

	const hasAbnormalValues = data.some(v => {
		// FIX: Convert to Number before comparison to avoid "string > number" errors
		const sys = Number(v.systolic)
		const dia = Number(v.diastolic)
		const hr = Number(v.heartRate)
		const temp = Number(v.temperature)

		return (
			(sys && (sys > 140 || sys < 90)) ||
			(dia && (dia > 90 || dia < 60)) ||
			(hr && (hr > 100 || hr < 60)) ||
			(temp && (temp > 38 || temp < 35))
		)
	})

	return {
		average: `${(averages.sys / data.length).toFixed(1)}/${(averages.dia / data.length).toFixed(1)}`,
		data: data.map(v => {
			// FIX: format() needs a Date. Fallback to now if both are null/undefined.
			const date = v.recordedAt || v.createdAt || new Date()
			return {
				diastolic: v.diastolic,
				label: format(date, 'MMM d'),
				systolic: v.systolic,
				timestamp: date,
			}
		}),
		heartRateData: data.map(v => {
			const date = v.recordedAt || v.createdAt || new Date()
			return {
				heartRate: v.heartRate,
				label: format(date, 'MMM d HH:mm'),
				timestamp: date,
			}
		}),
		summary: {
			averageHeartRate: (averages.heartRate / data.length).toFixed(1),
			averageTemperature: (averages.temperature / data.length).toFixed(1),
			hasAbnormalValues,
			lastRecorded: data[0]?.recordedAt || data[0]?.createdAt || null,
			totalReadings: data.length,
		},
		temperatureData: data.map(v => {
			const date = v.recordedAt || v.createdAt || new Date()
			return {
				label: format(date, 'MMM d HH:mm'),
				temperature: v.temperature,
				timestamp: date,
			}
		}),
	}
}
