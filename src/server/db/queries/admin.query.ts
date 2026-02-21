import { dedupeQuery } from '@/cache/dedupe'
import { db } from '@/db/index'
import type { Prisma } from '@/prisma/browser'
import type { CreateStaffInput, ServiceInput } from '@/schemas/admin.schema'
import type { Doctor } from '@/types'
import { daysOfWeek } from '@/utils'

export interface WorkingDay {
	day: string
	startTime: string
	closeTime: string
}

type GetDataListParams = {
	type: 'doctor' | 'staff' | 'patient' | 'payment' | 'bill'
	clinicId: string
	limit?: number
	cursor?: string | null
	search?: string
	filter?: Record<string, unknown>
}
/**
 * 🎯 PURE QUERY LAYER
 * - NO business logic
 * - NO cache directives
 * - NO external dependencies (except db)
 * - ONLY raw database queries
 * - Wrapped with dedupeQuery for request deduplication
 *
 * CRITICAL RULES:
 * 1. NO date calculations outside query scope
 * 2. NO external utility functions
 * 3. NO business logic (if/else, throw)
 * 4. NO transformations
 * 5. Return raw Prisma results only
 */
export const adminQueries = {
	archivePatient: dedupeQuery(async (id: string, clinicId: string) => {
		return db.patient.update({
			data: { deletedAt: new Date() },
			where: { clinicId, id },
		})
	}),
	archiveStaff: dedupeQuery(async (id: string, clinicId: string) => {
		return db.staff.update({
			data: { deletedAt: new Date() },
			where: { clinicId, id },
		})
	}),

	checkServiceInUse: dedupeQuery(async (serviceId: string) => {
		return db.appointment.count({
			where: {
				isDeleted: false,
				serviceId,
				status: { not: 'CANCELLED' },
			},
		})
	}),

	/**
	 * Count appointments using this service
	 */
	countAppointmentsByService: dedupeQuery(
		async (serviceId: string, clinicId: string) => {
			return db.appointment.count({
				where: {
					clinicId,
					isDeleted: false,
					serviceId,
					status: { not: 'CANCELLED' }, // Only count active appointments
				},
			})
		}
	),

	/**
	 * Count bills/patient bills using this service
	 */
	countBillsByService: dedupeQuery(
		async (serviceId: string, clinicId: string) => {
			return db.patientBill.count({
				where: {
					payment: {
						clinicId,
						isDeleted: false,
					},
					serviceId,
				},
			})
		}
	),
	createDoctor: dedupeQuery(
		async (
			doctorData: Prisma.DoctorCreateInput,
			workSchedule?: WorkingDay[]
		) => {
			// Corrected the (tx: Prisma.TransactionClient) syntax here
			return db.$transaction(async (tx: Prisma.TransactionClient) => {
				const doctor = await tx.doctor.create({ data: doctorData })

				// Fallback for clinicId check
				const clinicId = doctor.clinicId ?? (doctorData as Doctor).clinicId

				if (workSchedule?.length && clinicId) {
					await tx.workingDays.createMany({
						data: workSchedule.map((ws: WorkingDay) => ({
							clinicId,
							closeTime: ws.closeTime,
							day: ws.day.toLowerCase(),
							doctorId: doctor.id,
							startTime: ws.startTime,
						})),
					})
				}

				return doctor
			})
		}
	),
	createService: dedupeQuery(async (service: ServiceInput) => {
		return db.service.create({
			data: service,
		})
	}),
	createStaff: dedupeQuery(async (staff: CreateStaffInput) => {
		const { clinicId, ...rest } = staff
		return db.staff.create({
			data: {
				...rest,
				clinicId: clinicId ?? '',
			},
		})
	}),
	deleteBill: dedupeQuery(async (id: string) => {
		return db.patientBill.delete({
			where: { id },
		})
	}),
	deleteDoctor: dedupeQuery(async (id: string, clinicId: string) => {
		return db.doctor.delete({
			where: { clinicId, id },
		})
	}),
	deletePatient: dedupeQuery(async (id: string, clinicId: string) => {
		return db.patient.delete({
			where: { clinicId, id },
		})
	}),

	deletePayment: dedupeQuery(async (id: string) => {
		return db.payment.delete({
			where: { id },
		})
	}),

	// Delete record (soft delete by default)
	deleteRecord: dedupeQuery(
		async (id: string, type: string, clinicId: string) => {
			const where = { clinicId, id }
			const updateData = {
				deletedAt: new Date(),
				isDeleted: true,
			}

			switch (type) {
				case 'doctor':
					return db.doctor.update({
						data: updateData,
						where,
					})
				case 'staff':
					return db.staff.update({
						data: updateData,
						where,
					})
				case 'patient':
					return db.patient.update({
						data: updateData,
						where,
					})
				case 'payment':
					return db.payment.update({
						data: updateData,
						where,
					})
				case 'bill':
					// Bills might be hard deleted or have different logic
					return db.patientBill.delete({
						where: { id },
					})
				default:
					throw new Error(`Invalid delete type: ${type}`)
			}
		}
	),
	deleteService: dedupeQuery(async (id: string, clinicId: string) => {
		return db.service.delete({
			select: {
				clinicId: true,
				id: true,
				serviceName: true,
			},
			where: {
				clinicId,
				id,
			},
		})
	}),
	deleteStaff: dedupeQuery(async (id: string, clinicId: string) => {
		return db.staff.delete({
			where: { clinicId, id },
		})
	}),
	getAdminDashboardStatWithRange: dedupeQuery(
		async (clinicId: string, from: Date, to: Date) => {
			// Basic day name for "Doctors working today" logic
			// (Usually based on the 'from' date or today's actual date)
			const dayName = daysOfWeek[new Date().getDay()]

			const [
				totalPatients,
				totalDoctors,
				totalStaff,
				rangeAppointmentsCount,
				upcomingAppointments,
				recentAppointments,
				doctorsWorkingToday,
				recentServices,
				rangeRevenue,
				pendingPayments,
			] = await db.$transaction([
				// 1. Total Patient Count
				db.patient.count({ where: { clinicId, isDeleted: false } }),

				// 2. Doctor Count
				db.doctor.count({ where: { clinicId, isDeleted: false } }),

				// 3. Staff Count
				db.staff.count({ where: { clinicId, deletedAt: null } }),

				// 4. Appointments in Range (The dynamic part)
				db.appointment.count({
					where: {
						appointmentDate: { gte: from, lte: to },
						clinicId,
						isDeleted: false,
					},
				}),

				// 5. Upcoming (Anything after the range end)
				db.appointment.count({
					where: {
						appointmentDate: { gt: to },
						clinicId,
						isDeleted: false,
						status: { in: ['SCHEDULED', 'PENDING'] },
					},
				}),

				// 6. Recent Appointments (Top 10)
				db.appointment.findMany({
					include: {
						doctor: { select: { id: true, name: true, specialty: true } },
						patient: { select: { firstName: true, id: true, lastName: true } },
						service: { select: { id: true, price: true, serviceName: true } },
					},
					orderBy: { appointmentDate: 'desc' },
					take: 10,
					where: { clinicId, isDeleted: false },
				}),

				// 7. Doctors working Today (Shift logic)
				db.doctor.findMany({
					take: 5,
					where: {
						clinicId,
						isDeleted: false,
						workingDays: {
							some: { day: { equals: dayName, mode: 'insensitive' } },
						},
					},
				}),

				// 8. Recent Services
				db.service.findMany({
					take: 10,
					where: { clinicId, isDeleted: false },
				}),

				// 9. Revenue in Range (The dynamic part)
				db.payment.aggregate({
					_sum: { amount: true },
					where: {
						clinicId,
						isDeleted: false,
						paymentDate: { gte: from, lte: to },
						status: 'PAID',
					},
				}),

				// 10. Pending Payments (Total)
				db.payment.count({
					where: { clinicId, isDeleted: false, status: 'UNPAID' },
				}),
			])

			return {
				appointmentsInRange: rangeAppointmentsCount,
				doctorsWorkingToday,
				recentAppointments,
				recentServices,
				revenueInRange: rangeRevenue._sum.amount || 0,
				totalDoctors,
				totalPatients,
				totalPendingPayments: pendingPayments,
				totalStaff,
				upcomingAppointments,
			}
		}
	),

	getBillById: dedupeQuery(async (id: string) => {
		return db.patientBill.findUnique({
			include: {
				payment: true,
				service: true,
			},
			where: { id },
		})
	}),

	getClinicCounts: dedupeQuery(async (clinicId: string) => {
		return db.$transaction([
			db.patient.count({ where: { clinicId, isDeleted: false } }),
			db.doctor.count({ where: { clinicId, isDeleted: false } }),
			db.staff.count({ where: { clinicId, deletedAt: null } }),
			db.appointment.count({ where: { clinicId, isDeleted: false } }),
		])
	}),
	// ==================== DASHBOARD QUERIES ====================
	getDashboardStats: dedupeQuery(async (clinicId: string) => {
		const today = new Date()
		today.setHours(0, 0, 0, 0)

		const tomorrow = new Date(today)
		tomorrow.setDate(tomorrow.getDate() + 1)

		const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
		const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
		const cutoffDate = new Date() // Current time for overdue check

		const todayDayName = daysOfWeek[today.getDay()]

		// Synchronize these variables EXACTLY with the array below
		const [
			totalPatients, // 0
			totalDoctors, // 1
			totalStaff, // 2
			todayAppointmentCount, // 3
			upcomingCount, // 4
			overdueImmunizations, // 5  <-- This was in the wrong spot
			recentAppointments, // 6
			doctorsWorkingToday, // 7
			recentServices, // 8
			monthlyRevenueData, // 9
			pendingPayments, // 10
		] = await db.$transaction([
			// 0: Patient counts
			db.patient.count({ where: { clinicId, isDeleted: false } }),

			// 1: Doctor counts
			db.doctor.count({ where: { clinicId, isDeleted: false } }),

			// 2: Staff counts
			db.staff.count({ where: { clinicId, deletedAt: null } }),

			// 3: Today's appointments
			db.appointment.count({
				where: {
					appointmentDate: { gte: today, lt: tomorrow },
					clinicId,
					isDeleted: false,
				},
			}),

			// 4: Upcoming appointments
			db.appointment.count({
				where: {
					appointmentDate: { gte: tomorrow },
					clinicId,
					isDeleted: false,
					status: { in: ['SCHEDULED', 'PENDING'] },
				},
			}),

			// 5: Overdue Immunizations (The findMany)
			db.immunization.findMany({
				include: {
					patient: {
						select: {
							dateOfBirth: true,
							firstName: true,
							id: true,
							lastName: true,
						},
					},
				},
				orderBy: { date: 'asc' },
				take: 20,
				where: {
					date: { lt: cutoffDate },
					isDeleted: false,
					patient: { clinicId },
					status: 'PENDING',
				},
			}),

			// 6: Recent appointments
			db.appointment.findMany({
				include: {
					doctor: {
						select: { id: true, img: true, name: true, specialty: true },
					},
					patient: {
						select: {
							colorCode: true,
							dateOfBirth: true,
							firstName: true,
							gender: true,
							id: true,
							image: true,
							lastName: true,
						},
					},
					service: { select: { id: true, price: true, serviceName: true } },
				},
				orderBy: { appointmentDate: 'desc' },
				take: 10,
				where: { clinicId, isDeleted: false },
			}),

			// 7: Doctors working today
			db.doctor.findMany({
				select: {
					colorCode: true,
					id: true,
					img: true,
					name: true,
					specialty: true,
				},
				take: 5,
				where: {
					clinicId,
					isDeleted: false,
					workingDays: {
						some: { day: { equals: todayDayName, mode: 'insensitive' } },
					},
				},
			}),

			// 8: Recent services
			db.service.findMany({
				orderBy: { serviceName: 'asc' },
				take: 10,
				where: { clinicId, isDeleted: false },
			}),

			// 9: Monthly revenue (Aggregate)
			db.payment.aggregate({
				_sum: { amount: true },
				where: {
					clinicId,
					isDeleted: false,
					paymentDate: { gte: startOfMonth, lte: endOfMonth },
					status: 'PAID',
				},
			}),

			// 10: Pending payments
			db.payment.count({
				where: { clinicId, isDeleted: false, status: 'UNPAID' },
			}),
		])

		return {
			doctorsWorkingToday,
			monthlyRevenue: monthlyRevenueData._sum?.amount || 0, // Safely access _sum
			overdueImmunizations,
			pendingPayments,
			recentAppointments,
			recentServices,
			todayAppointments: todayAppointmentCount,
			totalDoctors,
			totalPatients,
			totalStaff,
			upcomingAppointments: upcomingCount,
		}
	}),
	getDataList: dedupeQuery(
		async ({
			type,
			clinicId,
			limit = 50,
			cursor,
			search,
			filter = {},
		}: GetDataListParams) => {
			const baseWhere = {
				clinicId,
				isDeleted: false,
				...filter,
			}

			// Add search if provided
			if (search) {
				Object.assign(baseWhere, {
					OR: [
						{ name: { contains: search, mode: 'insensitive' } },
						{ email: { contains: search, mode: 'insensitive' } },
						{ phone: { contains: search, mode: 'insensitive' } },
					],
				})
			}

			// Add cursor for pagination
			const cursorObj = cursor ? { id: cursor } : undefined

			switch (type) {
				case 'doctor':
					return db.doctor.findMany({
						cursor: cursorObj,
						include: {
							user: {
								select: {
									email: true,
									image: true,
									name: true,
								},
							},
							workingDays: true,
						},
						orderBy: { name: 'asc' },
						take: limit + 1, // Get one extra to check for next page
						where: baseWhere,
					})

				case 'staff':
					return db.staff.findMany({
						cursor: cursorObj,
						include: {
							user: {
								select: {
									email: true,
									image: true,
									name: true,
								},
							},
						},
						orderBy: { name: 'asc' },
						take: limit + 1,
						where: baseWhere,
					})

				case 'patient':
					return db.patient.findMany({
						cursor: cursorObj,
						include: {
							guardians: true,
							user: {
								select: {
									email: true,
									image: true,
									name: true,
								},
							},
						},
						orderBy: { firstName: 'asc' },
						take: limit + 1,
						where: baseWhere,
					})

				case 'payment':
					return db.payment.findMany({
						cursor: cursorObj,
						include: {
							appointment: true,
							patient: {
								select: {
									firstName: true,
									lastName: true,
								},
							},
						},
						orderBy: { paymentDate: 'desc' },
						take: limit + 1,
						where: { ...baseWhere, clinicId },
					})

				case 'bill':
					return db.patientBill.findMany({
						cursor: cursorObj,
						include: {
							payment: {
								include: {
									patient: {
										select: {
											firstName: true,
											lastName: true,
										},
									},
								},
							},
							service: true,
						},
						orderBy: { createdAt: 'desc' },
						take: limit + 1,
						where: {
							payment: { clinicId },
						},
					})

				default:
					throw new Error(`Invalid type: ${type}`)
			}
		}
	),

	getDoctorById: dedupeQuery(async (id: string, clinicId: string) => {
		return db.doctor.findUnique({
			include: {
				workingDays: {
					select: {
						closeTime: true,
						day: true,
						startTime: true,
					},
				},
			},
			where: {
				clinicId,
				id,
				isDeleted: false,
			},
		})
	}),
	// ==================== DOCTOR QUERIES ====================
	getDoctorList: dedupeQuery(async (clinicId: string) => {
		return db.doctor.findMany({
			orderBy: { name: 'asc' },
			select: {
				availableFromTime: true,
				availableToTime: true,
				colorCode: true,
				email: true,
				id: true,
				img: true,
				isActive: true,
				name: true,
				phone: true,
				specialty: true,
				status: true,
				userId: true,
				workingDays: {
					select: {
						closeTime: true,
						day: true,
						startTime: true,
					},
				},
			},
			where: { clinicId, isDeleted: false },
		})
	}),

	getDoctorUpcomingAppointments: dedupeQuery(async (doctorId: string) => {
		const now = new Date()
		return db.appointment.count({
			where: {
				appointmentDate: { gte: now },
				doctorId,
				isDeleted: false,
				status: { in: ['SCHEDULED', 'PENDING'] },
			},
		})
	}),

	// ==================== WORKING DAYS QUERIES ====================
	getDoctorWorkingDays: dedupeQuery(async (doctorId: string) => {
		return db.workingDays.findMany({
			select: {
				closeTime: true,
				day: true,
				startTime: true,
			},
			where: { doctorId },
		})
	}),

	// ==================== PATIENT QUERIES ====================
	getPatientById: dedupeQuery(async (id: string, clinicId: string) => {
		return db.patient.findUnique({
			include: {
				user: {
					select: {
						email: true,
						image: true,
						name: true,
					},
				},
			},
			where: {
				clinicId,
				id,
				isDeleted: false,
			},
		})
	}),

	getPatientOutstandingBills: dedupeQuery(async (patientId: string) => {
		return db.patientBill.findFirst({
			include: {
				payment: true,
				service: true,
			},
			where: {
				payment: {
					isDeleted: false,
					patientId,
					status: 'UNPAID',
				},
			},
		})
	}),

	// ==================== PAYMENT QUERIES ====================
	getPaymentById: dedupeQuery(async (id: string) => {
		return db.payment.findUnique({
			include: {
				clinic: {
					select: {
						id: true,
						name: true,
					},
				},
				patient: {
					select: {
						firstName: true,
						id: true,
						lastName: true,
					},
				},
			},
			where: {
				id,
				isDeleted: false,
			},
		})
	}),
	// ==================== AUDIT LOG QUERIES ====================
	getRecentActivity: dedupeQuery(
		async (userId: string, clinicId: string, limit = 20) => {
			return db.auditLog.findMany({
				include: {
					user: {
						select: {
							id: true,
							image: true,
							name: true,
						},
					},
				},
				orderBy: { createdAt: 'desc' },
				take: typeof limit === 'number' ? limit : undefined,
				where: {
					clinicId,
					userId,
				},
			})
		}
	),

	// Get single record by ID
	getRecordById: dedupeQuery(async (id: string, type: string) => {
		switch (type) {
			case 'doctor':
				return db.doctor.findUnique({ where: { id, isDeleted: false } })
			case 'staff':
				return db.staff.findUnique({ where: { deletedAt: null, id } })
			case 'patient':
				return db.patient.findUnique({ where: { id, isDeleted: false } })
			case 'payment':
				return db.payment.findUnique({ where: { id, isDeleted: false } })
			case 'bill':
				return db.patientBill.findUnique({ where: { id } })
			default:
				return null
		}
	}),

	getServiceById: dedupeQuery(async (id: string, clinicId: string) => {
		return db.service.findUnique({
			select: {
				category: true,
				clinicId: true,
				color: true,
				createdAt: true,
				description: true,
				duration: true,
				icon: true,
				id: true,
				isAvailable: true,
				price: true,
				serviceName: true,
				updatedAt: true,
			},
			where: {
				clinicId,
				id,
				isDeleted: false,
			},
		})
	}),

	// ==================== SERVICE QUERIES ====================
	getServices: dedupeQuery(async (clinicId: string) => {
		return db.service.findMany({
			orderBy: { serviceName: 'asc' },
			where: { clinicId, isDeleted: false },
		})
	}),

	getServicesWithUsage: dedupeQuery(async (clinicId: string) => {
		return db.service.findMany({
			include: {
				appointments: {
					select: {
						appointmentDate: true,
						id: true,
						status: true,
					},
					take: 5, // Limit to recent appointments
					where: { isDeleted: false },
				},
			},
			orderBy: { serviceName: 'asc' },
			take: 10,
			where: { clinicId, isDeleted: false },
		})
	}),

	getStaffById: dedupeQuery(async (id: string, clinicId: string) => {
		return db.staff.findUnique({
			where: {
				clinicId,
				deletedAt: null,
				id,
			},
		})
	}),
	// ==================== STAFF QUERIES ====================
	getStaffList: dedupeQuery(async (clinicId: string) => {
		return db.staff.findMany({
			orderBy: { name: 'asc' },
			select: {
				colorCode: true,
				department: true,
				email: true,
				hireDate: true,
				id: true,
				img: true,
				name: true,
				phone: true,
				role: true,
				status: true,
				userId: true,
			},
			where: { clinicId, deletedAt: null },
		})
	}),
	// ==================== APPOINTMENT QUERIES ====================
	getTodaySchedule: dedupeQuery(async (clinicId: string) => {
		const today = new Date()
		today.setHours(0, 0, 0, 0)
		const tomorrow = new Date(today)
		tomorrow.setDate(tomorrow.getDate() + 1)

		return db.appointment.findMany({
			include: {
				doctor: {
					select: {
						id: true,
						name: true,
						specialty: true,
					},
				},
				patient: {
					select: {
						firstName: true,
						id: true,
						lastName: true,
						phone: true,
					},
				},
				service: {
					select: {
						id: true,
						price: true,
						serviceName: true,
					},
				},
			},
			orderBy: { appointmentDate: 'asc' },
			where: {
				appointmentDate: {
					gte: today,
					lt: tomorrow,
				},
				clinicId,
				isDeleted: false,
			},
		})
	}),
	refundPayment: dedupeQuery(async (id: string) => {
		return db.payment.update({
			data: { status: 'REFUNDED' },
			where: { id },
		})
	}),

	/**
	 * RESTORE SERVICE - Undo soft delete
	 */
	restoreService: dedupeQuery(async (id: string, clinicId: string) => {
		return db.service.update({
			data: {
				deletedAt: null,
				isAvailable: true,
				isDeleted: false,
				updatedAt: new Date(),
			},
			where: {
				clinicId,
				id,
			},
		})
	}),

	/**
	 * HARD DELETE - Remove from database entirely
	 * Only use when no dependencies exist
	 */

	/**
	 * SOFT DELETE - Set isDeleted flag
	 * Preserve historical records while hiding from UI
	 */
	softDeleteService: dedupeQuery(async (id: string, clinicId: string) => {
		return db.service.update({
			data: {
				deletedAt: new Date(),
				isAvailable: false,
				isDeleted: true,
				updatedAt: new Date(),
			},
			select: {
				deletedAt: true,
				id: true,
				isDeleted: true,
				serviceName: true,
			},
			where: {
				clinicId,
				id,
			},
		})
	}),
	updateService: dedupeQuery(async (service: ServiceInput) => {
		return db.service.update({
			data: service,
			where: { id: service.id },
		})
	}),

	// ==================== VALIDATION QUERIES ====================
	validateClinicAccess: dedupeQuery(
		async (clinicId: string, userId: string) => {
			const member = await db.clinicMember.findFirst({
				select: {
					clinicId: true,
					role: true,
					userId: true,
				},
				where: {
					clinicId,
					userId,
				},
			})

			// ✅ Return the raw result - service layer handles the boolean conversion
			return member
		}
	),
} as const
