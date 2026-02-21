// src/components/patients/patient-skeleton.tsx
'use client'

import { useId } from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'

export function PatientSkeleton() {
	const Id = useId()
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Patient</TableHead>
					<TableHead>Gender</TableHead>
					<TableHead>Age</TableHead>
					<TableHead>Contact</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Last Visit</TableHead>
					<TableHead className='text-right'>Actions</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{Array.from({ length: 5 }).map(_ => (
					<TableRow key={`skeleton-${Id}`}>
						<TableCell>
							<div className='flex items-center gap-3'>
								<Skeleton className='h-8 w-8 rounded-full' />
								<div className='space-y-2'>
									<Skeleton className='h-4 w-32' />
									<Skeleton className='h-3 w-20' />
								</div>
							</div>
						</TableCell>
						<TableCell>
							<Skeleton className='h-4 w-16' />
						</TableCell>
						<TableCell>
							<Skeleton className='h-4 w-20' />
						</TableCell>
						<TableCell>
							<div className='space-y-2'>
								<Skeleton className='h-4 w-28' />
								<Skeleton className='h-3 w-24' />
							</div>
						</TableCell>
						<TableCell>
							<Skeleton className='h-5 w-16 rounded-full' />
						</TableCell>
						<TableCell>
							<Skeleton className='h-4 w-24' />
						</TableCell>
						<TableCell className='text-right'>
							<Skeleton className='ml-auto h-8 w-8' />
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	)
}
