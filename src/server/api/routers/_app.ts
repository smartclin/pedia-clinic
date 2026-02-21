import {
	createCallerFactory,
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from '../trpc'
import { adminRouter } from './admin.router'
import { analyticsRouter } from './analytics'
import { apiKeysRouter } from './api-keys'
import { appointmentRouter } from './appointment.router'
import { authRouter } from './auth-router'
import { workspaceRouter } from './clinic'
import { clinicRouter } from './clinic.router'
import { dashboardRouter } from './dashboard'
import { doctorRouter } from './doctor.router'
import { feedbackRouter } from './feedback'
import { growthRouter } from './growth.router'
import { healthRouter } from './health'
import { invitationsRouter } from './invitations'
import { maintenanceRouter } from './maintenance'
import { medicalRouter } from './medical.router'
import { notificationsRouter } from './notifications'
import { patientRouter } from './patient.router'
import { paymentsRouter } from './payment.router'
import { permissionsRouter } from './permissions'
import { searchRouter } from './search'
import { serviceRouter } from './service.router'
import { staffRouter } from './staff'
import { storageRouter } from './storage'
import { themeRouter } from './theme'
import { userRouter } from './user'

export const appRouter = createTRPCRouter({
	admin: adminRouter,
	appointment: appointmentRouter,
	auth: authRouter,
	clinic: clinicRouter,
	dashboard: dashboardRouter,
	doctor: doctorRouter,
	growth: growthRouter,
	health: healthRouter,
	healthCheck: publicProcedure.query(() => {
		return 'OK'
	}),
	medical: medicalRouter,
	notification: notificationsRouter,
	patient: patientRouter,
	payment: paymentsRouter,
	privateData: protectedProcedure.query(({ ctx }) => {
		return {
			message: 'This is private',
			user: ctx.session?.user,
		}
	}),
	search: searchRouter,
	service: serviceRouter,
	staff: staffRouter,
	storage: storageRouter,
	user: userRouter,

	workspace: workspaceRouter,
	permissions: permissionsRouter,
	invitations: invitationsRouter,
	notifications: notificationsRouter,
	analytics: analyticsRouter,
	theme: themeRouter,
	maintenance: maintenanceRouter,
	apiKeys: apiKeysRouter,
	feedback: feedbackRouter,
})

export type AppRouter = typeof appRouter
export const createCaller = createCallerFactory(appRouter)
