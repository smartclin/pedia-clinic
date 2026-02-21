import { z } from 'zod'

import { createTRPCRouter, protectedProcedure } from '../trpc'

const recentSchema = z.object({
	cursor: z.string().optional(),
	limit: z.number().min(1).max(50).default(10),
})

const markAsReadSchema = z.object({
	id: z.string(),
})

export const notificationsRouter = createTRPCRouter({
	/**
	 * Delete notification
	 */
	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.user?.id
			const { id } = input

			await ctx.prisma.notification.delete({
				where: {
					id,
					userId, // Ensure ownership
				},
			})

			return { success: true }
		}),

	/**
	 * Mark all notifications as read
	 */
	markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
		const userId = ctx.user?.id

		await ctx.prisma.notification.updateMany({
			data: {
				read: true,
				readAt: new Date(),
			},
			where: {
				read: false,
				userId,
			},
		})

		return { success: true }
	}),

	/**
	 * Mark notification as read
	 */
	markAsRead: protectedProcedure
		.input(markAsReadSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.user?.id
			const { id } = input

			await ctx.prisma.notification.update({
				data: {
					read: true,
					readAt: new Date(),
				},
				where: {
					id,
					userId, // Ensure ownership
				},
			})

			return { success: true }
		}),
	/**
	 * Get recent notifications
	 */
	recent: protectedProcedure
		.input(recentSchema)
		.query(async ({ ctx, input }) => {
			const userId = ctx.user?.id
			const { limit, cursor } = input

			const notifications = await ctx.prisma.notification.findMany({
				cursor: cursor ? { id: cursor } : undefined,
				orderBy: { createdAt: 'desc' },
				take: limit + 1,
				where: { userId },
			})

			let nextCursor: typeof cursor | undefined
			if (notifications.length > limit) {
				const nextItem = notifications.pop()
				nextCursor = nextItem?.id
			}

			return {
				items: notifications,
				nextCursor,
			}
		}),

	/**
	 * Get unread count
	 */
	unreadCount: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.user?.id

		const count = await ctx.prisma.notification.count({
			where: {
				read: false,
				userId,
			},
		})

		return count
	}),
})
