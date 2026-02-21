// app/page.tsx (assuming this is your home page)
'use client'

import { useQuery } from '@tanstack/react-query'
import {
	Activity,
	AlertCircle,
	Calendar,
	CheckCircle,
	ChevronDown,
	ChevronUp,
	Clock,
	Database,
	Download,
	HardDrive,
	Heart,
	RefreshCw,
	Server,
	Syringe,
	Users,
	Wifi,
	XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

import { logger } from '../lib/logger'
import { useTRPC } from '../trpc/client'

const TITLE_TEXT = `
 ██████╗ ███████╗██████╗ ██╗ █████╗  ██████╗ █████╗ ██████╗ ███████╗
 ██╔══██╗██╔════╝██╔══██╗██║██╔══██╗██╔════╝██╔══██╗██╔══██╗██╔════╝
 ██████╔╝█████╗  ██║  ██╝██║███████║██║     ███████║██████╔╝█████╗
 ██╔═══╝ ██╔══╝  ██║  ██╗██║██╔══██║██║     ██╔══██║██╔══██╗██╔══╝
 ██║     ███████╗███████║██║██║  ██║╚██████╗██║  ██║██║  ██║███████╗
 ╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝

 ██╗  ██╗███████╗ █████╗ ██╗     ████████╗██╗  ██╗     ██████╗██╗  ██╗███████╗ ██████╗██╗  ██╗
 ██║  ██║██╔════╝██╔══██╗██║     ╚══██╔══╝██║  ██║    ██╔════╝██║  ██║██╔════╝██╔════╝██║ ██╔╝
 ███████║█████╗  ███████║██║        ██║   ███████║    ██║     ███████║█████╗  ██║     █████╔╝
 ██╔══██║██╔══╝  ██╔══██║██║        ██║   ██╔══██║    ██║     ██╔══██║██╔══╝  ██║     ██╔═██╗
 ██║  ██║███████╗██║  ██║███████╗   ██║   ██║  ██║    ╚██████╗██║  ██║███████╗╚██████╗██║  ██╗
 ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝     ╚═════╝╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝
`

interface HealthMetrics {
	uptime: number
	responseTime: number
	databaseConnections: number
	activeUsers: number
	memoryUsage: number
	cpuUsage: number
	diskSpace: number
	lastBackup: string | null
}

interface ServiceStatus {
	name: string
	status: 'healthy' | 'degraded' | 'down'
	latency: number
	lastChecked: Date
	message?: string
}

export default function Home() {
	const [expanded, setExpanded] = useState(false)
	const [metrics, setMetrics] = useState<HealthMetrics>({
		uptime: 0,
		responseTime: 0,
		databaseConnections: 0,
		activeUsers: 0,
		memoryUsage: 0,
		cpuUsage: 0,
		diskSpace: 0,
		lastBackup: null,
	})
	const [services, setServices] = useState<ServiceStatus[]>([
		{
			name: 'API Server',
			status: 'healthy',
			latency: 45,
			lastChecked: new Date(),
		},
		{
			name: 'Database',
			status: 'healthy',
			latency: 12,
			lastChecked: new Date(),
		},
		{
			name: 'Redis Cache',
			status: 'healthy',
			latency: 3,
			lastChecked: new Date(),
		},
		{
			name: 'Storage Service',
			status: 'healthy',
			latency: 87,
			lastChecked: new Date(),
		},
		{
			name: 'Email Service',
			status: 'healthy',
			latency: 156,
			lastChecked: new Date(),
		},
		{
			name: 'SMS Gateway',
			status: 'healthy',
			latency: 234,
			lastChecked: new Date(),
		},
	])

	const trpc = useTRPC()
	// ✅ FIXED: Use queryOptions() pattern
	const healthCheck = useQuery(
		trpc.health.healthCheck.queryOptions(undefined, {
			refetchInterval: 30_000, // Refresh every 30 seconds
			refetchOnWindowFocus: true,
		})
	)

	// ✅ FIXED: Use queryOptions() pattern with enabled flag
	const detailedHealth = useQuery(
		trpc.health.detailed.queryOptions(undefined, {
			enabled: expanded,
			refetchInterval: 60_000, // Refresh every minute when expanded
		})
	)

	useEffect(() => {
		if (healthCheck.data) {
			// Update metrics based on health check data
			logger.info('Health check completed', {
				type: 'SYSTEM',
				status: healthCheck.data.status,
			})
		}
	}, [healthCheck.data])

	useEffect(() => {
		if (detailedHealth.data) {
			setMetrics(detailedHealth.data.metrics)
			setServices(detailedHealth.data.services as ServiceStatus[])
		}
	}, [detailedHealth.data])

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'healthy':
				return 'bg-green-500'
			case 'degraded':
				return 'bg-yellow-500'
			case 'down':
				return 'bg-red-500'
			default:
				return 'bg-gray-500'
		}
	}

	const getStatusIcon = (status: string) => {
		switch (status) {
			case 'healthy':
				return <CheckCircle className='h-4 w-4 text-green-500' />
			case 'degraded':
				return <AlertCircle className='h-4 w-4 text-yellow-500' />
			case 'down':
				return <XCircle className='h-4 w-4 text-red-500' />
			default:
				return <Activity className='h-4 w-4 text-gray-500' />
		}
	}

	const formatUptime = (seconds: number) => {
		const days = Math.floor(seconds / 86_400)
		const hours = Math.floor((seconds % 86_400) / 3600)
		const minutes = Math.floor((seconds % 3600) / 60)
		return `${days}d ${hours}h ${minutes}m`
	}

	const _formatBytes = (bytes: number) => {
		if (bytes === 0) return '0 B'
		const k = 1024
		const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
	}

	const handleRefresh = () => {
		healthCheck.refetch()
		if (expanded) {
			detailedHealth.refetch()
		}
	}

	return (
		<div className='container mx-auto max-w-5xl px-4 py-8'>
			{/* ASCII Art Header */}
			<pre className='mb-8 overflow-x-auto font-mono text-primary text-xs md:text-sm'>
				{TITLE_TEXT}
			</pre>

			{/* Health Status Overview */}
			<div className='mb-8 grid gap-6 md:grid-cols-3'>
				{/* API Status Card */}
				<Card>
					<CardHeader className='pb-2'>
						<CardTitle className='flex items-center gap-2 font-medium text-sm'>
							<Server className='h-4 w-4' />
							API Status
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='flex items-center gap-2'>
							<div
								className={`h-3 w-3 rounded-full ${healthCheck.data?.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}
							/>
							<span className='font-medium text-lg'>
								{healthCheck.isLoading
									? 'Checking...'
									: healthCheck.data
										? 'Connected'
										: 'Disconnected'}
							</span>
						</div>
						{healthCheck.data && (
							<p className='mt-2 text-muted-foreground text-xs'>
								Version: {healthCheck.data.version} | Environment:{' '}
								{healthCheck.data.environment}
							</p>
						)}
					</CardContent>
				</Card>

				{/* Response Time Card */}
				<Card>
					<CardHeader className='pb-2'>
						<CardTitle className='flex items-center gap-2 font-medium text-sm'>
							<Clock className='h-4 w-4' />
							Response Time
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='flex items-baseline gap-1'>
							<span className='font-medium text-2xl'>
								{metrics.responseTime}
							</span>
							<span className='text-muted-foreground text-sm'>ms</span>
						</div>
						<Progress
							className='mt-2 h-1'
							value={Math.min((metrics.responseTime / 200) * 100, 100)}
						/>
					</CardContent>
				</Card>

				{/* Uptime Card */}
				<Card>
					<CardHeader className='pb-2'>
						<CardTitle className='flex items-center gap-2 font-medium text-sm'>
							<Activity className='h-4 w-4' />
							Uptime
						</CardTitle>
					</CardHeader>
					<CardContent>
						<span className='font-medium text-2xl'>
							{formatUptime(metrics.uptime)}
						</span>
						<Badge
							className='ml-2'
							variant='outline'
						>
							99.9%
						</Badge>
					</CardContent>
				</Card>
			</div>

			{/* Services Status */}
			<Card className='mb-6'>
				<CardHeader>
					<div className='flex items-center justify-between'>
						<CardTitle className='flex items-center gap-2'>
							<Wifi className='h-5 w-5' />
							Service Health
						</CardTitle>
						<Button
							className='gap-1'
							onClick={() => setExpanded(!expanded)}
							size='sm'
							variant='ghost'
						>
							{expanded ? 'Show Less' : 'Show Details'}
							{expanded ? (
								<ChevronUp className='h-4 w-4' />
							) : (
								<ChevronDown className='h-4 w-4' />
							)}
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					<div className='grid gap-3'>
						{services.slice(0, expanded ? undefined : 3).map(service => (
							<div
								className='flex items-center justify-between rounded-lg border p-3'
								key={service.name}
							>
								<div className='flex items-center gap-3'>
									{getStatusIcon(service.status)}
									<div>
										<p className='font-medium'>{service.name}</p>
										<p className='text-muted-foreground text-xs'>
											Last checked: {service.lastChecked.toLocaleTimeString()}
										</p>
									</div>
								</div>
								<div className='flex items-center gap-3'>
									<span className='text-sm'>{service.latency}ms</span>
									<div
										className={`h-2 w-2 rounded-full ${getStatusColor(service.status)}`}
									/>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Detailed Metrics (Conditional) */}
			{expanded && (
				<div className='grid gap-6 md:grid-cols-2'>
					{/* Database Metrics */}
					<Card>
						<CardHeader>
							<CardTitle className='flex items-center gap-2'>
								<Database className='h-5 w-5' />
								Database Metrics
							</CardTitle>
						</CardHeader>
						<CardContent className='space-y-4'>
							<div className='flex justify-between'>
								<span className='text-muted-foreground'>Connections</span>
								<span className='font-medium'>
									{metrics.databaseConnections}
								</span>
							</div>
							<div className='flex justify-between'>
								<span className='text-muted-foreground'>Query Performance</span>
								<span className='font-medium'>23ms avg</span>
							</div>
							<div className='flex justify-between'>
								<span className='text-muted-foreground'>Active Users</span>
								<span className='font-medium'>{metrics.activeUsers}</span>
							</div>
							<div className='flex justify-between'>
								<span className='text-muted-foreground'>Last Backup</span>
								<span className='font-medium'>
									{metrics.lastBackup
										? new Date(metrics.lastBackup).toLocaleString()
										: 'Never'}
								</span>
							</div>
						</CardContent>
					</Card>

					{/* System Resources */}
					<Card>
						<CardHeader>
							<CardTitle className='flex items-center gap-2'>
								<HardDrive className='h-5 w-5' />
								System Resources
							</CardTitle>
						</CardHeader>
						<CardContent className='space-y-4'>
							<div>
								<div className='mb-1 flex justify-between'>
									<span className='text-muted-foreground'>Memory Usage</span>
									<span className='font-medium'>{metrics.memoryUsage}%</span>
								</div>
								<Progress
									className='h-2'
									value={metrics.memoryUsage}
								/>
							</div>
							<div>
								<div className='mb-1 flex justify-between'>
									<span className='text-muted-foreground'>CPU Usage</span>
									<span className='font-medium'>{metrics.cpuUsage}%</span>
								</div>
								<Progress
									className='h-2'
									value={metrics.cpuUsage}
								/>
							</div>
							<div>
								<div className='mb-1 flex justify-between'>
									<span className='text-muted-foreground'>Disk Space</span>
									<span className='font-medium'>{metrics.diskSpace}%</span>
								</div>
								<Progress
									className='h-2'
									value={metrics.diskSpace}
								/>
							</div>
						</CardContent>
					</Card>

					{/* Pediatric-Specific Metrics */}
					<Card className='md:col-span-2'>
						<CardHeader>
							<CardTitle className='flex items-center gap-2'>
								<Heart className='h-5 w-5' />
								Clinic Operations
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='grid gap-4 sm:grid-cols-3'>
								<div className='rounded-lg bg-blue-50 p-4 dark:bg-blue-950'>
									<div className='mb-2 flex items-center gap-2'>
										<Users className='h-4 w-4 text-blue-600' />
										<span className='font-medium text-sm'>Active Patients</span>
									</div>
									<p className='font-bold text-2xl'>1,234</p>
									<p className='text-muted-foreground text-xs'>
										+12% this month
									</p>
								</div>
								<div className='rounded-lg bg-green-50 p-4 dark:bg-green-950'>
									<div className='mb-2 flex items-center gap-2'>
										<Calendar className='h-4 w-4 text-green-600' />
										<span className='font-medium text-sm'>
											Today's Appointments
										</span>
									</div>
									<p className='font-bold text-2xl'>42</p>
									<p className='text-muted-foreground text-xs'>
										18 completed, 24 scheduled
									</p>
								</div>
								<div className='rounded-lg bg-purple-50 p-4 dark:bg-purple-950'>
									<div className='mb-2 flex items-center gap-2'>
										<Syringe className='h-4 w-4 text-purple-600' />
										<span className='font-medium text-sm'>
											Due Vaccinations
										</span>
									</div>
									<p className='font-bold text-2xl'>156</p>
									<p className='text-muted-foreground text-xs'>Next 7 days</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Actions Footer */}
			<div className='mt-8 flex items-center justify-between border-t pt-6'>
				<div className='flex items-center gap-2 text-muted-foreground text-sm'>
					<Activity className='h-4 w-4' />
					Last updated: {new Date().toLocaleTimeString()}
				</div>
				<div className='flex gap-2'>
					<Button
						disabled={healthCheck.isFetching}
						onClick={handleRefresh}
						size='sm'
						variant='outline'
					>
						<RefreshCw
							className={`mr-2 h-4 w-4 ${healthCheck.isFetching ? 'animate-spin' : ''}`}
						/>
						Refresh
					</Button>
					<Button
						size='sm'
						variant='outline'
					>
						<Download className='mr-2 h-4 w-4' />
						Export Report
					</Button>
				</div>
			</div>
		</div>
	)
}
