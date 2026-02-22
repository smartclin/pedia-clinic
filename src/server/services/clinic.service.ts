'use cache'

import { TRPCError } from '@trpc/server'
import { cacheLife, cacheTag } from 'next/cache'

import type { ClinicCreateInput } from '@/schemas/clinic.schema'

import { clinicQueries } from '../db/queries'

export async function getClinicById(id: string) {
	'use cache'
	cacheTag(`clinic:${id}`)
	cacheLife('hours')

	const clinic = await clinicQueries.findById(id)
	if (!clinic) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'Clinic not found',
		})
	}
	return clinic
}

export async function getClinicWithUserAccess(
	clinicId: string,
	userId: string
) {
	'use cache'
	cacheTag(
		`clinic:${clinicId}:member:${userId}`,
		`clinic:${clinicId}`,
		`user:${userId}`
	)
	cacheLife('minutes')

	const access = await clinicQueries.findClinicWithUserAccess(clinicId, userId)
	if (!access) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'Clinic not found or access denied',
		})
	}
	return access
}

export async function getClinicWorkingHours(clinicId: string) {
	'use cache'
	cacheTag(`clinic:${clinicId}:hours`)
	cacheLife('hours')

	return clinicQueries.findClinicHoursById(clinicId)
}

export async function getFeatures() {
	'use cache'
	cacheTag('features:all')
	cacheLife('days')

	return clinicQueries.getFeatures()
}

export async function getClinicStats() {
	'use cache'
	cacheTag('clinic:stats:global')
	cacheLife('hours')

	const [specialists, patients, appointments, satisfaction] =
		await clinicQueries.getClinicStats()

	return {
		appointments: appointments.toLocaleString(),
		patients: patients.toLocaleString(),
		satisfaction: Math.round((satisfaction._avg.rating || 4.5) * 20),
		specialists,
	}
}

export async function countUserClinics(userId: string) {
	'use cache'
	cacheTag(`user:${userId}:clinics:count`)
	cacheLife('minutes')

	return clinicQueries.countUserClinics(userId)
}

// ==================== MUTATIONS (NO CACHE) ====================

export async function createClinic(data: ClinicCreateInput, userId: string) {
	// Business rules
	if (!userId) {
		throw new TRPCError({
			code: 'UNAUTHORIZED',
			message: 'User must be authenticated',
		})
	}

	// Check limits
	const userClinicCount = await clinicQueries.countUserClinics(userId)
	if (userClinicCount >= 10) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'Maximum number of clinics reached (10)',
		})
	}

	// Validate clinic name
	if (!data.name || data.name.trim().length < 2) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'Clinic name must be at least 2 characters',
		})
	}

	// Create clinic via query layer
	const clinic = await clinicQueries.createClinic({
		name: data.name.trim(),
	})

	// Create clinic member association
	await clinicQueries.createClinicMember({
		clinicId: clinic.id,
		roleId: 'OWNER', // TODO: Get actual role ID
		userId,
	})

	return { clinic }
}

export async function createReview(input: {
	clinicId: string
	patientId: string
	staffId: string
	rating: number
	comment: string
}) {
	// Business rules
	if (input.rating < 1 || input.rating > 5) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'Rating must be between 1 and 5',
		})
	}

	if (!input.comment || input.comment.trim().length < 3) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'Comment must be at least 3 characters',
		})
	}

	// Create review via query layer
	return clinicQueries.createRating(input)
}

export async function getPersonalizedGreeting(userPrefs?: {
	lastVisit?: string
	childName?: string
}) {
	const now = new Date()
	const hour = now.getHours()

	let message = 'Welcome to Smart Pediatric Clinic'

	if (userPrefs?.lastVisit) {
		const lastVisit = new Date(userPrefs.lastVisit)
		const daysSince = Math.floor(
			(now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24)
		)
		message =
			daysSince < 7
				? 'Welcome back! We missed you.'
				: 'Welcome back! We hope your child is doing well.'
	}

	if (hour < 12) message += ' Good morning!'
	else if (hour < 17) message += ' Good afternoon!'
	else message += ' Good evening!'

	return {
		childName: userPrefs?.childName || null,
		message,
	}
}

export async function getDashboardStats(
	clinicId: string,
	from: Date,
	to: Date
) {
	'use cache'
	cacheTag(
		`clinic:${clinicId}:dashboard`,
		`appointments:range:${from.toISOString()}:${to.toISOString()}`
	)
	cacheLife('minutes')

	const [
		totalRevenueAgg,
		appointmentsCount,
		patientsCount,
		doctorsCount,
		topDoctorsRaw,
		todayAppointmentsList,
		dailyAppointmentsGroups,
		servicesCount,
	] = await clinicQueries.getDashboardStats(clinicId, from, to)

	// Transform appointments for today
	const todayAppointments = todayAppointmentsList.map(apt => ({
		doctor: apt.doctor,
		id: apt.id,
		patient: apt.patient,
		status: apt.status,
		time: apt.appointmentDate,
	}))

	// Process appointment counts by status
	const appointmentCounts = {
		cancelled: todayAppointmentsList.filter(a => a.status === 'CANCELLED')
			.length,
		completed: todayAppointmentsList.filter(a => a.status === 'COMPLETED')
			.length,
		pending: todayAppointmentsList.filter(a => a.status === 'PENDING').length,
		scheduled: todayAppointmentsList.filter(a => a.status === 'SCHEDULED')
			.length,
	}

	// Process monthly data
	const monthlyMap = new Map<
		string,
		{ appointments: number; completed: number }
	>()

	for (const apt of todayAppointmentsList) {
		const month = new Date(apt.appointmentDate).toLocaleString('default', {
			month: 'short',
		})
		const current = monthlyMap.get(month) || {
			appointments: 0,
			completed: 0,
		}
		monthlyMap.set(month, {
			appointments: current.appointments + 1,
			completed: current.completed + (apt.status === 'COMPLETED' ? 1 : 0),
		})
	}

	const monthlyData = Array.from(monthlyMap.entries()).map(([name, data]) => ({
		appointment: data.appointments,
		completed: data.completed,
		name,
	}))

	// Get specialty stats
	const { groupedByDoctor, doctors } = await clinicQueries.getSpecialtyStats(
		clinicId,
		from,
		to
	)

	const specialtyMap = new Map<string, number>()
	for (const g of groupedByDoctor) {
		const doc = doctors.find(d => d.id === g.doctorId)
		const specialty = doc?.specialty ?? 'General'
		const count =
			typeof g._count === 'object' && g._count !== null
				? ((g._count as Record<string, number>)._all ?? 0)
				: 0

		specialtyMap.set(specialty, (specialtyMap.get(specialty) || 0) + count)
	}

	const topSpecialties = Array.from(specialtyMap.entries())
		.map(([specialty, count]) => ({ count, specialty }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 10)

	// Map top doctors with ratings
	const topDoctors = topDoctorsRaw.map(d => ({
		appointments: d._count?.appointments ?? 0,
		id: d.id,
		img: d.img,
		name: d.name,
		rating: d.ratings?.[0]?.rating ?? 0,
		specialty: d.specialty || 'General',
	}))

	// Process daily appointments data
	const dailyAppointmentsData = dailyAppointmentsGroups.map(d => ({
		appointmentDate: d.appointmentDate,
		appointments:
			typeof d._count === 'object' && d._count !== null
				? ((d._count as Record<string, number>)._all ?? 0)
				: 0,
		revenue: d._sum?.appointmentPrice?.toNumber() ?? 0,
	}))

	return {
		appointmentCounts,
		availableDoctors: todayAppointmentsList.length,
		dailyAppointmentsData,
		last5Records: todayAppointmentsList.slice(0, 5).map(a => a.id),
		monthlyData,
		services: servicesCount,
		todayAppointments: todayAppointmentsList.length,
		todayAppointmentsList: todayAppointments,
		topDoctors,
		topSpecialties,
		totalAppointments: appointmentsCount,
		totalDoctors: doctorsCount,
		totalPatient: patientsCount,
		totalRevenue: totalRevenueAgg._sum?.appointmentPrice?.toNumber() ?? 0,
	}
}

export async function getGeneralStats() {
	'use cache'
	cacheTag('clinic:stats:global')
	cacheLife('hours')

	const [patients, doctors, appointments, completed] =
		await clinicQueries.getGeneralStats()

	return {
		completedAppointments: completed,
		completionRate:
			appointments > 0 ? Math.round((completed / appointments) * 100) : 0,
		totalAppointments: appointments,
		totalDoctors: doctors,
		totalPatients: patients,
	}
}

export async function getMedicalRecordsSummary(clinicId: string) {
	'use cache'
	cacheTag(`clinic:${clinicId}:medical:summary`)
	cacheLife('minutes')

	const [totalRecords, currentMonthCount, previousMonthCount, recentRecords] =
		await clinicQueries.getMedicalRecordsSummary(clinicId)

	const growth =
		previousMonthCount > 0
			? ((currentMonthCount - previousMonthCount) / previousMonthCount) * 100
			: currentMonthCount > 0
				? 100
				: 0

	return {
		currentMonthCount,
		growth: Math.round(growth * 10) / 10,
		previousMonthCount,
		recentRecords,
		totalRecords,
	}
}

export async function getRecentAppointments(clinicId: string) {
	'use cache'
	cacheTag(`appointments:recent:${clinicId}`)
	cacheLife('seconds')

	return clinicQueries.getRecentAppointments(clinicId)
}

export async function getTodaySchedule(clinicId: string) {
	'use cache'
	cacheTag(`schedule:today:${clinicId}`)
	cacheLife('seconds')

	const doctors = await clinicQueries.getTodaySchedule(clinicId)
	const today = new Date().toLocaleString('en-US', { weekday: 'long' })

	return doctors.map(d => ({
		appointments:
			d.appointments?.map(apt => ({
				id: apt.id,
				patient: apt.patient,
				status: apt.status,
				time: apt.appointmentDate,
			})) ?? [],
		colorCode: d.colorCode,
		id: d.id,
		img: d.img,
		isAvailable: d.workingDays?.some(w => w.day === today) ?? false,
		name: d.name,
		specialty: d.specialty,
	}))
}

export async function getUpcomingImmunizations(clinicId: string) {
	'use cache'
	cacheTag(`immunizations:upcoming:${clinicId}`)
	cacheLife('hours')

	return clinicQueries.getUpcomingImmunizations(clinicId)
}

export async function getMonthlyPerformance(clinicId: string) {
	'use cache'
	cacheTag(`clinic:${clinicId}:performance:monthly`)
	cacheLife('hours')

	const data = await clinicQueries.getMonthlyPerformance(clinicId)
	const months = [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'May',
		'Jun',
		'Jul',
		'Aug',
		'Sep',
		'Oct',
		'Nov',
		'Dec',
	]

	return months.map((month, i) => {
		const match = data.find(d => d.month === i + 1)
		return {
			month,
			revenue: Number(match?.revenue ?? 0),
			visits: Number(match?.visits ?? 0),
		}
	})
}
