import { z } from 'zod'

import { createTRPCRouter, protectedProcedure } from '../trpc'

const globalSearchSchema = z.object({
	limit: z.number().min(1).max(20).default(10),
	query: z.string().min(2),
})

export const searchRouter = createTRPCRouter({
	/**
	 * Global search across patients, appointments, etc.
	 */
	global: protectedProcedure
		.input(globalSearchSchema)
		.query(async ({ ctx, input }) => {
			const { query, limit } = input
			const clinicId = ctx.headers?.get('x-clinic-id')

			if (!clinicId) {
				return { appointments: [], patients: [] }
			}

			// Search patients
			const patients = await ctx.prisma.patient.findMany({
				select: {
					dateOfBirth: true,
					email: true,
					firstName: true,
					id: true,
					lastName: true,
					phone: true,
				},
				take: limit,
				where: {
					clinicId,
					isDeleted: false,
					OR: [
						{ firstName: { contains: query, mode: 'insensitive' } },
						{ lastName: { contains: query, mode: 'insensitive' } },
						{ email: { contains: query, mode: 'insensitive' } },
						{ phone: { contains: query } },
					],
				},
			})

			// Search appointments
			const appointments = await ctx.prisma.appointment.findMany({
				select: {
					appointmentDate: true,
					id: true,
					patient: {
						select: {
							firstName: true,
							lastName: true,
						},
					},
				},
				take: limit,
				where: {
					clinicId,
					isDeleted: false,
					patient: {
						OR: [
							{ firstName: { contains: query, mode: 'insensitive' } },
							{ lastName: { contains: query, mode: 'insensitive' } },
						],
					},
				},
			})

			return {
				appointments: appointments.map(
					(a: {
						id: string
						appointmentDate: Date
						patient: { firstName: string; lastName: string }
					}) => ({
						date: a.appointmentDate,
						id: a.id,
						patientName: a.patient
							? `${a.patient.firstName} ${a.patient.lastName}`
							: 'Unknown',
					})
				),
				patients: patients.map(
					(p: { firstName: string; lastName: string }) => ({
						...p,
						fullName: `${p.firstName} ${p.lastName}`,
					})
				),
			}
		}),
})
