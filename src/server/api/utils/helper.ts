import { TRPCError } from '@trpc/server'

export const getClinicIdFromContext = (ctx: {
	user: { clinic?: { id: string } } | null
}) => {
	const clinicId = ctx.user?.clinic?.id

	if (!clinicId) {
		throw new TRPCError({
			code: 'FORBIDDEN',
			message: 'Clinic access required',
		})
	}

	return clinicId
}

export const getUserIdFromContext = (ctx: { user: { id: string } | null }) => {
	const userId = ctx.user?.id

	if (!userId) {
		throw new TRPCError({
			code: 'UNAUTHORIZED',
		})
	}

	return userId
}
