import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { createTRPCRouter, protectedProcedure } from '../trpc'
import {
	getClinicStats,
	getClinicWithMembers,
	verifyMembershipWithRole,
} from '../utils/db-helpers'

export const workspaceRouter = createTRPCRouter({
	ensureDefault: protectedProcedure.mutation(async ({ ctx }) => {
		if (!ctx.user) {
			throw new TRPCError({ code: 'UNAUTHORIZED' })
		}

		// Check if user already has a workspace
		const existingMembership = await ctx.prisma.clinicMember.findFirst({
			where: { userId: ctx.user.id },
		})

		if (existingMembership) {
			// User already has a workspace
			return { created: false, workspaceId: existingMembership.clinicId }
		}

		// Generate a unique slug from user's email or name
		const baseSlug = ctx.user.email
			.split('@')[0]
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '')
			.slice(0, 30)

		// Ensure slug is unique
		let slug = baseSlug
		let counter = 1
		while (
			await ctx.prisma.clinic.findUnique({
				where: { slug },
			})
		) {
			slug = `${baseSlug}-${counter}`
			counter++
		}

		// Create default workspace using a transaction
		const workspaceName =
			ctx.user.name || `${ctx.user.email.split('@')[0]}'s Workspace`

		const result = await ctx.prisma.$transaction(async tx => {
			// Create the clinic
			const clinic = await tx.clinic.create({
				data: {
					name: workspaceName,
					slug,
					description: 'My default workspace',
				},
			})

			// Create default roles
			const ownerRole = await tx.role.create({
				data: {
					clinicId: clinic.id,
					name: 'Owner',
					description: 'Workspace owner with full access',
					permissions: ['*'], // All permissions
					isSystem: true,
				},
			})

			await tx.role.create({
				data: {
					clinicId: clinic.id,
					name: 'Admin',
					description: 'Can manage members and settings',
					permissions: [
						'member:read',
						'member:create',
						'member:update',
						'member:delete',
						'role:read',
						'workspace:read',
						'workspace:update',
					],
					isSystem: true,
				},
			})

			await tx.role.create({
				data: {
					clinicId: clinic.id,
					name: 'Member',
					description: 'Can create and edit resources',
					permissions: ['member:read', 'workspace:read'],
					isSystem: true,
				},
			})

			await tx.role.create({
				data: {
					clinicId: clinic.id,
					name: 'Viewer',
					description: 'Read-only access',
					permissions: ['member:read', 'workspace:read'],
					isSystem: true,
				},
			})

			// Create the membership with Owner role
			await tx.clinicMember.create({
				data: {
					clinicId: clinic.id,
					userId: ctx.user.id,
					roleId: ownerRole.id,
				},
			})

			return clinic
		})

		return { created: true, workspaceId: result.id }
	}),

	list: protectedProcedure.query(async ({ ctx }) => {
		if (!ctx.user) {
			throw new TRPCError({ code: 'UNAUTHORIZED' })
		}

		const memberships = await ctx.prisma.clinicMember.findMany({
			where: {
				userId: ctx.user.id,
				clinic: {
					archived: false, // Exclude archived workspaces
				},
			},
			include: {
				clinic: true,
				role: true,
			},
		})

		return memberships.map(m => ({
			id: m.clinic.id,
			name: m.clinic.name,
			slug: m.clinic.slug,
			description: m.clinic.description,
			logo: m.clinic.logo,
			role: m.role,
			joinedAt: m.joinedAt,
		}))
	}),

	listArchived: protectedProcedure.query(async ({ ctx }) => {
		if (!ctx.user) {
			throw new TRPCError({ code: 'UNAUTHORIZED' })
		}

		const memberships = await ctx.prisma.clinicMember.findMany({
			where: {
				userId: ctx.user.id,
				clinic: {
					archived: true, // Only archived workspaces
				},
			},
			include: {
				clinic: true,
				role: true,
			},
		})

		return memberships.map(m => ({
			id: m.clinic.id,
			name: m.clinic.name,
			slug: m.clinic.slug,
			description: m.clinic.description,
			logo: m.clinic.logo,
			archived: m.clinic.archived,
			archivedAt: m.clinic.archivedAt,
			archivedBy: m.clinic.archivedBy,
			role: m.role,
			joinedAt: m.joinedAt,
		}))
	}),

	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			if (!ctx.user) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			// Use optimized helper that fetches only necessary fields
			const clinic = await getClinicWithMembers(
				ctx.prisma,
				input.id,
				ctx.user.id
			)

			if (!clinic) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Workspace not found',
				})
			}

			return clinic
		}),

	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1).max(100),
				slug: z
					.string()
					.min(1)
					.max(50)
					.regex(/^[a-z0-9-]+$/),
				description: z.string().max(500).optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.user) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			// Check if slug is already taken
			const existing = await ctx.prisma.clinic.findUnique({
				where: { slug: input.slug },
			})

			if (existing) {
				throw new TRPCError({
					code: 'CONFLICT',
					message: 'Workspace slug already exists',
				})
			}

			// Create clinic with owner role using transaction
			const clinic = await ctx.prisma.$transaction(async tx => {
				// Create the clinic
				const org = await tx.clinic.create({
					data: {
						name: input.name,
						slug: input.slug,
						description: input.description,
					},
				})

				// Create default roles
				const ownerRole = await tx.role.create({
					data: {
						clinicId: org.id,
						name: 'Owner',
						description: 'Workspace owner with full access',
						permissions: ['*'], // All permissions
						isSystem: true,
					},
				})

				await tx.role.create({
					data: {
						clinicId: org.id,
						name: 'Admin',
						description: 'Can manage members and settings',
						permissions: [
							'member:read',
							'member:create',
							'member:update',
							'member:delete',
							'role:read',
							'workspace:read',
							'workspace:update',
						],
						isSystem: true,
					},
				})

				await tx.role.create({
					data: {
						clinicId: org.id,
						name: 'Member',
						description: 'Can create and edit resources',
						permissions: ['member:read', 'workspace:read'],
						isSystem: true,
					},
				})

				await tx.role.create({
					data: {
						clinicId: org.id,
						name: 'Viewer',
						description: 'Read-only access',
						permissions: ['member:read', 'workspace:read'],
						isSystem: true,
					},
				})

				// Create the membership with Owner role
				await tx.clinicMember.create({
					data: {
						clinicId: org.id,
						userId: ctx.user.id,
						roleId: ownerRole.id,
					},
				})

				// Return clinic with members included
				return tx.clinic.findUnique({
					where: { id: org.id },
					include: {
						clinicMembers: {
							include: {
								user: true,
								role: true,
							},
						},
					},
				})
			})

			return clinic
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().min(1).max(100).optional(),
				description: z.string().max(500).optional(),
				logo: z.url().optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.user) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			// Check if user is member of workspace
			const membership = await ctx.prisma.clinicMember.findFirst({
				where: {
					clinicId: input.id,
					userId: ctx.user.id,
				},
				include: {
					role: true,
				},
			})

			if (!membership) {
				throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member' })
			}

			// Check permissions (simplified - you can enhance this)
			const permissions = (membership.role.permissions as string[]) || []
			const hasPermission =
				permissions.includes('*') || permissions.includes('clinic:update')

			if (!hasPermission) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'Insufficient permissions',
				})
			}

			return ctx.prisma.clinic.update({
				where: { id: input.id },
				data: {
					name: input.name,
					description: input.description,
					logo: input.logo,
				},
			})
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (!ctx.user) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			// Check if user is owner
			const membership = await ctx.prisma.clinicMember.findFirst({
				where: {
					clinicId: input.id,
					userId: ctx.user.id,
				},
				include: {
					role: true,
				},
			})

			if (
				!membership ||
				!(membership.role.permissions as string[]).includes('*')
			) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'Only owners can delete',
				})
			}

			return ctx.prisma.clinic.delete({
				where: { id: input.id },
			})
		}),

	updateMemberRole: protectedProcedure
		.input(
			z.object({
				clinicId: z.string(),
				userId: z.string(),
				roleId: z.string(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.user) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			// Check caller's permissions
			const callerMembership = await ctx.prisma.clinicMember.findFirst({
				where: {
					clinicId: input.clinicId,
					userId: ctx.user.id,
				},
				include: {
					role: true,
				},
			})

			if (!callerMembership) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'Not a member of this workspace',
				})
			}

			const hasPermission =
				(callerMembership.role.permissions as string).includes('*') ||
				(callerMembership.role.permissions as string).includes('member:manage')

			if (!hasPermission) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'Insufficient permissions to manage members',
				})
			}

			// Verify role exists and belongs to the clinic
			const role = await ctx.prisma.role.findFirst({
				where: {
					id: input.roleId,
					clinicId: input.clinicId,
				},
			})

			if (!role) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Role not found in this workspace',
				})
			}

			// Verify target member exists
			const targetMembership = await ctx.prisma.clinicMember.findFirst({
				where: {
					clinicId: input.clinicId,
					userId: input.userId,
				},
				include: {
					role: true,
				},
			})

			if (!targetMembership) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Member not found in this workspace',
				})
			}

			// Prevent demoting the last owner
			if ((targetMembership.role.permissions as string[]).includes('*')) {
				const ownerCount = await ctx.prisma.clinicMember.count({
					where: {
						clinicId: input.clinicId,
						role: {
							permissions: {
								equals: ['*'],
							},
						},
					},
				})

				if (ownerCount <= 1 && !(role.permissions as string).includes('*')) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'Cannot demote the last owner',
					})
				}
			}

			// Update member role
			const updatedMember = await ctx.prisma.clinicMember.update({
				where: { id: targetMembership.id },
				data: { roleId: input.roleId },
				include: {
					user: true,
					role: true,
				},
			})

			// Create audit log
			await ctx.prisma.auditLog.create({
				data: {
					userId: ctx.user.id,
					clinicId: input.clinicId,
					action: 'member.role_updated',
					resource: 'member',
					model: 'member',
					level: 'info',
					resourceId: updatedMember.id,
					metadata: {
						targetUserId: input.userId,
						oldRoleId: targetMembership.roleId,
						newRoleId: input.roleId,
						oldRoleName: targetMembership.role.name,
						newRoleName: role.name,
					},
					ipAddress: ctx.req?.headers.get('x-forwarded-for') || undefined,
					userAgent: ctx.req?.headers.get('user-agent') || undefined,
				},
			})

			return updatedMember
		}),

	removeMember: protectedProcedure
		.input(
			z.object({
				clinicId: z.string(),
				userId: z.string(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.user) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			// Check caller's permissions
			const callerMembership = await ctx.prisma.clinicMember.findFirst({
				where: {
					clinicId: input.clinicId,
					userId: ctx.user.id,
				},
				include: {
					role: true,
				},
			})

			if (!callerMembership) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'Not a member of this workspace',
				})
			}

			const hasPermission =
				(callerMembership.role.permissions as string).includes('*') ||
				(callerMembership.role.permissions as string).includes('member:remove')

			if (!hasPermission) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'Insufficient permissions to remove members',
				})
			}

			// Verify target member exists
			const targetMembership = await ctx.prisma.clinicMember.findFirst({
				where: {
					clinicId: input.clinicId,
					userId: input.userId,
				},
				include: {
					role: true,
					user: true,
				},
			})

			if (!targetMembership) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Member not found in this workspace',
				})
			}

			// Prevent removing the last owner
			if ((targetMembership.role.permissions as string[]).includes('*')) {
				const ownerCount = await ctx.prisma.clinicMember.count({
					where: {
						clinicId: input.clinicId,
						role: {
							permissions: {
								equals: ['*'],
							},
						},
					},
				})

				if (ownerCount <= 1) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'Cannot remove the last owner',
					})
				}
			}

			// Delete member
			await ctx.prisma.clinicMember.delete({
				where: { id: targetMembership.id },
			})

			// Create audit log
			await ctx.prisma.auditLog.create({
				data: {
					userId: ctx.user.id,
					clinicId: input.clinicId,
					action: 'member.removed',
					resource: 'member',
					level: 'info',
					model: 'member',
					resourceId: targetMembership.id,
					metadata: {
						targetUserId: input.userId,
						targetUserEmail: targetMembership.user.email,
						targetUserName: targetMembership.user.name,
						roleName: targetMembership.role.name,
					},
					ipAddress: ctx.req?.headers.get('x-forwarded-for') || undefined,
					userAgent: ctx.req?.headers.get('user-agent') || undefined,
				},
			})

			return { success: true }
		}),

	transferOwnership: protectedProcedure
		.input(
			z.object({
				clinicId: z.string(),
				newOwnerId: z.string(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.user) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			// Verify caller is current owner
			const callerMembership = await ctx.prisma.clinicMember.findFirst({
				where: {
					clinicId: input.clinicId,
					userId: ctx.user.id,
				},
				include: {
					role: true,
				},
			})

			if (!callerMembership) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'Not a member of this workspace',
				})
			}

			// Only owners (users with '*' permission) can transfer ownership
			if (!(callerMembership.role.permissions as string[]).includes('*')) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'Only owners can transfer ownership',
				})
			}

			// Verify target user is a member
			const targetMembership = await ctx.prisma.clinicMember.findFirst({
				where: {
					clinicId: input.clinicId,
					userId: input.newOwnerId,
				},
				include: {
					role: true,
					user: true,
				},
			})

			if (!targetMembership) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Target user is not a member of this workspace',
				})
			}

			// Don't allow transferring to someone who's already an owner
			if ((targetMembership.role.permissions as string[]).includes('*')) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Target user is already an owner',
				})
			}

			// Find or create Owner role
			let ownerRole = await ctx.prisma.role.findFirst({
				where: {
					clinicId: input.clinicId,
					permissions: {
						equals: ['*'],
					},
					isSystem: true,
				},
			})

			if (!ownerRole) {
				// Create owner role if it doesn't exist
				ownerRole = await ctx.prisma.role.create({
					data: {
						clinicId: input.clinicId,
						name: 'Owner',
						description: 'Workspace owner with full access',
						permissions: ['*'],
						isSystem: true,
					},
				})
			}

			// Find or create Admin role for demoted owner
			let adminRole = await ctx.prisma.role.findFirst({
				where: {
					clinicId: input.clinicId,
					name: 'Admin',
					isSystem: true,
				},
			})

			if (!adminRole) {
				// Create admin role if it doesn't exist
				adminRole = await ctx.prisma.role.create({
					data: {
						clinicId: input.clinicId,
						name: 'Admin',
						description: 'Workspace administrator',
						permissions: [
							'workspace:update',
							'member:invite',
							'member:manage',
							'member:remove',
						],
						isSystem: true,
					},
				})
			}

			// Perform the transfer in a transaction
			const result = await ctx.prisma.$transaction(async tx => {
				// Demote current owner to admin
				await tx.clinicMember.update({
					where: { id: callerMembership.id },
					data: { roleId: adminRole.id },
				})

				// Promote new owner
				await tx.clinicMember.update({
					where: { id: targetMembership.id },
					data: { roleId: ownerRole.id },
				})

				return { success: true }
			})

			// Create audit log
			await ctx.prisma.auditLog.create({
				data: {
					userId: ctx.user.id,
					clinicId: input.clinicId,
					action: 'workspace.ownership_transferred',
					resource: 'workspace',
					level: 'info',
					model: 'workspace',
					resourceId: input.clinicId,
					metadata: {
						previousOwnerId: ctx.user.id,
						previousOwnerEmail: ctx.user.email,
						newOwnerId: input.newOwnerId,
						newOwnerEmail: targetMembership.user.email,
						newOwnerName: targetMembership.user.name,
					},
					ipAddress: ctx.req?.headers.get('x-forwarded-for') || undefined,
					userAgent: ctx.req?.headers.get('user-agent') || undefined,
				},
			})

			// TODO: Send email notifications to both users

			return result
		}),

	// Bulk Operations
	bulkUpdateMemberRoles: protectedProcedure
		.input(
			z.object({
				clinicId: z.string(),
				updates: z.array(
					z.object({
						userId: z.string(),
						roleId: z.string(),
					})
				),
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

			const permissions = (membership.role.permissions as string[]) || []
			const hasPermission =
				permissions.includes('*') || permissions.includes('member:manage')

			if (!hasPermission) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'Insufficient permissions to manage members',
				})
			}

			// Process all updates
			const results = await Promise.allSettled(
				input.updates.map(async update => {
					// Verify target member exists
					const targetMember = await ctx.prisma.clinicMember.findFirst({
						where: {
							clinicId: input.clinicId,
							userId: update.userId,
						},
						include: {
							user: true,
							role: true,
						},
					})

					if (!targetMember) {
						throw new Error(`Member ${update.userId} not found`)
					}

					// Verify role exists
					const role = await ctx.prisma.role.findUnique({
						where: { id: update.roleId },
					})

					if (!role || role.clinicId !== input.clinicId) {
						throw new Error('Invalid role')
					}

					// Prevent changing your own role
					if (update.userId === ctx.user.id) {
						throw new Error('Cannot change your own role')
					}

					// Update role
					return ctx.prisma.clinicMember.update({
						where: { id: targetMember.id },
						data: { roleId: update.roleId },
					})
				})
			)

			// Create audit log
			await ctx.prisma.auditLog.create({
				data: {
					userId: ctx.user.id,
					clinicId: input.clinicId,
					action: 'bulk_members_role_updated',
					resource: 'member',
					level: 'info',
					model: 'member',
					resourceId: input.clinicId,
					metadata: JSON.stringify({
						totalUpdates: input.updates.length,
						successCount: results.filter(r => r.status === 'fulfilled').length,
						failCount: results.filter(r => r.status === 'rejected').length,
					}),
				},
			})

			// Format results
			const successful = results
				.filter(r => r.status === 'fulfilled')
				.map(r => r.status === 'fulfilled' && r.value)

			const failed = results
				.map((r, i) =>
					r.status === 'rejected'
						? {
								userId: input.updates[i].userId,
								reason: r.reason.message,
							}
						: undefined
				)
				.filter(Boolean)

			return {
				success: true,
				totalCount: input.updates.length,
				successCount: successful.length,
				failCount: failed.length,
				failed,
			}
		}),

	bulkRemoveMembers: protectedProcedure
		.input(
			z.object({
				clinicId: z.string(),
				userIds: z.array(z.string()),
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

			const permissions = (membership.role.permissions as string[]) || []
			const hasPermission =
				permissions.includes('*') || permissions.includes('member:remove')

			if (!hasPermission) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'Insufficient permissions to remove members',
				})
			}

			// Check if trying to remove self
			if (input.userIds.includes(ctx.user.id)) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Cannot remove yourself from the workspace',
				})
			}

			// Process all removals
			const results = await Promise.allSettled(
				input.userIds.map(async userId => {
					// Verify member exists
					const targetMember = await ctx.prisma.clinicMember.findFirst({
						where: {
							clinicId: input.clinicId,
							userId,
						},
						include: {
							user: true,
							role: true,
						},
					})

					if (!targetMember) {
						throw new Error(`Member ${userId} not found`)
					}

					// Check if removing the last owner
					if ((targetMember.role.permissions as string[]).includes('*')) {
						const ownerCount = await ctx.prisma.clinicMember.count({
							where: {
								clinicId: input.clinicId,
								role: {
									permissions: {
										equals: ['*'],
									},
								},
							},
						})

						if (ownerCount === 1) {
							throw new Error('Cannot remove the last owner')
						}
					}

					// Remove member
					return ctx.prisma.clinicMember.delete({
						where: { id: targetMember.id },
					})
				})
			)

			// Create audit log
			await ctx.prisma.auditLog.create({
				data: {
					userId: ctx.user.id,
					clinicId: input.clinicId,
					action: 'bulk_members_removed',
					level: 'info',
					model: 'member',
					resourceId: input.clinicId,
					resource: 'member',
					metadata: JSON.stringify({
						totalRemovals: input.userIds.length,
						successCount: results.filter(r => r.status === 'fulfilled').length,
						failCount: results.filter(r => r.status === 'rejected').length,
					}),
				},
			})

			// Format results
			const successful = results
				.filter(r => r.status === 'fulfilled')
				.map(r => r.status === 'fulfilled' && r.value)

			const failed = results
				.map((r, i) =>
					r.status === 'rejected'
						? { userId: input.userIds[i], reason: r.reason.message }
						: undefined
				)
				.filter(Boolean)

			return {
				success: true,
				totalCount: input.userIds.length,
				successCount: successful.length,
				failCount: failed.length,
				failed,
			}
		}),

	// Batch query for team management panel
	// Combines workspace, roles, and current user data in a single query
	getTeamPanelData: protectedProcedure
		.input(z.object({ clinicId: z.string() }))
		.query(async ({ ctx, input }) => {
			if (!ctx.user) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			// Verify membership and get clinic data in parallel
			const [membership, clinic, roles, currentUser] = await Promise.all([
				// Verify access
				verifyMembershipWithRole(ctx.prisma, ctx.user.id, input.clinicId),
				// Get clinic with members (optimized fields)
				ctx.prisma.clinic.findUnique({
					where: { id: input.clinicId },
					include: {
						clinicMembers: {
							include: {
								user: {
									select: {
										id: true,
										name: true,
										email: true,
										image: true,
										createdAt: true,
										banned: true,
									},
								},
								role: true,
							},
						},
						invitations: {
							where: { status: 'PENDING' },
							select: {
								id: true,
								email: true,
								role: true,
								expiresAt: true,
							},
						},
					},
				}),
				// Get all roles for the clinic
				ctx.prisma.role.findMany({
					where: { clinicId: input.clinicId },
					orderBy: { name: 'asc' },
				}),
				// Get current user with minimal data
				ctx.prisma.user.findUnique({
					where: { id: ctx.user.id },
					select: {
						id: true,
						name: true,
						email: true,
						image: true,
						bio: true,
					},
				}),
			])

			if (!clinic) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Workspace not found',
				})
			}

			return {
				clinic,
				roles,
				currentUser,
				currentUserRole: membership.role,
			}
		}),

	// Workspace Usage Metrics
	getWorkspaceUsage: protectedProcedure
		.input(z.object({ clinicId: z.string() }))
		.query(async ({ ctx, input }) => {
			if (!ctx.user) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			// Verify membership and get optimized stats in one go
			await verifyMembershipWithRole(ctx.prisma, ctx.user.id, input.clinicId)

			// Get workspace info
			const clinic = await ctx.prisma.clinic.findUnique({
				where: { id: input.clinicId },
			})

			if (!clinic) {
				throw new TRPCError({ code: 'NOT_FOUND' })
			}

			// Use optimized stats helper that batches all counts
			const stats = await getClinicStats(ctx.prisma, input.clinicId)

			return {
				workspace: {
					id: clinic.id,
					name: clinic.name,
					createdAt: clinic.createdAt,
				},
				metrics: {
					memberCount: stats.memberCount,
					pendingInvitationsCount: stats.pendingInvitations,
					activeInviteLinksCount: stats.activeLinkCount,
					recentActivityCount: stats.recentActivity,
					activeMembersCount: stats.activeMembers,
					activePercentage: stats.activityRate,
				},
			}
		}),

	// Workspace Cloning (Templates)
	cloneWorkspace: protectedProcedure
		.input(
			z.object({
				clinicId: z.string(),
				newName: z.string().min(1).max(100),
				newSlug: z
					.string()
					.min(1)
					.max(50)
					.regex(/^[a-z0-9-]+$/),
			})
		)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.user) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			// Check if user is member of source workspace
			const membership = await ctx.prisma.clinicMember.findFirst({
				where: {
					clinicId: input.clinicId,
					userId: ctx.user.id,
				},
			})

			if (!membership) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'Not a member of source workspace',
				})
			}

			// Get source clinic
			const sourceOrg = await ctx.prisma.clinic.findUnique({
				where: { id: input.clinicId },
			})

			if (!sourceOrg) {
				throw new TRPCError({ code: 'NOT_FOUND' })
			}

			// Check if new slug is available
			const existingOrg = await ctx.prisma.clinic.findUnique({
				where: { slug: input.newSlug },
			})

			if (existingOrg) {
				throw new TRPCError({
					code: 'CONFLICT',
					message: 'Workspace slug already exists',
				})
			}

			// Get all roles from source workspace
			const sourceRoles = await ctx.prisma.role.findMany({
				where: { clinicId: input.clinicId },
			})

			// Clone workspace using transaction
			const newOrg = await ctx.prisma.$transaction(async tx => {
				// Create new clinic with copied settings
				const clinic = await tx.clinic.create({
					data: {
						name: input.newName,
						slug: input.newSlug,
						description: sourceOrg.description,
						logo: sourceOrg.logo,
					},
				})

				// Clone roles
				const roleMapping: Record<string, string> = {}
				let ownerRole = null

				for (const role of sourceRoles) {
					const newRole = await tx.role.create({
						data: {
							clinicId: clinic.id,
							name: role.name,
							description: role.description,
							permissions: role.permissions,
							isSystem: role.isSystem,
						},
					})
					roleMapping[role.id] = newRole.id

					// Track the Owner role if we cloned it
					if (
						role.name === 'Owner' ||
						(role.permissions as string[]).includes('*')
					) {
						ownerRole = newRole
					}
				}

				// If no Owner role was cloned, create one
				if (!ownerRole) {
					ownerRole = await tx.role.create({
						data: {
							clinicId: clinic.id,
							name: 'Owner',
							description: 'Workspace owner with full access',
							permissions: ['*'],
							isSystem: true,
						},
					})
				}

				// Add current user as owner
				await tx.clinicMember.create({
					data: {
						clinicId: clinic.id,
						userId: ctx.user.id,
						roleId: ownerRole.id,
					},
				})

				// Create audit log
				await tx.auditLog.create({
					data: {
						userId: ctx.user.id,
						clinicId: clinic.id,
						level: 'info',
						model: 'clinic',
						resourceId: clinic.id,
						action: 'workspace_created',
						metadata: JSON.stringify({
							clonedFrom: sourceOrg.id,
							clonedFromName: sourceOrg.name,
							rolesCloned: sourceRoles.length,
						}),
					},
				})

				return clinic
			})

			return {
				success: true,
				workspace: newOrg,
				message: 'Workspace cloned successfully',
			}
		}),

	// Workspace Archiving
	archiveWorkspace: protectedProcedure
		.input(z.object({ clinicId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (!ctx.user) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			// Check if user is owner
			const membership = await ctx.prisma.clinicMember.findFirst({
				where: {
					clinicId: input.clinicId,
					userId: ctx.user.id,
				},
				include: {
					role: true,
				},
			})

			if (
				!membership ||
				!(membership.role.permissions as string[]).includes('*')
			) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'Only owners can archive workspaces',
				})
			}

			// Archive the workspace
			const archivedWorkspace = await ctx.prisma.clinic.update({
				where: { id: input.clinicId },
				data: {
					archived: true,
					archivedAt: new Date(),
					archivedBy: ctx.user.id,
				},
			})

			// Create audit log
			await ctx.prisma.auditLog.create({
				data: {
					userId: ctx.user.id,
					clinicId: input.clinicId,
					level: 'info',
					model: 'clinic',
					resourceId: archivedWorkspace.id,
					action: 'workspace_archived',
					metadata: JSON.stringify({
						workspaceName: archivedWorkspace.name,
						archivedAt: archivedWorkspace.archivedAt,
					}),
				},
			})

			return {
				success: true,
				message: 'Workspace archived successfully',
			}
		}),

	unarchiveWorkspace: protectedProcedure
		.input(z.object({ clinicId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (!ctx.user) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			// Check if user is owner
			const membership = await ctx.prisma.clinicMember.findFirst({
				where: {
					clinicId: input.clinicId,
					userId: ctx.user.id,
				},
				include: {
					role: true,
				},
			})

			if (
				!membership ||
				!(membership.role.permissions as string[]).includes('*')
			) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'Only owners can unarchive workspaces',
				})
			}

			// Unarchive the workspace
			const unarchivedWorkspace = await ctx.prisma.clinic.update({
				where: { id: input.clinicId },
				data: {
					archived: false,
					archivedAt: null,
					archivedBy: null,
				},
			})

			// Create audit log
			await ctx.prisma.auditLog.create({
				data: {
					userId: ctx.user.id,
					clinicId: input.clinicId,
					level: 'info',
					model: 'clinic',
					resourceId: unarchivedWorkspace.id,
					action: 'workspace_unarchived',
					metadata: JSON.stringify({
						workspaceName: unarchivedWorkspace.name,
					}),
				},
			})

			return {
				success: true,
				message: 'Workspace unarchived successfully',
			}
		}),
})
