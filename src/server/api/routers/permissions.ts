import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { createTRPCRouter, protectedProcedure } from '../trpc'

export const permissionsRouter = createTRPCRouter({
	listRoles: protectedProcedure
		.input(z.object({ clinicId: z.string() }))
		.query(async ({ ctx, input }) => {
			if (!ctx.user) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			// Check if user is member
			const membership = await ctx.prisma.clinicMember.findFirst({
				where: {
					clinicId: input.clinicId,
					userId: ctx.user.id,
				},
			})

			if (!membership) {
				throw new TRPCError({ code: 'FORBIDDEN' })
			}

			return ctx.prisma.role.findMany({
				where: { clinicId: input.clinicId },
				orderBy: { createdAt: 'asc' },
			})
		}),

	createRole: protectedProcedure
		.input(
			z.object({
				clinicId: z.string(),
				name: z.string().min(1).max(100),
				description: z.string().max(500).optional(),
				permissions: z.array(z.string()),
			})
		)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.user) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			// Check permissions
			const membership = await ctx.prisma.clinicMember.findFirst({
				where: {
					clinicId: input.clinicId,
					userId: ctx.user.id,
				},
				include: {
					role: true,
				},
			})

			if (!membership) {
				throw new TRPCError({ code: 'FORBIDDEN' })
			}

			const hasPermission =
				(membership.role.permissions as string).includes('*') ||
				(membership.role.permissions as string).includes('role:create')

			if (!hasPermission) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'Insufficient permissions',
				})
			}

			return ctx.prisma.role.create({
				data: {
					clinicId: input.clinicId,
					name: input.name,
					description: input.description,
					permissions: input.permissions,
				},
			})
		}),

	updateRole: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().min(1).max(100).optional(),
				description: z.string().max(500).optional(),
				permissions: z.array(z.string()).optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.user) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			const role = await ctx.prisma.role.findUnique({
				where: { id: input.id },
				include: {
					clinic: {
						include: {
							clinicMembers: {
								where: { userId: ctx.user.id },
								include: { role: true },
							},
						},
					},
				},
			})

			if (!role) {
				throw new TRPCError({ code: 'NOT_FOUND' })
			}

			if (role.isSystem) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'Cannot modify system role',
				})
			}

			const membership = role.clinic.clinicMembers[0]
			if (!membership) {
				throw new TRPCError({ code: 'FORBIDDEN' })
			}

			const hasPermission =
				(membership.role.permissions as string).includes('*') ||
				(membership.role.permissions as string).includes('role:update')

			if (!hasPermission) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'Insufficient permissions',
				})
			}

			return ctx.prisma.role.update({
				where: { id: input.id },
				data: {
					name: input.name,
					description: input.description,
					permissions: input.permissions,
				},
			})
		}),

	deleteRole: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (!ctx.user) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			const role = await ctx.prisma.role.findUnique({
				where: { id: input.id },
				include: {
					clinic: {
						include: {
							clinicMembers: {
								where: { userId: ctx.user.id },
								include: { role: true },
							},
						},
					},
				},
			})

			if (!role) {
				throw new TRPCError({ code: 'NOT_FOUND' })
			}

			if (role.isSystem) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'Cannot delete system role',
				})
			}

			const membership = role.clinic.clinicMembers[0]
			if (!membership) {
				throw new TRPCError({ code: 'FORBIDDEN' })
			}

			const hasPermission =
				(membership.role.permissions as string).includes('*') ||
				(membership.role.permissions as string).includes('role:delete')

			if (!hasPermission) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'Insufficient permissions',
				})
			}

			return ctx.prisma.role.delete({
				where: { id: input.id },
			})
		}),
})
