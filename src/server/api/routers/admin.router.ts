import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import type { Prisma } from '@/prisma/browser'
import {
	DeleteInputSchema,
	GetDataListSchema,
	ServicesSchema,
	StaffAuthSchema,
	StatsInputSchema,
} from '@/schemas/admin.schema'
import {
	type CreateDoctorInput,
	CreateNewDoctorInputSchema,
} from '@/schemas/doctor.schema'
import { validateClinicAccess } from '@/server/utils'

import { isUserAdmin } from '../../../lib/auth/admin-helpers'
import {
	adminService,
	getCachedClinicCounts,
} from '../../services/admin.service'
import { adminProcedure, createTRPCRouter, protectedProcedure } from '../trpc'

export const adminRouter = createTRPCRouter({
	/**
	 * 🟣 Add New Service
	 */
	getAllUsers: protectedProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(100).default(50),
				offset: z.number().min(0).default(0),
				search: z.string().optional(),
			})
		)
		.query(async ({ ctx, input }) => {
			const { limit, offset, search } = input

			// Verify admin access
			if (!ctx.user || !(await isUserAdmin(ctx.user.email))) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'Admin access required',
				})
			}

			const where = search
				? {
						OR: [
							{ email: { contains: search, mode: 'insensitive' as const } },
							{ name: { contains: search, mode: 'insensitive' as const } },
						],
					}
				: {}

			const [users, total] = await Promise.all([
				ctx.prisma.user.findMany({
					where,
					take: limit,
					skip: offset,
					orderBy: { createdAt: 'desc' },
					select: {
						id: true,
						email: true,
						name: true,
						image: true,
						banned: true,
						createdAt: true,
						updatedAt: true,
						_count: {
							select: {
								clinics: true,
							},
						},
						clinics: {
							include: {
								clinic: {
									select: {
										id: true,
										name: true,
										slug: true,
									},
								},
								role: {
									select: {
										id: true,
										name: true,
									},
								},
							},
						},
					},
				}),
				ctx.prisma.user.count({ where }),
			])

			return {
				users,
				total,
				hasMore: offset + limit < total,
			}
		}),

	/**
	 * Get system statistics (admin only)
	 */
	getSystemStats: protectedProcedure.query(async ({ ctx }) => {
		// Verify admin access
		if (!ctx.user || !(await isUserAdmin(ctx.user.email))) {
			throw new TRPCError({
				code: 'FORBIDDEN',
				message: 'Admin access required',
			})
		}

		const [totalUsers, totalClinics, totalMembers, recentUsers, activeUsers] =
			await Promise.all([
				ctx.prisma.user.count(),
				ctx.prisma.clinic.count(),
				ctx.prisma.clinicMember.count(),
				ctx.prisma.user.count({
					where: {
						createdAt: {
							gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
						},
					},
				}),
				ctx.prisma.user.count({
					where: {
						updatedAt: {
							gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
						},
					},
				}),
			])

		return {
			totalUsers,
			totalClinics,
			totalMembers,
			recentUsers,
			activeUsers,
		}
	}),

	/**
	 * Get all audit logs (admin only)
	 */
	getAuditLogs: protectedProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(100).default(50),
				offset: z.number().min(0).default(0),
				userId: z.string().optional(),
				clinicId: z.string().optional(),
				action: z.string().optional(),
				search: z.string().optional(),
				startDate: z.date().optional(),
				endDate: z.date().optional(),
			})
		)
		.query(async ({ ctx, input }) => {
			const {
				limit,
				offset,
				userId,
				clinicId,
				action,
				search,
				startDate,
				endDate,
			} = input

			// Verify admin access
			if (!ctx.user || !(await isUserAdmin(ctx.user.email))) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'Admin access required',
				})
			}

			const where: Prisma.AuditLogWhereInput = {}

			if (userId) where.userId = userId
			if (clinicId) where.clinicId = clinicId
			if (action) where.action = action
			if (startDate || endDate) {
				where.createdAt = {}
				if (startDate) where.createdAt.gte = startDate
				if (endDate) where.createdAt.lte = endDate
			}

			// Add search filter across multiple fields
			if (search) {
				where.OR = [
					{
						user: {
							OR: [
								{ email: { contains: search, mode: 'insensitive' } },
								{ name: { contains: search, mode: 'insensitive' } },
							],
						},
					},
					{ action: { contains: search, mode: 'insensitive' } },
					{
						clinic: {
							OR: [
								{ name: { contains: search, mode: 'insensitive' } },
								{ slug: { contains: search, mode: 'insensitive' } },
							],
						},
					},
					{ ipAddress: { contains: search, mode: 'insensitive' } },
					{ resource: { contains: search, mode: 'insensitive' } },
				]
			}

			const [logs, total] = await Promise.all([
				ctx.prisma.auditLog.findMany({
					where,
					take: limit,
					skip: offset,
					orderBy: { createdAt: 'desc' },
					include: {
						user: {
							select: {
								id: true,
								email: true,
								name: true,
								image: true,
							},
						},
						clinic: {
							select: {
								id: true,
								name: true,
								slug: true,
							},
						},
					},
				}),
				ctx.prisma.auditLog.count({ where }),
			])

			return {
				logs,
				total,
				hasMore: offset + limit < total,
			}
		}),

	/**
	 * Delete user (admin only)
	 */
	deleteUser: protectedProcedure
		.input(z.object({ userId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// Verify admin access
			if (!ctx.user || !(await isUserAdmin(ctx.user.email))) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'Admin access required',
				})
			}

			// Prevent deleting yourself
			if (input.userId === ctx.user.id) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Cannot delete your own account',
				})
			}

			return ctx.prisma.user.delete({
				where: { id: input.userId },
			})
		}),

	/**
	 * Update user status (admin only)
	 */
	updateUserStatus: protectedProcedure
		.input(
			z.object({
				userId: z.string(),
				banned: z.boolean().optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			// Verify admin access
			if (!ctx.user || !(await isUserAdmin(ctx.user.email))) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'Admin access required',
				})
			}

			return ctx.prisma.user.update({
				where: { id: input.userId },
				data: {
					banned: input.banned,
				},
			})
		}),

	/**
	 * Get distinct audit log actions (admin only)
	 */
	getAuditLogActions: protectedProcedure.query(async ({ ctx }) => {
		// Verify admin access
		if (!ctx.user || !(await isUserAdmin(ctx.user.email))) {
			throw new TRPCError({
				code: 'FORBIDDEN',
				message: 'Admin access required',
			})
		}

		// Get all distinct actions from audit logs
		const logs = await ctx.prisma.auditLog.findMany({
			select: { action: true },
			distinct: ['action'],
			orderBy: { action: 'asc' },
		})

		return logs.map(log => log.action).sort()
	}),
	addNewService: adminProcedure
		.input(ServicesSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				const userId = ctx.user?.id
				const clinicId = input.clinicId || ctx.clinic?.id

				if (!clinicId) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'Clinic ID is required',
					})
				}

				const service = await adminService.createService(
					{ ...input, clinicId },
					userId ?? ''
				)

				return {
					message: 'Service added successfully',
					service,
					success: true,
				}
			} catch (error) {
				console.error('Error in addNewService:', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message:
						error instanceof Error ? error.message : 'Failed to create service',
				})
			}
		}),

	//   deleteDataById: protectedProcedure
	//     .input(
	//       z.object({
	//         id: z.string(),
	//         deleteType: z.enum(["doctor", "staff", "patient", "payment", "bill"]),
	//       }),
	//     )
	//     .mutation(async ({ input, ctx }) => {
	//       // Get the record first to know its clinicId
	//       const record = await adminService.getRecordById(
	//         input.id,
	//         input.deleteType,
	//       );
	//       if (!record) {
	//         throw new Error("Record not found");
	//       }
	// const clinicId = ctx.clinicId
	// const userId = ctx.user.id
	//       // Verify access
	//       const hasAccess = await validateClinicAccess(
	//         clinicId,
	//         userId
	//       );
	//       if (!hasAccess) {
	//         throw new Error("Unauthorized");
	//       }

	//       return adminService.deleteDataById({
	//         ...input,
	//         clinicId,
	//         userId,
	//         patientId: ""
	//       });
	//     }),
	/**
	 * 🟣 Create New Doctor
	 */
	createNewDoctor: adminProcedure
		.input(CreateNewDoctorInputSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				const userId = ctx.user?.id

				const doctor = await adminService.createDoctor(
					{
						...input,
						isActive: true,
						workingDays: input.workSchedule || [],
					} as CreateDoctorInput,
					userId ?? ''
				)

				return {
					doctor,
					message: 'Doctor added successfully',
					success: true,
				}
			} catch (error) {
				console.error('Error in createNewDoctor:', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message:
						error instanceof Error ? error.message : 'Failed to create doctor',
				})
			}
		}),

	// ==================== MUTATIONS (WRITE) ====================

	/**
	 * 🟣 Create New Staff
	 * Delegates to action layer (or direct service with cache invalidation)
	 */
	createNewStaff: adminProcedure
		.input(StaffAuthSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				const userId = ctx.user?.id

				// Delegate to service with userId
				const result = await adminService.createStaff(input, userId ?? '')

				return {
					message: 'Staff member added successfully',
					staff: result,
					success: true,
				}
			} catch (error) {
				console.error('Error in createNewStaff:', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message:
						error instanceof Error ? error.message : 'Failed to create staff',
				})
			}
		}),

	/**
	 * 🟣 Delete Data By ID (Generic)
	 */
	deleteDataById: adminProcedure
		.input(DeleteInputSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				const userId = ctx.user?.id

				await adminService.deleteData(input, userId ?? '')

				return {
					message: `${input.deleteType} deleted successfully`,
					success: true,
				}
			} catch (error) {
				console.error('Error in deleteDataById:', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message:
						error instanceof Error ? error.message : 'Failed to delete data',
				})
			}
		}),

	/**
	 * 🟣 Delete Service
	 */
	deleteService: adminProcedure
		.input(DeleteInputSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				const userId = ctx.user?.id

				await adminService.deleteService(input.id, input.clinicId, userId ?? '')

				return {
					message: 'Service deleted successfully',
					success: true,
				}
			} catch (error) {
				console.error('Error in deleteService:', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message:
						error instanceof Error ? error.message : 'Failed to delete service',
				})
			}
		}),

	/**
	 * 🟣 Get Clinic Counts - CACHED
	 */
	getClinicCounts: adminProcedure.query(async ({ ctx }) => {
		try {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({
					code: 'UNAUTHORIZED',
					message: 'Clinic ID not found in session',
				})
			}

			return await getCachedClinicCounts(clinicId, ctx.user?.id ?? '')
		} catch (error) {
			console.error('Error in getClinicCounts:', error)
			throw new TRPCError({
				code: 'INTERNAL_SERVER_ERROR',
				message: 'Failed to fetch clinic counts',
			})
		}
	}),
	// ==================== QUERIES (READ) ====================

	/**
	 * 🟣 Get Dashboard Stats - CACHED
	 * Uses getCachedDashboardStats for optimal performance
	 */
	getDashboardStats: adminProcedure.query(async ({ ctx }) => {
		try {
			const clinicId = ctx.clinic?.id
			if (!clinicId) {
				throw new TRPCError({
					code: 'UNAUTHORIZED',
					message: 'Clinic ID not found in session',
				})
			}

			// ✅ Use cached version - no session passed, validation skipped in cache path
			return await adminService.getDashboardStats(clinicId, ctx.user?.id ?? '')
		} catch (error) {
			console.error('Error in getDashboardStats:', error)
			throw new TRPCError({
				code: 'INTERNAL_SERVER_ERROR',
				message: 'Failed to fetch dashboard stats',
			})
		}
	}),

	/**
	 * 🟣 Get Dashboard Stats with Date Range
	 * This is a separate endpoint for date-range analytics
	 */
	getDashboardStatsByDateRange: adminProcedure
		.input(StatsInputSchema)
		.query(async ({ ctx, input }) => {
			try {
				const clinicId = ctx.clinic?.id
				if (!clinicId) {
					throw new TRPCError({
						code: 'UNAUTHORIZED',
						message: 'Clinic ID not found in session',
					})
				}

				// This is analytics data - not typically cached
				// Could implement a separate cache with longer TTL
				return await adminService.getDashboardStatsByDateRange(
					clinicId,
					input.from,
					input.to
				)
			} catch (error) {
				console.error('Error in getDashboardStatsByDateRange:', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to fetch dashboard stats by date range',
				})
			}
		}),
	getDataList: protectedProcedure
		.input(GetDataListSchema)
		.query(async ({ input, ctx }) => {
			const clinicId = ctx.clinic?.id ?? ''
			const userId = ctx.user?.id ?? ''

			await validateClinicAccess(clinicId, userId) // ← just await

			return adminService.getDataList({
				...input,
				clinicId,
				userId,
			})
		}),

	/**
	 * 🟣 Get Doctor By ID - CACHED
	 */
	getDoctorById: adminProcedure
		.input(z.object({ clinicId: z.uuid(), id: z.uuid() }))
		.query(async ({ input }) => {
			try {
				const { id, clinicId } = input
				return await adminService.getDoctorById(id, clinicId)
			} catch (error) {
				console.error('Error in getDoctorById:', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to fetch doctor',
				})
			}
		}),

	/**
	 * 🟣 Get Doctor List - CACHED
	 */
	getDoctorList: adminProcedure.query(async ({ ctx }) => {
		try {
			const clinicId = ctx.session?.user.clinic?.id
			if (!clinicId) {
				throw new TRPCError({
					code: 'UNAUTHORIZED',
					message: 'Clinic ID not found in session',
				})
			}

			return await adminService.getDoctorList(clinicId, ctx.user?.id ?? '')
		} catch (error) {
			console.error('Error in getDoctorList:', error)
			throw new TRPCError({
				code: 'INTERNAL_SERVER_ERROR',
				message: 'Failed to fetch doctor list',
			})
		}
	}),

	/**
	 * 🟣 Get Patient By ID - CACHED
	 */
	getPatientById: adminProcedure
		.input(z.object({ clinicId: z.uuid(), id: z.uuid() }))
		.query(async ({ input }) => {
			try {
				const { id, clinicId } = input
				return await adminService.getPatientById(id, clinicId)
			} catch (error) {
				console.error('Error in getPatientById:', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to fetch patient',
				})
			}
		}),

	/**
	 * 🟣 Get Recent Activity - CACHED
	 */
	getRecentActivity: adminProcedure
		.input(
			z.object({
				clinicId: z.uuid(),
				limit: z.number().min(1).max(100).default(20),
			})
		)
		.query(async ({ ctx, input }) => {
			try {
				const userId = ctx.user?.id ?? ''
				const { clinicId, limit } = input

				return await adminService.getRecentActivity(userId, clinicId, limit)
			} catch (error) {
				console.error('Error in getRecentActivity:', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to fetch recent activity',
				})
			}
		}),

	/**
	 * 🟣 Get Service By ID - CACHED
	 */
	getServiceById: adminProcedure
		.input(z.object({ clinicId: z.uuid(), id: z.uuid() }))
		.query(async ({ input }) => {
			try {
				const { id, clinicId } = input
				return await adminService.getServiceById(id, clinicId)
			} catch (error) {
				console.error('Error in getServiceById:', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to fetch service',
				})
			}
		}),

	/**
	 * 🟣 Get Services List - CACHED
	 */
	getServices: adminProcedure.query(async ({ ctx }) => {
		try {
			const clinicId = ctx.session?.user.clinic?.id
			if (!clinicId) {
				throw new TRPCError({
					code: 'UNAUTHORIZED',
					message: 'Clinic ID not found in session',
				})
			}

			return await adminService.getServices(clinicId, ctx.user?.id ?? '')
		} catch (error) {
			console.error('Error in getServices:', error)
			throw new TRPCError({
				code: 'INTERNAL_SERVER_ERROR',
				message: 'Failed to fetch services',
			})
		}
	}),

	/**
	 * 🟣 Get Services With Usage - CACHED
	 */
	getServicesWithUsage: adminProcedure.query(async ({ ctx }) => {
		try {
			const clinicId = ctx.session?.user.clinic?.id
			if (!clinicId) {
				throw new TRPCError({
					code: 'UNAUTHORIZED',
					message: 'Clinic ID not found in session',
				})
			}

			return await adminService.getServicesWithUsage(clinicId)
		} catch (error) {
			console.error('Error in getServicesWithUsage:', error)
			throw new TRPCError({
				code: 'INTERNAL_SERVER_ERROR',
				message: 'Failed to fetch services with usage',
			})
		}
	}),

	/**
	 * 🟣 Get Staff By ID - CACHED
	 */
	getStaffById: adminProcedure
		.input(z.object({ clinicId: z.uuid(), id: z.uuid() }))
		.query(async ({ input }) => {
			try {
				const { id, clinicId } = input
				return await adminService.getStaffById(id, clinicId)
			} catch (error) {
				console.error('Error in getStaffById:', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to fetch staff member',
				})
			}
		}),

	/**
	 * 🟣 Get Staff List - CACHED
	 */
	getStaffList: adminProcedure.query(async ({ ctx }) => {
		try {
			const clinicId = ctx.session?.user.clinic?.id
			if (!clinicId) {
				throw new TRPCError({
					code: 'UNAUTHORIZED',
					message: 'Clinic ID not found in session',
				})
			}

			return await adminService.getStaffList(clinicId, ctx.user?.id ?? '')
		} catch (error) {
			console.error('Error in getStaffList:', error)
			throw new TRPCError({
				code: 'INTERNAL_SERVER_ERROR',
				message: 'Failed to fetch staff list',
			})
		}
	}),

	/**
	 * 🟣 Get Today's Schedule - CACHED (Realtime)
	 */
	getTodaySchedule: adminProcedure.query(async ({ ctx }) => {
		try {
			const clinicId = ctx.session?.user.clinic?.id
			if (!clinicId) {
				throw new TRPCError({
					code: 'UNAUTHORIZED',
					message: 'Clinic ID not found in session',
				})
			}

			return await adminService.getTodaySchedule(clinicId)
		} catch (error) {
			console.error('Error in getTodaySchedule:', error)
			throw new TRPCError({
				code: 'INTERNAL_SERVER_ERROR',
				message: "Failed to fetch today's schedule",
			})
		}
	}),

	/**
	 * 🟣 Update Service
	 */
	updateService: adminProcedure
		.input(ServicesSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				if (!input.id) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'Service ID is required for update',
					})
				}

				const userId = ctx.user?.id ?? ''
				const clinicId = input.clinicId || ctx.clinic?.id

				if (!clinicId) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'Clinic ID is required',
					})
				}

				const service = await adminService.updateService(
					{ ...input, clinicId },
					userId
				)

				return {
					message: 'Service updated successfully',
					service,
					success: true,
				}
			} catch (error) {
				console.error('Error in updateService:', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message:
						error instanceof Error ? error.message : 'Failed to update service',
				})
			}
		}),
})
