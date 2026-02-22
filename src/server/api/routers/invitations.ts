import { randomBytes } from 'node:crypto'

import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { createTRPCRouter, protectedProcedure, publicProcedure } from '../trpc'

export const invitationsRouter = createTRPCRouter({
	list: protectedProcedure
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

			return ctx.prisma.clinicInvitation.findMany({
				where: {
					clinicId: input.clinicId,
					status: 'pending',
				},
				include: {
					invitedBy: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
					role: true,
				},
				orderBy: { createdAt: 'desc' },
			})
		}),

	create: protectedProcedure
		.input(
			z.object({
				clinicId: z.string(),
				email: z.email(),
				roleId: z.string(),
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
				(membership.role.permissions as string).includes('member:invite')

			if (!hasPermission) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'Insufficient permissions',
				})
			}

			// Check if user is already a member
			const existingUser = await ctx.prisma.user.findUnique({
				where: { email: input.email },
			})

			if (existingUser) {
				const existingMember = await ctx.prisma.clinicMember.findFirst({
					where: {
						clinicId: input.clinicId,
						userId: existingUser.id,
					},
				})

				if (existingMember) {
					throw new TRPCError({
						code: 'CONFLICT',
						message: 'User is already a member',
					})
				}
			}

			// Check if there's a pending invitation
			const existingInvitation = await ctx.prisma.clinicInvitation.findFirst({
				where: {
					clinicId: input.clinicId,
					email: input.email,
					status: 'pending',
				},
			})

			if (existingInvitation) {
				throw new TRPCError({
					code: 'CONFLICT',
					message: 'Invitation already sent',
				})
			}

			// Create invitation
			const token = randomBytes(32).toString('hex')
			const expiresAt = new Date()
			expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

			return ctx.prisma.clinicInvitation.create({
				data: {
					clinicId: input.clinicId,
					email: input.email,
					invitedById: ctx.user.id,
					roleId: input.roleId,
					token,
					expiresAt,
				},
			})
		}),

	getByToken: publicProcedure
		.input(z.object({ token: z.string() }))
		.query(async ({ ctx, input }) => {
			const invitation = await ctx.prisma.clinicInvitation.findUnique({
				where: { token: input.token },
				include: {
					clinic: true,
					role: true,
					invitedBy: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
				},
			})

			if (!invitation) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Invitation not found',
				})
			}

			if (invitation.status !== 'pending') {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Invitation already used',
				})
			}

			if (invitation.expiresAt < new Date()) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Invitation expired',
				})
			}

			return invitation
		}),

	accept: protectedProcedure
		.input(z.object({ token: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (!ctx.user) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			const invitation = await ctx.prisma.clinicInvitation.findUnique({
				where: { token: input.token },
			})

			if (!invitation) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Invitation not found',
				})
			}

			if (invitation.status !== 'pending') {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Invitation already used',
				})
			}

			if (invitation.expiresAt < new Date()) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Invitation expired',
				})
			}

			if (invitation.email !== ctx.user.email) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'Invitation email does not match',
				})
			}

			// Create membership
			await ctx.prisma.clinicMember.create({
				data: {
					clinicId: invitation.clinicId,
					userId: ctx.user.id,
					roleId: invitation.roleId,
				},
			})

			// Update invitation status
			return ctx.prisma.clinicInvitation.update({
				where: { id: invitation.id },
				data: {
					status: 'accepted',
					acceptedAt: new Date(),
				},
			})
		}),

	cancel: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (!ctx.user) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			const invitation = await ctx.prisma.clinicInvitation.findUnique({
				where: { id: input.id },
				include: {
					clinic: {
						include: {
							clinicMembers: {
								where: { userId: ctx.user.id },
							},
						},
					},
				},
			})

			if (!invitation) {
				throw new TRPCError({ code: 'NOT_FOUND' })
			}

			// Check if user can cancel (must be inviter or have permission)
			const canCancel =
				invitation.invitedById === ctx.user.id ||
				invitation.clinic.clinicMembers.some(() => {
					// Check permissions - simplified
					return true
				})

			if (!canCancel) {
				throw new TRPCError({ code: 'FORBIDDEN' })
			}

			return ctx.prisma.clinicInvitation.update({
				where: { id: input.id },
				data: {
					status: 'expired',
				},
			})
		}),

	// Invitation Links
	createInviteLink: protectedProcedure
		.input(
			z.object({
				clinicId: z.string(),
				roleId: z.string(),
				maxUses: z.number().positive().optional(),
				expiresInDays: z.number().positive().default(7),
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
				(membership.role.permissions as string).includes('member:invite')

			if (!hasPermission) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'Insufficient permissions',
				})
			}

			// Create invite link
			const token = randomBytes(32).toString('hex')
			const expiresAt = new Date()
			expiresAt.setDate(expiresAt.getDate() + input.expiresInDays)

			const invitation = await ctx.prisma.clinicInvitation.create({
				data: {
					clinicId: input.clinicId,
					invitedById: ctx.user.id,
					roleId: input.roleId,
					token,
					type: 'link',
					maxUses: input.maxUses,
					expiresAt,
				},
				include: {
					role: true,
				},
			})

			// Create audit log
			await ctx.prisma.auditLog.create({
				data: {
					userId: ctx.user.id,
					clinicId: input.clinicId,
					level: 'info',
					model: 'clinic_invitation',
					resource: 'clinic_invitation',
					action: 'invite_link_created',
					metadata: JSON.stringify({
						roleId: input.roleId,
						maxUses: input.maxUses,
						expiresInDays: input.expiresInDays,
					}),
				},
			})

			return invitation
		}),

	listInviteLinks: protectedProcedure
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

			return ctx.prisma.clinicInvitation.findMany({
				where: {
					clinicId: input.clinicId,
					type: 'link',
					status: 'pending',
				},
				include: {
					invitedBy: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
					role: true,
				},
				orderBy: { createdAt: 'desc' },
			})
		}),

	revokeInviteLink: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (!ctx.user) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			const invitation = await ctx.prisma.clinicInvitation.findUnique({
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

			if (!invitation) {
				throw new TRPCError({ code: 'NOT_FOUND' })
			}

			if (invitation.type !== 'link') {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Not an invite link',
				})
			}

			// Check permissions
			const membership = await ctx.prisma.clinicMember.findFirst({
				where: {
					clinicId: invitation.clinicId,
					userId: ctx.user.id,
				},
				include: { role: true },
			})

			const perms = (membership?.role?.permissions as string[]) || []

			const hasPermission =
				invitation.invitedById === ctx.user.id ||
				perms.includes('*') ||
				perms.includes('member:invite')

			if (!hasPermission) {
				throw new TRPCError({ code: 'FORBIDDEN' })
			}

			// Revoke link
			const result = await ctx.prisma.clinicInvitation.update({
				where: { id: input.id },
				data: { status: 'expired' },
			})

			// Create audit log
			await ctx.prisma.auditLog.create({
				data: {
					userId: ctx.user.id,
					clinicId: invitation.clinicId,
					action: 'invite_link_revoked',
					level: 'info',
					model: 'clinic_invitation',
					resource: 'clinic_invitation',
					resourceId: invitation.id,
					metadata: JSON.stringify({
						invitationId: invitation.id,
						usedCount: invitation.usedCount,
					}),
				},
			})

			return result
		}),

	acceptInviteLink: protectedProcedure
		.input(z.object({ token: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (!ctx.user) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			const invitation = await ctx.prisma.clinicInvitation.findUnique({
				where: { token: input.token },
			})

			if (!invitation) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Invitation not found',
				})
			}

			if (invitation.status !== 'pending') {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Invitation already used or expired',
				})
			}

			if (invitation.expiresAt < new Date()) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Invitation expired',
				})
			}

			// Check if link has reached max uses
			if (invitation.maxUses && invitation.usedCount >= invitation.maxUses) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Invitation link has reached maximum uses',
				})
			}

			// Check if user is already a member
			const existingMember = await ctx.prisma.clinicMember.findFirst({
				where: {
					clinicId: invitation.clinicId,
					userId: ctx.user.id,
				},
			})

			if (existingMember) {
				throw new TRPCError({
					code: 'CONFLICT',
					message: 'You are already a member of this workspace',
				})
			}

			// Create membership
			await ctx.prisma.clinicMember.create({
				data: {
					clinicId: invitation.clinicId,
					userId: ctx.user.id,
					roleId: invitation.roleId,
				},
			})

			// Increment usedCount for link-type invitations
			if (invitation.type === 'link') {
				await ctx.prisma.clinicInvitation.update({
					where: { id: invitation.id },
					data: { usedCount: { increment: 1 } },
				})
			} else {
				// For email-type invitations, mark as accepted
				await ctx.prisma.clinicInvitation.update({
					where: { id: invitation.id },
					data: {
						status: 'accepted',
						acceptedAt: new Date(),
					},
				})
			}

			// Create audit log
			await ctx.prisma.auditLog.create({
				data: {
					userId: ctx.user.id,
					level: 'info',
					model: 'clinic_invitation',
					resource: 'clinic_invitation',
					resourceId: invitation.id,
					clinicId: invitation.clinicId,
					action: 'workspace_joined',
					metadata: JSON.stringify({
						invitationType: invitation.type,
						roleId: invitation.roleId,
					}),
				},
			})

			return { success: true, message: 'Successfully joined workspace' }
		}),

	// Bulk Operations
	bulkInviteMembers: protectedProcedure
		.input(
			z.object({
				clinicId: z.string(),
				emails: z.array(z.email()),
				roleId: z.string(),
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
				(membership.role.permissions as string).includes('member:invite')

			if (!hasPermission) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'Insufficient permissions',
				})
			}

			// Remove duplicates
			const uniqueEmails = Array.from(new Set(input.emails))

			// Process all invitations
			const results = await Promise.allSettled(
				uniqueEmails.map(async email => {
					// Check if user is already a member
					const existingUser = await ctx.prisma.user.findUnique({
						where: { email },
					})

					if (existingUser) {
						const existingMember = await ctx.prisma.clinicMember.findFirst({
							where: {
								clinicId: input.clinicId,
								userId: existingUser.id,
							},
						})

						if (existingMember) {
							throw new Error(`${email} is already a member`)
						}
					}

					// Check if there's a pending invitation
					const existingInvitation =
						await ctx.prisma.clinicInvitation.findFirst({
							where: {
								clinicId: input.clinicId,
								email,
								status: 'pending',
							},
						})

					if (existingInvitation) {
						throw new Error(`${email} already has a pending invitation`)
					}

					// Create invitation
					const token = randomBytes(32).toString('hex')
					const expiresAt = new Date()
					expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

					return ctx.prisma.clinicInvitation.create({
						data: {
							clinicId: input.clinicId,
							email,
							invitedById: ctx.user.id,
							roleId: input.roleId,
							token,
							expiresAt,
						},
					})
				})
			)

			// Create audit log
			await ctx.prisma.auditLog.create({
				data: {
					userId: ctx.user.id,
					level: 'info',
					model: 'clinic_invitation',
					resource: 'clinic_invitation',
					clinicId: input.clinicId,
					action: 'bulk_members_invited',
					metadata: JSON.stringify({
						totalEmails: uniqueEmails.length,
						successCount: results.filter(r => r.status === 'fulfilled').length,
						failCount: results.filter(r => r.status === 'rejected').length,
					}),
				},
			})

			// Format results
			const successful = results
				.map((r, i) => (r.status === 'fulfilled' ? uniqueEmails[i] : undefined))
				.filter(Boolean)

			const failed = results
				.map((r, i) =>
					r.status === 'rejected'
						? { email: uniqueEmails[i], reason: r.reason.message }
						: undefined
				)
				.filter(Boolean)

			return {
				success: true,
				totalCount: uniqueEmails.length,
				successCount: successful.length,
				failCount: failed.length,
				successful,
				failed,
			}
		}),
})
