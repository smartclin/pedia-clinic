// app/test/health/page.tsx

import { Suspense } from 'react'

import { SystemHealthBanner } from '@/components/home/system-health'
import { HealthCheck } from '@/components/home/tech-stack'

export default function TestHealthPage() {
	return (
		<div className='container mx-auto py-8'>
			<h1 className='mb-8 font-bold text-3xl'>System Health Test Page</h1>

			<div className='space-y-8'>
				<section>
					<h2 className='mb-4 font-semibold text-xl'>
						Standalone Health Check
					</h2>
					<Suspense fallback={<div>Loading health check...</div>}>
						<HealthCheck />
					</Suspense>
				</section>

				<section>
					<h2 className='mb-4 font-semibold text-xl'>
						Banner with Collapsible
					</h2>
					<Suspense fallback={<div>Loading banner...</div>}>
						<SystemHealthBanner />
					</Suspense>
				</section>
			</div>
		</div>
	)
}
