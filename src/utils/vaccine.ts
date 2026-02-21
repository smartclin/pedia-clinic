import { db } from '@/db/index'

import { toNumber } from './decimal'

// Helper functions
export async function calculateImmunizationsDue(
	clinicId: string
): Promise<number> {
	const patients = await db.patient.findMany({
		select: { dateOfBirth: true, id: true },
		where: { clinicId, isDeleted: false },
	})

	const schedule = await db.vaccineSchedule.findMany()
	let dueCount = 0

	for (const patient of patients) {
		const ageDays = Math.floor(
			(Date.now() - new Date(patient.dateOfBirth).getTime()) /
				(1000 * 60 * 60 * 24)
		)

		// const _immunizations = await prisma.immunization.count({
		//   where: { patientId: patient.id }
		// });

		for (const vaccine of schedule) {
			if (vaccine.ageInDaysMin && ageDays >= vaccine.ageInDaysMin) {
				dueCount++
			}
		}
	}

	return dueCount
}

export async function calculateImmunizationsCompleted(
	clinicId: string,
	startDate: Date,
	endDate: Date
): Promise<number> {
	const patients = await db.patient.findMany({
		select: { id: true },
		where: { clinicId, isDeleted: false },
	})

	return db.immunization.count({
		where: {
			date: { gte: startDate, lt: endDate },
			patientId: { in: patients.map((p: { id: string }) => p.id) },
		},
	})
}

export async function calculateGrowthChecksPending(
	clinicId: string
): Promise<number> {
	const thirtyDaysAgo = new Date()
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

	const patients = await db.patient.count({
		where: {
			clinicId,
			isDeleted: false,
			OR: [
				{ growthRecords: { none: {} } },
				{
					growthRecords: {
						every: { date: { lt: thirtyDaysAgo } },
					},
				},
			],
		},
	})

	return patients
}

export async function calculateMonthlyRevenue(
	clinicId: string,
	startDate: Date,
	endDate?: Date
): Promise<number> {
	const payments = await db.payment.aggregate({
		_sum: {
			amountPaid: true,
		},
		where: {
			clinicId,
			isDeleted: false,
			paymentDate: endDate
				? { gte: startDate, lt: endDate }
				: { gte: startDate },
			status: 'PAID',
		},
	})

	return toNumber(payments._sum.amountPaid) || 0
}
