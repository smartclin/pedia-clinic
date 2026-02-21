// src/app/dashboard/patients/page.tsx (Server Component)
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { auth } from '@/lib/auth'

import PatientsClient from './patients-client'

export default async function PatientsPage() {
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

	return <PatientsClient clinicId={clinicId} />
}
