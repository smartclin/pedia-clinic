import { z } from 'zod'

import { createTRPCRouter, protectedProcedure } from '../trpc'

const recentActivitySchema = z.object({
	clinicId: z.string(),
	limit: z.number().min(1).max(50).default(10),
})

// Define proper return types
type AppointmentWithRelations = {
	id: string
	createdAt: Date
	patient: {
		firstName: string
		lastName: string
	} | null
	doctor: {
		id: string
		name: string
		img: string
		workingDays: string[]
		colorCode: string
	} | null
}

type PatientWithRelations = {
	id: string
	firstName: string
	lastName: string
	createdAt: Date
	createdById: string | null
	user: {
		name: string
	} | null
}

type ImmunizationWithRelations = {
	id: string
	vaccine: string
	date: Date
	patient: {
		firstName: string
		lastName: string
	} | null
	administeredByStaffId: string | null
	administeredBy: {
		name: string
	} | null
}

type PrescriptionWithRelations = {
	id: string
	createdAt: Date
	doctorId: string | null
	patient: {
		firstName: string
		lastName: string
	} | null
	doctor: {
		name: string
		img: string
	} | null
}

type PaymentWithRelations = {
	id: string
	amountPaid: number | null
	createdAt: Date
	patient: {
		firstName: string
		lastName: string
	} | null
}

export const activityRouter = createTRPCRouter({
	/**
	 * Get recent activity feed for dashboard
	 */
	recent: protectedProcedure
		.input(recentActivitySchema)
		.query(async ({ ctx, input }) => {
			const { clinicId, limit } = input

			// Combine multiple activity sources
			const [appointments, patients, immunizations, prescriptions, payments] =
				await Promise.all([
					// Recent appointments - FIXED: Added id and doctorId to select
					// Recent appointments - FIXED: Added id and doctorId to select
					ctx.prisma.appointment.findMany({
						orderBy: { createdAt: 'desc' },
						select: {
							createdAt: true,
							doctor: {
								select: {
									colorCode: true,
									id: true,
									img: true,
									name: true,
									workingDays: true,
								},
							},
							doctorId: true,
							id: true,
							patient: {
								select: { firstName: true, lastName: true },
							},
						},
						take: Math.ceil(limit / 3),
						where: { clinicId, isDeleted: false },
					}) as unknown as Promise<AppointmentWithRelations[]>,

					// New patients - FIXED: Added missing fields
					ctx.prisma.patient.findMany({
						orderBy: { createdAt: 'desc' },
						select: {
							createdAt: true,
							createdById: true,
							firstName: true,
							id: true,
							lastName: true,
							user: {
								select: { name: true },
							},
						},
						take: Math.ceil(limit / 3),
						where: { clinicId, isDeleted: false },
					}) as Promise<PatientWithRelations[]>,

					// Recent immunizations - FIXED: Added missing fields
					ctx.prisma.immunization.findMany({
						orderBy: { date: 'desc' },
						select: {
							administeredBy: {
								select: { name: true },
							},
							administeredByStaffId: true,
							date: true,
							id: true,
							patient: {
								select: { firstName: true, lastName: true },
							},
							vaccine: true,
						},
						take: Math.ceil(limit / 3),
						where: {
							isDeleted: false,
							patient: { clinicId },
						},
					}) as Promise<ImmunizationWithRelations[]>,

					// Recent prescriptions - FIXED: Use select instead of include for consistency
					// Recent prescriptions - FIXED: Use select instead of include for consistency
					ctx.prisma.prescription.findMany({
						orderBy: { createdAt: 'desc' },
						select: {
							createdAt: true,
							doctor: {
								select: { name: true },
							},
							doctorId: true,
							id: true,
							patient: {
								select: { firstName: true, lastName: true },
							},
						},
						take: Math.ceil(limit / 3),
						where: {
							clinicId,
						},
					}) as unknown as Promise<PrescriptionWithRelations[]>,

					// Recent payments - FIXED: Added missing fields
					ctx.prisma.payment.findMany({
						orderBy: { createdAt: 'desc' },
						select: {
							amountPaid: true,
							createdAt: true,
							id: true,
							patient: {
								select: { firstName: true, lastName: true },
							},
						},
						take: Math.ceil(limit / 3),
						where: {
							clinicId,
							isDeleted: false,
						},
					}) as Promise<PaymentWithRelations[]>,
				])

			// Transform and combine activities - FIXED: No non-null assertions, safe access with fallbacks
			const activities = [
				...appointments.map(apt => ({
					createdAt: apt.createdAt,
					description: apt.patient
						? `${apt.patient.firstName} ${apt.patient.lastName}${apt.doctor ? ` with Dr. ${apt.doctor.name}` : ''}`
						: 'Appointment scheduled',
					id: `apt-${apt.id}`,
					link: `/dashboard/appointments/${apt.id}`,
					title: 'Appointment Scheduled',
					type: 'APPOINTMENT' as const,
					userId: apt.doctor?.id || null,
					userImage: apt.doctor?.img || null,
					userName: apt.doctor?.name || null,
				})),

				...patients.map(patient => ({
					createdAt: patient.createdAt,
					description: `${patient.firstName} ${patient.lastName}`,
					id: `pat-${patient.id}`,
					link: `/dashboard/patients/${patient.id}`,
					title: 'New Patient Registered',
					type: 'PATIENT' as const,
					userId: patient.createdById || null,
					userImage: null,
					userName: patient.user?.name || null,
				})),

				...immunizations.map(imm => ({
					createdAt: imm.date,
					description: imm.patient
						? `${imm.vaccine || 'Vaccine'} - ${imm.patient.firstName} ${imm.patient.lastName}`
						: `${imm.vaccine || 'Vaccine'} administered`,
					id: `imm-${imm.id}`,
					link: `/dashboard/immunizations/${imm.id}`,
					title: 'Immunization Administered',
					type: 'IMMUNIZATION' as const,
					userId: imm.administeredByStaffId || null,
					userImage: null,
					userName: imm.administeredBy?.name || null,
				})),

				...prescriptions.map(rx => ({
					createdAt: rx.createdAt,
					description: rx.patient
						? `For ${rx.patient.firstName} ${rx.patient.lastName}`
						: 'Prescription issued',
					id: `rx-${rx.id}`,
					link: `/dashboard/prescriptions/${rx.id}`,
					title: 'Prescription Issued',
					type: 'PRESCRIPTION' as const,
					userId: rx.doctorId || null,
					userImage: rx.doctor?.img || null,
					userName: rx.doctor?.name || null,
				})),

				...payments.map(payment => {
					const amount = payment.amountPaid
						? `$${Number(payment.amountPaid).toFixed(2)}`
						: 'Payment'

					return {
						createdAt: payment.createdAt,
						description: payment.patient
							? `${amount} from ${payment.patient.firstName} ${payment.patient.lastName}`
							: `${amount} received`,
						id: `pay-${payment.id}`,
						link: `/dashboard/billing/payments/${payment.id}`,
						title: 'Payment Received',
						type: 'PAYMENT' as const,
						userId: null,
						userImage: null,
						userName: null,
					}
				}),
			]

			// Sort by date (newest first) and limit
			return activities
				.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
				.slice(0, limit)
		}),
})

// Export type for use in components
export type ActivityItem = Awaited<
	ReturnType<typeof activityRouter.recent>
>[number]
