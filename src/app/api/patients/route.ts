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
    const { firstName, lastName, dateOfBirth, gender, contactInfo } = body

    if (!firstName || !lastName || !dateOfBirth || !gender || !contactInfo) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    // Assuming contactInfo contains phone, email, and address
    const { phone, email, address } = contactInfo

    const patient = await db.patient.create({
      data: {
        firstName,
        lastName,
        dateOfBirth,
        gender,
        phone,
        email,
        address,
      },
    })

    return NextResponse.json(patient)
  } catch (error) {
    console.error('[PATIENTS_POST]', error)

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
    const query = searchParams.get('query')

    let patients

    if (query) {
      patients = await db.patient.findMany({
        where: {
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
          ],
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    } else {
      patients = await db.patient.findMany({
        orderBy: {
          createdAt: 'desc',
        },
      })
    }

    return NextResponse.json(patients)
  } catch (error) {
    console.error('[PATIENTS_GET]', error)

    return new NextResponse('Internal error', { status: 500 })
  }
}
