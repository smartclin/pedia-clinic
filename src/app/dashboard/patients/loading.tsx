// src/app/dashboard/patients/loading.tsx
import { PatientSkeleton } from '@/components/patients/patient-skeleton'

export default function PatientsLoading() {
	// Create an array of 5 items to map over for the skeletons
	const skeletonItems = Array.from({ length: 5 }, (_, i) => i)

	return (
		<div className='p-4 md:p-8'>
			{/* Header Skeleton */}
			<div className='mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<div>
					<div className='mb-2 h-9 w-48 animate-pulse rounded-md bg-muted' />
					<div className='h-5 w-72 animate-pulse rounded-md bg-muted' />
				</div>
				<div className='h-10 w-36 animate-pulse rounded-md bg-muted' />
			</div>

			{/* Table/List Skeleton */}
			<div className='rounded-md border'>
				<div className='border-b p-4'>
					<div className='h-6 w-32 animate-pulse rounded-md bg-muted' />
				</div>
				<div className='p-4'>
					<div className='space-y-4'>
						{skeletonItems.map(key => (
							<PatientSkeleton key={key} />
						))}
					</div>
				</div>
			</div>
		</div>
	)
}
