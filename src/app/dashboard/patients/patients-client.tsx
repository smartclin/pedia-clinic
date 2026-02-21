// src/app/dashboard/patients/patients-client.tsx
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { PatientSkeleton } from '@/components/patients/patient-skeleton'
import { PatientTable } from '@/components/patients/patient-table'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { useTRPC } from '@/trpc/client'

interface PatientsClientProps {
	clinicId: string
}

export default function PatientsClient({ clinicId }: PatientsClientProps) {
	const trpc = useTRPC()
	const queryClient = useQueryClient()
	const [search, setSearch] = useState('')
	const [gender, setGender] = useState<string>('')
	const [status, setStatus] = useState<string>('')
	const [page, setPage] = useState(1)
	const limit = 10

	const { data, isLoading, isFetching } = useQuery(
		trpc.patient.getAllPatients.queryOptions({
			clinicId,
			page,
			limit,
			search: search || undefined,
			gender: gender as 'MALE' | 'FEMALE' | undefined,
			status: status as 'ACTIVE' | 'INACTIVE' | 'DORMANT' | undefined,
			sortBy: 'createdAt',
			sortOrder: 'desc',
		})
	)

	const deleteMutation = useMutation(
		trpc.patient.delete.mutationOptions({
			onSuccess: result => {
				if (result.success) {
					toast.success('Patient deleted successfully')
					queryClient.invalidateQueries(
						trpc.patient.getAllPatients.queryFilter({ clinicId })
					)
				}
			},
			onError: error => {
				toast.error(error.message)
			},
		})
	)

	const handleSearch = (value: string) => {
		setSearch(value)
		setPage(1)
	}

	const handleGenderChange = (value: string) => {
		setGender(value === 'all' ? '' : value)
		setPage(1)
	}

	const handleStatusChange = (value: string) => {
		setStatus(value === 'all' ? '' : value)
		setPage(1)
	}

	const totalPages = data?.totalPages ?? 1

	return (
		<DashboardLayout>
			<div className='p-4 md:p-8'>
				<div className='mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
					<div>
						<h1 className='font-bold text-3xl tracking-tight'>Patients</h1>
						<p className='text-muted-foreground'>
							Manage your pediatric patients
						</p>
					</div>
					<Button asChild>
						<Link href='/dashboard/patients/new'>
							<Plus className='mr-2 h-4 w-4' />
							Add Patient
						</Link>
					</Button>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>All Patients</CardTitle>
						<CardDescription>
							{data?.totalRecords
								? `${data.totalRecords} total patients`
								: 'Loading patients...'}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='mb-6 flex flex-col gap-4 sm:flex-row'>
							<div className='relative flex-1'>
								<Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
								<Input
									className='pl-9'
									onChange={e => handleSearch(e.target.value)}
									placeholder='Search patients...'
									value={search}
								/>
							</div>
							<Select
								onValueChange={handleGenderChange}
								value={gender}
							>
								<SelectTrigger className='w-full sm:w-[150px]'>
									<SelectValue placeholder='Gender' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='all'>All</SelectItem>
									<SelectItem value='MALE'>Male</SelectItem>
									<SelectItem value='FEMALE'>Female</SelectItem>
								</SelectContent>
							</Select>
							<Select
								onValueChange={handleStatusChange}
								value={status}
							>
								<SelectTrigger className='w-full sm:w-[150px]'>
									<SelectValue placeholder='Status' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='all'>All</SelectItem>
									<SelectItem value='ACTIVE'>Active</SelectItem>
									<SelectItem value='INACTIVE'>Inactive</SelectItem>
									<SelectItem value='DORMANT'>Dormant</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{isLoading ? (
							<PatientSkeleton />
						) : (
							<>
								<PatientTable
									isDeleting={deleteMutation.isPending}
									onDelete={id => deleteMutation.mutate({ id })}
									patients={data?.data ?? []}
								/>

								{totalPages > 1 && (
									<div className='mt-6 flex items-center justify-between'>
										<p className='text-muted-foreground text-sm'>
											Page {page} of {totalPages}
										</p>
										<div className='flex gap-2'>
											<Button
												disabled={page === 1 || isFetching}
												onClick={() => setPage(p => Math.max(1, p - 1))}
												size='sm'
												variant='outline'
											>
												Previous
											</Button>
											<Button
												disabled={page === totalPages || isFetching}
												onClick={() =>
													setPage(p => Math.min(totalPages, p + 1))
												}
												size='sm'
												variant='outline'
											>
												Next
											</Button>
										</div>
									</div>
								)}
							</>
						)}
					</CardContent>
				</Card>
			</div>
		</DashboardLayout>
	)
}
