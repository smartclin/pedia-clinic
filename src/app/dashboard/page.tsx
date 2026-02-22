// app/dashboard/page.tsx (Server Component)
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { auth } from '../../lib/auth'
import DashboardClient from './dashboard'

export default async function DashboardPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	})

	if (!session?.user) {
		redirect('/sign-in')
	}

	return (
		<div>
			<DashboardClient session={session} />
		</div>
	)
}
