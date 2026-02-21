'use cache' // File-level caching for all exported functions

import { TRPCError } from '@trpc/server'
import { cacheLife, cacheTag } from 'next/cache'

import type { Prisma } from '@/prisma/browser'
import type { AddNewBillInput, PaymentInput } from '@/schemas/index'
import type { Payment } from '@/types'

import { cacheHelpers } from '../../lib/cache/helpers'
import { CACHE_PROFILES } from '../../lib/cache/profiles'
import { CACHE_TAGS } from '../../lib/cache/tags'
import { paymentQueries } from '../db/queries/payment.query'
import { validateClinicAccess } from '../utils'

/**
 * 🟡 SERVICE LAYER
 * - Business logic only
 * - Uses 'use cache' for automatic caching
 * - Delegates to query layer
 * - Handles cache invalidation in mutations
 */
class PaymentService {
	// ==================== QUERIES (CACHED) ====================

	async getPatientPayments(patientId: string, clinicId: string) {
		'use cache'
		cacheTag(
			CACHE_TAGS.financial.payment.byPatient(patientId),
			CACHE_TAGS.patient.byClinic(clinicId)
		)
		cacheLife(CACHE_PROFILES.medicalShort)

		// Verify patient belongs to clinic
		await this.verifyPatientAccess(patientId, clinicId)

		return paymentQueries.findByPatient(patientId)
	}

	async getPaymentRecords(input: {
		clinicId: string
		page: number
		limit?: number
		search?: string
	}) {
		'use cache'
		const { clinicId, page, limit = 10, search = '' } = input
		const searchKey = search ? `:search:${search}` : ''

		cacheTag(
			CACHE_TAGS.financial.payment.byClinic(clinicId),
			`payments:list:${clinicId}:page:${page}${searchKey}`
		)
		cacheLife(CACHE_PROFILES.medicalShort)

		const PAGE_NUMBER = Number(page) <= 0 ? 1 : Number(page)
		const LIMIT = Number(limit) || 10
		const SKIP = (PAGE_NUMBER - 1) * LIMIT

		const where: Prisma.PaymentWhereInput = {
			clinicId,
			OR: search
				? ([
						{
							patient: {
								firstName: { contains: search, mode: 'insensitive' as const },
							},
						},
						{
							patient: {
								lastName: { contains: search, mode: 'insensitive' as const },
							},
						},
						{ patientId: { contains: search, mode: 'insensitive' as const } },
						...(!Number.isNaN(Number(search))
							? [{ receiptNumber: Number(search) } as const]
							: []),
					] as Prisma.PaymentWhereInput[])
				: undefined,
		}

		const [data, totalRecords] = await paymentQueries.findPaginated({
			where,
			skip: SKIP,
			take: LIMIT,
		})

		const totalPages = Math.ceil(totalRecords / LIMIT)

		return {
			currentPage: PAGE_NUMBER,
			data,
			totalPages,
			totalRecords,
		}
	}

	async getRecentPayments(input: {
		clinicId: string
		page: number
		limit?: number
		search?: string
	}) {
		'use cache'
		const { clinicId, page, limit = 10, search = '' } = input
		const searchKey = search ? `:search:${search}` : ''

		cacheTag(
			CACHE_TAGS.financial.payment.recent(clinicId),
			`payments:recent:${clinicId}:page:${page}${searchKey}`
		)
		cacheLife(CACHE_PROFILES.medicalShort)

		const PAGE_NUMBER = Number(page) <= 0 ? 1 : Number(page)
		const LIMIT = Number(limit) || 10
		const SKIP = (PAGE_NUMBER - 1) * LIMIT

		const where: Prisma.PaymentWhereInput = {
			clinicId,
			OR: search
				? ([
						{
							patient: {
								firstName: { contains: search, mode: 'insensitive' as const },
							},
						},
						{
							patient: {
								lastName: { contains: search, mode: 'insensitive' as const },
							},
						},
						{ patientId: { contains: search, mode: 'insensitive' as const } },
					] as Prisma.PaymentWhereInput[])
				: undefined,
		}

		const [data, totalRecords] = await paymentQueries.findRecent({
			where,
			skip: SKIP,
			take: LIMIT,
		})

		const totalPages = Math.ceil(totalRecords / LIMIT)

		return {
			currentPage: PAGE_NUMBER,
			data,
			totalPages,
			totalRecords,
		}
	}

	async getPaymentById(id: string, clinicId: string) {
		'use cache'
		cacheTag(
			CACHE_TAGS.financial.payment.byId(id),
			CACHE_TAGS.financial.payment.byClinic(clinicId)
		)
		cacheLife(CACHE_PROFILES.medicalShort)

		const payment = await paymentQueries.findById(id)
		if (!payment) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Payment not found',
			})
		}

		if (payment.clinicId !== clinicId) {
			throw new TRPCError({
				code: 'FORBIDDEN',
				message: 'Access denied to this payment',
			})
		}

		return payment
	}

	async getPaymentStats(clinicId: string) {
		'use cache'
		cacheTag(
			CACHE_TAGS.financial.payment.stats(clinicId),
			CACHE_TAGS.clinic.dashboard(clinicId)
		)
		cacheLife(CACHE_PROFILES.medicalShort)

		const [
			totalRevenue,
			pendingPayments,
			paidCount,
			unpaidCount,
			monthlyRevenue,
		] = await paymentQueries.getStats(clinicId)

		return {
			monthlyRevenue,
			paidCount,
			pendingPayments,
			totalRevenue,
			unpaidCount,
		}
	}

	// ==================== MUTATIONS (NO CACHE) ====================

	async generateBill(input: PaymentInput, userId: string) {
		const { id, discount, totalAmount, billDate } = input

		// Get payment to verify clinic access
		const payment = await paymentQueries.findById(id)
		if (!payment) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Payment not found',
			})
		}

		// Verify clinic access
		await validateClinicAccess(payment.clinicId ?? '', userId)

		// Business rules
		if (payment.status === 'PAID') {
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: 'Payment already processed',
			})
		}

		if (discount < 0 || discount > 100) {
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: 'Discount must be between 0 and 100',
			})
		}

		// Calculate discount amount
		const discountAmount = (Number(discount) / 100) * Number(totalAmount)
		const finalAmount = Number(totalAmount) - discountAmount

		// Update payment
		const updatedPayment = await paymentQueries.update(id, {
			amountPaid: finalAmount,
			billDate,
			discount: discountAmount,
			status: 'PAID',
			totalAmount: finalAmount,
		})

		// Update appointment status to COMPLETED
		if (payment.appointmentId) {
			await paymentQueries.updateAppointmentStatus(
				payment.appointmentId,
				'COMPLETED'
			)
		}

		// Cache invalidation
		cacheHelpers.financial.payment.invalidate(
			id,
			payment.patientId ?? '',
			payment.clinicId ?? ''
		)
		cacheHelpers.admin.invalidateDashboard(payment.clinicId ?? '')

		return {
			data: {
				discount: discountAmount,
				id: updatedPayment.id,
				patientId: payment.patientId,
				totalAmount: finalAmount,
			},
			message: 'Bill generated successfully',
			success: true,
		}
	}

	async addNewBill(input: AddNewBillInput, userId: string) {
		const {
			appointmentId,
			billId,
			quantity,
			serviceDate,
			serviceId,
			totalCost,
			unitCost,
		} = input

		let payment: Payment | null = null

		// If no billId provided, find or create one
		if (!billId) {
			const appointment = await paymentQueries.findAppointmentWithBills(
				appointmentId ?? ''
			)

			if (!appointment?.patientId) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Appointment or patient not found',
				})
			}

			// Verify clinic access
			await validateClinicAccess(appointment.clinicId, userId)

			if (appointment.bills.length === 0) {
				// Create new payment
				payment = await paymentQueries.create({
					amountPaid: 0,
					appointment: {
						connect: {
							id: appointmentId ?? '',
						},
					},
					billDate: new Date(),
					clinic: {
						connect: {
							id: appointment.clinicId,
						},
					},
					discount: 0,
					patient: {
						connect: {
							id: appointment.patientId,
						},
					},
					paymentDate: new Date(),
					status: 'UNPAID',
					totalAmount: 0,
				})
			} else {
				payment = appointment.bills[0] as Payment
			}
		} else {
			// Find existing bill
			payment = await paymentQueries.findById(billId)
			if (!payment) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Payment not found',
				})
			}
			await validateClinicAccess(payment.clinicId ?? '', userId)
		}

		if (!payment) {
			throw new TRPCError({
				code: 'INTERNAL_SERVER_ERROR',
				message: 'Failed to create or find payment',
			})
		}

		// Create patient bill item
		const patientBill = await paymentQueries.createPatientBill({
			id: payment.id,
			quantity: Number(quantity),
			serviceDate: new Date(serviceDate),
			service: {
				connect: {
					id: serviceId,
				},
			},
			payment: {
				connect: {
					id: payment.id,
				},
			},
			totalCost: Number(totalCost),
			unitCost: Number(unitCost),
		})

		// Update payment total
		const newTotal = Number(payment.totalAmount || 0) + Number(totalCost)
		await paymentQueries.update(payment.id ?? '', {
			totalAmount: newTotal,
		})

		// Cache invalidation
		cacheHelpers.financial.payment.invalidate(
			payment.id ?? '',
			payment.patientId ?? '',
			payment.clinicId ?? ''
		)
		cacheHelpers.admin.invalidateDashboard(payment.clinicId ?? '')

		return {
			data: patientBill,
			message: 'Bill item added successfully',
			success: true,
		}
	}

	// ==================== HELPER METHODS ====================

	private async verifyPatientAccess(patientId: string, clinicId: string) {
		const patient = await paymentQueries.checkPatientExists(patientId, clinicId)
		if (!patient) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Patient not found or does not belong to this clinic',
			})
		}
		return patient
	}
}

export const paymentService = new PaymentService()
