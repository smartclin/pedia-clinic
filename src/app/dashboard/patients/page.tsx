import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'

import { TableSkeleton } from '@/components/skeletons/table-skeleton'
import { createCaller, HydrateClient } from '@/trpc/server'

import PatientsClient from './patients-client'

interface PageProps {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function PatientsPage({ searchParams }: PageProps) {
	const { page = '1', search = '' } = await searchParams
	const caller = await createCaller()
	const session = await caller.auth.getSession()
	if (!session?.user) {
		redirect('/sign-in')
	}

	const clinicId = session?.user?.clinic?.id

	if (!clinicId) {
		redirect('/dashboard')
	}

	try {
		// Prefetch data for PatientsClient
		await caller.patient.getList({
			page: Number(page),
			limit: 10,
			search: String(search),
			clinicId,
		})

		return (
			<HydrateClient>
				<div className='container mx-auto py-6'>
					<h1 className='mb-6 font-bold text-3xl'>Patients</h1>
					<Suspense
						fallback={
							<TableSkeleton
								columns={6}
								rows={10}
							/>
						}
					>
						<PatientsClient clinicId={clinicId} />
					</Suspense>
				</div>
			</HydrateClient>
		)
	} catch (err) {
		console.error('PatientsPage error:', err)
		notFound()
	}
}

// // src/app/dashboard/patients/page.tsx (Server Component)
// import { headers } from 'next/headers'
// import { redirect } from 'next/navigation'

// import { auth } from '@/lib/auth'

// import PatientsClient from './patients-client'

// export default async function PatientsPage() {
// 	const session = await auth.api.getSession({
// 		headers: await headers(),
// 	})

// 	if (!session?.user) {
// 		redirect('/sign-in')
// 	}

// 	const clinicId = session.user.clinic?.id

// 	if (!clinicId) {
// 		redirect('/dashboard')
// 	}

// 	return <PatientsClient clinicId={clinicId} />
// }
