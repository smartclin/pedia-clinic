// components/home/stats-cards.tsx
import { Baby, Calendar, Heart, Users } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { getClinicStats } from '../../server/services/clinic.service'

export async function StatsCards() {
	const stats = await getClinicStats()

	const statItems = [
		{
			title: 'Happy Families',
			value: stats.patients.toLocaleString(),
			icon: Users,
			description: 'Trusted by families',
			color: 'text-blue-600',
			bgColor: 'bg-blue-100 dark:bg-blue-900/20',
		},
		{
			title: 'Medical Specialists',
			value: stats.specialists.toLocaleString(),
			icon: Heart,
			description: 'Board certified',
			color: 'text-green-600',
			bgColor: 'bg-green-100 dark:bg-green-900/20',
		},
		{
			title: 'Annual Visits',
			value: stats.appointments.toLocaleString(),
			icon: Calendar,
			description: 'Appointments yearly',
			color: 'text-purple-600',
			bgColor: 'bg-purple-100 dark:bg-purple-900/20',
		},
		{
			title: 'Satisfaction',
			value: `${stats.satisfaction}%`,
			icon: Baby,
			description: 'Parent satisfaction',
			color: 'text-orange-600',
			bgColor: 'bg-orange-100 dark:bg-orange-900/20',
		},
	]

	return (
		<div className='grid gap-4 md:grid-cols-4'>
			{statItems.map(stat => {
				const Icon = stat.icon
				return (
					<Card key={stat.title}>
						<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
							<CardTitle className='font-medium text-sm'>
								{stat.title}
							</CardTitle>
							<div className={`rounded-lg p-2 ${stat.bgColor}`}>
								<Icon className={`h-4 w-4 ${stat.color}`} />
							</div>
						</CardHeader>
						<CardContent>
							<div className='font-bold text-2xl'>{stat.value}</div>
							<p className='text-muted-foreground text-xs'>
								{stat.description}
							</p>
						</CardContent>
					</Card>
				)
			})}
		</div>
	)
}
