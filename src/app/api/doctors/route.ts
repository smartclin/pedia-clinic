import { NextResponse } from 'next/server'

import { auth } from '@/auth'
import { db } from '@/prisma'

export async function GET() {
  try {
    const session = await auth()

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const doctors = await db.doctor.findMany({
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(doctors)
  } catch (error) {
    console.error('[DOCTORS_GET]', error)
    return new NextResponse('Internal error', { status: 500 })
  }
}
