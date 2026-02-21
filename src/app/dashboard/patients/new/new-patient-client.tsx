// src/app/dashboard/patients/new/new-patient-client.tsx
'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { PatientForm } from '@/components/patients/patient-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface NewPatientClientProps {
	clinicId: string
}

export default function NewPatientClient({ clinicId }: NewPatientClientProps) {
	return (
		<DashboardLayout>
			<div className='p-4 md:p-8'>
				<div className='mb-6 flex items-center gap-4'>
					<Button
						asChild
						size='icon'
						variant='ghost'
					>
						<Link href='/dashboard/patients'>
							<ArrowLeft className='h-5 w-5' />
						</Link>
					</Button>
					<h1 className='font-bold text-2xl tracking-tight'>Add New Patient</h1>
				</div>

				<Card className='max-w-3xl'>
					<CardHeader>
						<CardTitle>Patient Information</CardTitle>
					</CardHeader>
					<CardContent>
						<PatientForm clinicId={clinicId} />
					</CardContent>
				</Card>
			</div>
		</DashboardLayout>
	)
}
