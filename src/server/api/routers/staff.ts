// server/api/routers/staff.ts

import { TRPCError } from '@trpc/server'
import { headers } from 'next/headers'
import z from 'zod'

import { generateRandomColor } from '@/utils'

import type { Prisma } from '../../../../generated/prisma/browser'
import { auth } from '../../../lib/auth'
import { staffCreateSchema, staffUpdateSchema } from '../../../schemas'
import { adminProcedure, createTRPCRouter, publicProcedure } from '../trpc'

const GetAllStaffSchema = z.object({
	limit: z.number().int().min(1).max(100).default(10),
	page: z.number().int().min(1).default(1),
	search: z.string().optional().default(''),
})

const createStaff = staffCreateSchema.extend({
	password: z.string(),
})

export const staffRouter = createTRPCRouter({
	// -----------------------------------------------------
	// 2. createNewStaff
	// -----------------------------------------------------
	createNewStaff: adminProcedure
		.input(createStaff)
		.mutation(async ({ input: data, ctx }) => {
			try {
				// 1. Create Auth User via Better Auth API
				const newUser = await auth.api.createUser({
					body: {
						data: {
							role: data.role,
						},
						email: data.email,
						name: data.name,
						password: data.password,
						role: 'staff',
					},
					headers: await headers(),
				})

				if (!newUser?.user?.id) {
					throw new Error('Auth user creation failed')
				}

				// 2. Create Staff Record linked to Auth ID
				await ctx.prisma.staff.create({
					data: {
						address: data.address,
						colorCode: generateRandomColor(),
						department: data.department,
						email: data.email,
						hireDate: data.hireDate,
						img: data.img,
						licenseNumber: data.licenseNumber,
						name: data.name,
						phone: data.phone,
						role: data.role,
						salary: data.salary,
						status: 'ACTIVE',
						userId: newUser.user.id,
					},
				})

				return { message: 'Staff member added successfully', success: true }
			} catch (error) {
				console.error('[createNewStaff]', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message:
						error instanceof Error
							? error.message
							: 'Failed to add staff member.',
				})
			}
		}),

	// -----------------------------------------------------
	// 4. deleteStaff
	// -----------------------------------------------------
	deleteStaff: adminProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ input, ctx }) => {
			try {
				await ctx.prisma.staff.delete({
					where: { id: input.id },
				})

				return { success: true }
			} catch (error) {
				console.error('[deleteStaff]', error)

				if (error instanceof Error) {
					throw new TRPCError({
						code: 'NOT_FOUND',
						message: 'Staff member not found or already deleted.',
					})
				}

				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to delete staff member.',
				})
			}
		}),
	// -----------------------------------------------------
	// 1. getAllStaff (Paginated List)
	// -----------------------------------------------------
	getAllStaff: publicProcedure
		.input(GetAllStaffSchema)
		.query(async ({ ctx, input }) => {
			const { search, page, limit } = input
			const offset = (page - 1) * limit

			try {
				const where: Prisma.StaffWhereInput = search
					? {
							OR: [
								{ name: { contains: search } },
								{ phone: { contains: search } },
								{ email: { contains: search } },
							],
						}
					: {}

				const [staffData, totalCount] = await Promise.all([
					ctx.prisma.staff.findMany({
						orderBy: { createdAt: 'desc' },
						skip: offset,
						take: limit,
						where,
					}),
					ctx.prisma.staff.count({ where }),
				])
				return {
					currentPage: page,
					data: staffData,
					totalPages: Math.ceil(totalCount / limit),
					totalRecords: totalCount,
				}
			} catch (error) {
				console.error('Error fetching staff records:', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to retrieve staff records.',
				})
			}
		}),

	// -----------------------------------------------------
	// 5. getStaffById
	// -----------------------------------------------------
	getStaffById: publicProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ input, ctx }) => {
			try {
				const staff = await ctx.prisma.staff.findUnique({
					include: {
						immunizations: true,
						user: true,
					},
					where: { id: input.id },
				})

				if (!staff) {
					throw new TRPCError({
						code: 'NOT_FOUND',
						message: 'Staff member not found.',
					})
				}

				return { data: staff, success: true }
			} catch (error) {
				console.error('[getStaffById]', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to retrieve staff member.',
				})
			}
		}),

	// -----------------------------------------------------
	// 3. updateStaff
	// -----------------------------------------------------
	updateStaff: adminProcedure
		.input(staffUpdateSchema)
		.mutation(async ({ input, ctx }) => {
			try {
				const { id, ...data } = input

				const updated = await ctx.prisma.staff.update({
					data: {
						...data,
						updatedAt: new Date(),
					},
					where: { id },
				})

				return { data: updated, error: true, success: true }
			} catch (error) {
				console.error('[updateStaff]', error)
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to update staff member.',
				})
			}
		}),
})
