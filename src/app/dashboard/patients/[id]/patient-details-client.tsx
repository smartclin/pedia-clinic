// src/app/dashboard/patients/[id]/patient-details-client.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
	Activity,
	AlertTriangle,
	ArrowLeft,
	Calendar,
	Edit,
	FileText,
	Mail,
	MapPin,
	Phone,
	Pill,
} from 'lucide-react'
import Link from 'next/link'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { PatientDetailsSkeleton } from '@/components/patients/patient-details-skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useTRPC } from '@/trpc/client'

interface PatientDetailsClientProps {
	patientId: string
	clinicId: string
}

function calculateAge(dateOfBirth: Date): string {
	const today = new Date()
	const birthDate = new Date(dateOfBirth)
	let age = today.getFullYear() - birthDate.getFullYear()
	const monthDiff = today.getMonth() - birthDate.getMonth()

	if (
		monthDiff < 0 ||
		(monthDiff === 0 && today.getDate() < birthDate.getDate())
	) {
		age--
	}

	if (age < 1) {
		const months = monthDiff < 0 ? 12 + monthDiff : monthDiff
		return `${months} month${months !== 1 ? 's' : ''}`
	}

	return `${age} year${age !== 1 ? 's' : ''}`
}

function getInitials(firstName: string, lastName: string): string {
	return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export default function PatientDetailsClient({
	patientId,
	clinicId: _clinicId,
}: PatientDetailsClientProps) {
	const trpc = useTRPC()

	const { data: patient, isLoading } = useQuery(
		trpc.patient.getFullDataById.queryOptions({ id: patientId })
	)

	const { data: stats } = useQuery(
		trpc.patient.getDashboardStats.queryOptions({ id: patientId })
	)

	if (isLoading) {
		return (
			<DashboardLayout>
				<PatientDetailsSkeleton />
			</DashboardLayout>
		)
	}

	if (!patient) {
		return (
			<DashboardLayout>
				<div className='p-8 text-center'>
					<p className='text-muted-foreground'>Patient not found</p>
					<Button
						asChild
						className='mt-4'
					>
						<Link href='/dashboard/patients'>Back to Patients</Link>
					</Button>
				</div>
			</DashboardLayout>
		)
	}

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
					<h1 className='font-bold text-2xl tracking-tight'>Patient Details</h1>
				</div>

				<div className='grid gap-6 lg:grid-cols-3'>
					<div className='space-y-6 lg:col-span-2'>
						<Card>
							<CardHeader className='flex flex-row items-center justify-between pb-2'>
								<CardTitle>Personal Information</CardTitle>
								<Button
									asChild
									size='sm'
									variant='outline'
								>
									<Link href={`/dashboard/patients/${patientId}/edit`}>
										<Edit className='mr-2 h-4 w-4' />
										Edit
									</Link>
								</Button>
							</CardHeader>
							<CardContent>
								<div className='flex items-start gap-6'>
									<Avatar className='h-20 w-20'>
										<AvatarImage
											alt={patient.firstName}
											src={patient.image ?? undefined}
										/>
										<AvatarFallback
											className='text-white'
											style={{
												backgroundColor: patient.colorCode ?? '#4ECDC4',
											}}
										>
											{getInitials(patient.firstName, patient.lastName)}
										</AvatarFallback>
									</Avatar>
									<div className='flex-1 space-y-1'>
										<h3 className='font-semibold text-xl'>
											{patient.firstName} {patient.lastName}
										</h3>
										<p className='text-muted-foreground'>
											{calculateAge(patient.dateOfBirth)} •{' '}
											{patient.gender === 'MALE' ? 'Male' : 'Female'}
										</p>
										<div className='mt-4 flex flex-wrap gap-4 text-sm'>
											{patient.phone && (
												<div className='flex items-center gap-2'>
													<Phone className='h-4 w-4 text-muted-foreground' />
													{patient.phone}
												</div>
											)}
											{patient.email && (
												<div className='flex items-center gap-2'>
													<Mail className='h-4 w-4 text-muted-foreground' />
													{patient.email}
												</div>
											)}
											{patient.address && (
												<div className='flex items-center gap-2'>
													<MapPin className='h-4 w-4 text-muted-foreground' />
													{patient.address}
												</div>
											)}
										</div>
									</div>
									<Badge
										variant={
											patient.status === 'ACTIVE'
												? 'default'
												: patient.status === 'INACTIVE'
													? 'secondary'
													: 'outline'
										}
									>
										{patient.status?.toLowerCase() ?? 'unknown'}
									</Badge>
								</div>

								<Separator className='my-6' />

								<div className='grid gap-4 sm:grid-cols-2'>
									<div>
										<p className='text-muted-foreground text-sm'>
											Date of Birth
										</p>
										<p className='font-medium'>
											{format(new Date(patient.dateOfBirth), 'MMMM d, yyyy')}
										</p>
									</div>
									<div>
										<p className='text-muted-foreground text-sm'>Blood Group</p>
										<p className='font-medium'>
											{patient.bloodGroup ?? 'Not specified'}
										</p>
									</div>
									<div>
										<p className='text-muted-foreground text-sm'>
											Emergency Contact
										</p>
										<p className='font-medium'>
											{patient.emergencyContactName ?? 'Not specified'}
										</p>
									</div>
									<div>
										<p className='text-muted-foreground text-sm'>
											Emergency Phone
										</p>
										<p className='font-medium'>
											{patient.emergencyContactNumber ?? 'Not specified'}
										</p>
									</div>
								</div>

								{(patient.allergies || patient.medicalConditions) && (
									<>
										<Separator className='my-6' />
										<div className='space-y-4'>
											{patient.allergies && (
												<div className='flex items-start gap-2 rounded-lg bg-red-50 p-3'>
													<AlertTriangle className='h-5 w-5 text-red-500' />
													<div>
														<p className='font-medium text-red-700'>
															Allergies
														</p>
														<p className='text-red-600 text-sm'>
															{patient.allergies}
														</p>
													</div>
												</div>
											)}
											{patient.medicalConditions && (
												<div className='flex items-start gap-2 rounded-lg bg-yellow-50 p-3'>
													<Activity className='h-5 w-5 text-yellow-500' />
													<div>
														<p className='font-medium text-yellow-700'>
															Medical Conditions
														</p>
														<p className='text-sm text-yellow-600'>
															{patient.medicalConditions}
														</p>
													</div>
												</div>
											)}
										</div>
									</>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Medical History</CardTitle>
							</CardHeader>
							<CardContent>
								{patient.medicalHistory ? (
									<p className='text-sm'>{patient.medicalHistory}</p>
								) : (
									<p className='text-muted-foreground'>
										No medical history recorded
									</p>
								)}
							</CardContent>
						</Card>
					</div>

					<div className='space-y-6'>
						<Card>
							<CardHeader>
								<CardTitle>Statistics</CardTitle>
							</CardHeader>
							<CardContent className='space-y-4'>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-2'>
										<Calendar className='h-4 w-4 text-muted-foreground' />
										<span className='text-sm'>Total Visits</span>
									</div>
									<span className='font-semibold'>
										{stats?.totalAppointments ?? 0}
									</span>
								</div>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-2'>
										<FileText className='h-4 w-4 text-muted-foreground' />
										<span className='text-sm'>Medical Records</span>
									</div>
									<span className='font-semibold'>
										{stats?.totalRecords ?? 0}
									</span>
								</div>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-2'>
										<Pill className='h-4 w-4 text-muted-foreground' />
										<span className='text-sm'>Active Prescriptions</span>
									</div>
									<span className='font-semibold'>
										{stats?.activePrescriptions ?? 0}
									</span>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Quick Actions</CardTitle>
							</CardHeader>
							<CardContent className='space-y-2'>
								<Button
									asChild
									className='w-full justify-start'
									variant='outline'
								>
									<Link
										href={`/dashboard/appointments/new?patientId=${patientId}`}
									>
										<Calendar className='mr-2 h-4 w-4' />
										Schedule Appointment
									</Link>
								</Button>
								<Button
									asChild
									className='w-full justify-start'
									variant='outline'
								>
									<Link
										href={`/dashboard/prescriptions/new?patientId=${patientId}`}
									>
										<Pill className='mr-2 h-4 w-4' />
										Write Prescription
									</Link>
								</Button>
								<Button
									asChild
									className='w-full justify-start'
									variant='outline'
								>
									<Link
										href={`/dashboard/medical-records/new?patientId=${patientId}`}
									>
										<FileText className='mr-2 h-4 w-4' />
										Add Medical Record
									</Link>
								</Button>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Recent Visits</CardTitle>
							</CardHeader>
							<CardContent>
								{stats?.last5Records && stats.last5Records.length > 0 ? (
									<div className='space-y-3'>
										{stats.last5Records.map(
											(record: {
												id: string
												appointmentDate: Date
												type?: string | null
											}) => (
												<div
													className='flex items-center justify-between text-sm'
													key={record.id}
												>
													<span>
														{format(
															new Date(record.appointmentDate),
															'MMM d, yyyy'
														)}
													</span>
													<span className='text-muted-foreground'>
														{record.type ?? 'Visit'}
													</span>
												</div>
											)
										)}
									</div>
								) : (
									<p className='text-muted-foreground text-sm'>
										No recent visits
									</p>
								)}
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</DashboardLayout>
	)
}
