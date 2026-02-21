// src/server/db/queries/payment.query.ts

import type { AppointmentStatus, Prisma } from '@/prisma/browser'
import { db } from '@/server/db'

import { dedupeQuery } from '../../../lib/cache/dedupe'

/**
 * 🔵 PURE QUERY LAYER
 * - NO business logic
 * - NO cache directives
 * - RAW Prisma only
 */
export const paymentQueries = {
	findByPatient: dedupeQuery(async (patientId: string) => {
		return db.payment.findMany({
			include: {
				patient: {
					select: {
						colorCode: true,
						dateOfBirth: true,
						firstName: true,
						gender: true,
						image: true,
						lastName: true,
					},
				},
				bills: {
					include: {
						service: true,
					},
				},
			},
			orderBy: { createdAt: 'desc' },
			where: { patientId, isDeleted: false },
		})
	}),

	findPaginated: dedupeQuery(
		async ({
			where,
			skip,
			take,
		}: {
			where: Prisma.PaymentWhereInput
			skip: number
			take: number
		}) => {
			return Promise.all([
				db.payment.findMany({
					include: {
						patient: {
							select: {
								colorCode: true,
								dateOfBirth: true,
								firstName: true,
								gender: true,
								image: true,
								lastName: true,
							},
						},
						bills: {
							include: {
								service: true,
							},
						},
					},
					orderBy: { createdAt: 'desc' },
					skip,
					take,
					where,
				}),
				db.payment.count({ where }),
			])
		}
	),

	findRecent: dedupeQuery(
		async ({
			where,
			skip,
			take,
		}: {
			where: Prisma.PaymentWhereInput
			skip: number
			take: number
		}) => {
			return Promise.all([
				db.payment.findMany({
					include: {
						patient: {
							select: {
								colorCode: true,
								dateOfBirth: true,
								firstName: true,
								gender: true,
								image: true,
								lastName: true,
							},
						},
					},
					orderBy: { createdAt: 'desc' },
					skip,
					take,
					where,
				}),
				db.payment.count({ where }),
			])
		}
	),

	findById: dedupeQuery(async (id: string) => {
		return db.payment.findUnique({
			include: {
				bills: {
					include: {
						service: true,
					},
				},
				patient: true,
			},
			where: { id, isDeleted: false },
		})
	}),

	getStats: dedupeQuery(async (clinicId: string) => {
		return Promise.all([
			db.payment.aggregate({
				_sum: { amountPaid: true },
				where: { clinicId, status: 'PAID', isDeleted: false },
			}),
			db.payment.aggregate({
				_sum: { totalAmount: true },
				where: { clinicId, status: 'UNPAID', isDeleted: false },
			}),
			db.payment.count({
				where: { clinicId, status: 'PAID', isDeleted: false },
			}),
			db.payment.count({
				where: { clinicId, status: 'UNPAID', isDeleted: false },
			}),
			db.payment.groupBy({
				by: ['paymentDate'],
				_sum: { amountPaid: true },
				where: {
					clinicId,
					status: 'PAID',
					paymentDate: {
						gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
					},
				},
			}),
		])
	}),

	findAppointmentWithBills: dedupeQuery(async (appointmentId: string) => {
		return db.appointment.findUnique({
			include: {
				bills: true,
			},
			where: { id: appointmentId, isDeleted: false },
		})
	}),

	create: dedupeQuery(async (data: Prisma.PaymentCreateInput) => {
		return db.payment.create({ data })
	}),

	update: dedupeQuery(async (id: string, data: Prisma.PaymentUpdateInput) => {
		return db.payment.update({
			data,
			where: { id },
		})
	}),

	createPatientBill: dedupeQuery(
		async (data: Prisma.PatientBillCreateInput) => {
			return db.patientBill.create({ data })
		}
	),

	updateAppointmentStatus: dedupeQuery(
		async (id: string, status: AppointmentStatus) => {
			return db.appointment.update({
				data: { status },
				where: { id },
			})
		}
	),

	checkPatientExists: dedupeQuery(
		async (patientId: string, clinicId: string) => {
			return db.patient.findFirst({
				where: {
					id: patientId,
					clinicId,
					isDeleted: false,
				},
			})
		}
	),
}
