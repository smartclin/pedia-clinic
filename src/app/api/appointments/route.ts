import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'

import { auth } from '@/auth'

import { db } from '@/prisma'

export async function POST(req: Request) {
  try {
    const session = await auth()

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await req.json()
    const { patientId, doctorId, appointmentDate, status } = body

    if (!patientId || !doctorId || !appointmentDate) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    const appointment = await db.appointment.create({
      data: {
        date: new Date(appointmentDate), // Ensure appointmentDate is passed as a valid Date object
        status: status || 'SCHEDULED',
        type: 'CHECKUP',
        patient: {
          connect: { id: patientId }, // Use 'connect' to link existing patient
        },
        doctor: {
          connect: { id: doctorId }, // Use 'connect' to link existing doctor
        },
      },
    })

    return NextResponse.json(appointment)
  } catch (error) {
    console.error('[APPOINTMENTS_POST]', error)

    return new NextResponse('Internal error', { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth()

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const patientId = searchParams.get('patientId')
    const doctorId = searchParams.get('doctorId')
    const date = searchParams.get('date')

    // Explicitly type whereClause as Prisma's AppointmentWhereInput
    const whereClause: Prisma.AppointmentWhereInput = {}

    if (patientId) {
      const parsedPatientId = parseInt(patientId, 10)
      if (!isNaN(parsedPatientId)) {
        whereClause.patientId = parsedPatientId
      }
    }

    if (doctorId) {
      const parsedDoctorId = parseInt(doctorId, 10)
      if (!isNaN(parsedDoctorId)) {
        whereClause.doctorId = parsedDoctorId
      }
    }

    if (date) {
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)

      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)

      whereClause.date = {
        gte: startDate,
        lte: endDate,
      }
    }

    const appointments = await db.appointment.findMany({
      where: whereClause, // ✅ Now correctly typed
      include: {
        patient: true,
        doctor: true,
      },
      orderBy: {
        date: 'asc',
      },
    })

    return NextResponse.json(appointments)
  } catch (error) {
    console.error('[APPOINTMENTS_GET]', error)

    return new NextResponse('Internal error', { status: 500 })
  }
}
