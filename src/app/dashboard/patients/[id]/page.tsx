// src/app/dashboard/patients/[id]/page.tsx (Server Component)
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'

import { auth } from '@/lib/auth'

import PatientDetailsClient from './patient-details-client'

interface PageProps {
	params: Promise<{ id: string }>
}

export default async function PatientDetailsPage({ params }: PageProps) {
	const { id } = await params

	const session = await auth.api.getSession({
		headers: await headers(),
	})

	if (!session?.user) {
		notFound()
	}

	const clinicId = session.user.clinic?.id

	if (!clinicId) {
		notFound()
	}

	return (
		<PatientDetailsClient
			clinicId={clinicId}
			patientId={id}
		/>
	)
}
