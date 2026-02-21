// src/app/dashboard/patients/new/page.tsx (Server Component)
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { auth } from '@/lib/auth'

import NewPatientClient from './new-patient-client'

export default async function NewPatientPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	})

	if (!session?.user) {
		redirect('/login')
	}

	const clinicId = session.user.clinic?.id

	if (!clinicId) {
		redirect('/dashboard')
	}

	return <NewPatientClient clinicId={clinicId} />
}
