import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { db } from '@/prisma'

import { Activity, CalendarDays, ClipboardList, Users } from 'lucide-react'

export default async function DashboardPage() {
  // Get counts for dashboard
  const patientCount = await db.patient.count()
  const appointmentCount = await db.appointment.count()
  const todayAppointments = await db.appointment.count({
    where: {
      date: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
        lt: new Date(new Date().setHours(23, 59, 59, 999)),
      },
    },
  })

  // Get recent appointments
  const recentAppointments = await db.appointment.findMany({
    take: 5,
    orderBy: {
      date: 'desc',
    },
    include: {
      patient: true,
      doctor: true,
    },
  })

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Patients
            </CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patientCount}</div>
            <p className="text-muted-foreground text-xs">Registered patients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Appointments
            </CardTitle>
            <CalendarDays className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appointmentCount}</div>
            <p className="text-muted-foreground text-xs">
              All scheduled appointments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today&apos;s Appointments
            </CardTitle>
            <ClipboardList className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayAppointments}</div>
            <p className="text-muted-foreground text-xs">
              Appointments scheduled for today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Growth Tracking
            </CardTitle>
            <Activity className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Active</div>
            <p className="text-muted-foreground text-xs">
              Growth monitoring system
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Appointments</CardTitle>
            <CardDescription>
              Recent appointments across all doctors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAppointments.map(appointment => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between border-b pb-4">
                  <div className="space-y-1">
                    <p className="text-sm leading-none font-medium">
                      {appointment.patient.firstName}{' '}
                      {appointment.patient.lastName}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Dr. {appointment.doctor.name}{' '}
                      {appointment.doctor.specialization}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`rounded-full px-2 py-1 text-xs ${
                        appointment.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                          : appointment.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
                      }`}>
                      {appointment.status}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {formatDate(appointment.date)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <a
                href="/dashboard/patients/new"
                className="hover:bg-accent flex items-center gap-2 rounded-lg border p-3 text-sm">
                <Users className="h-4 w-4" />
                <span>New Patient</span>
              </a>
              <a
                href="/dashboard/appointments/new"
                className="hover:bg-accent flex items-center gap-2 rounded-lg border p-3 text-sm">
                <CalendarDays className="h-4 w-4" />
                <span>New Appointment</span>
              </a>
              <a
                href="/dashboard/medical-records/new"
                className="hover:bg-accent flex items-center gap-2 rounded-lg border p-3 text-sm">
                <ClipboardList className="h-4 w-4" />
                <span>New Record</span>
              </a>
              <a
                href="/dashboard/growth-charts"
                className="hover:bg-accent flex items-center gap-2 rounded-lg border p-3 text-sm">
                <Activity className="h-4 w-4" />
                <span>Growth Charts</span>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
