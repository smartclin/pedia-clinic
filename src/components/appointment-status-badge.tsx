import { Badge } from '@/components/ui/badge'

// Define the AppointmentStatus type
type AppointmentStatus = 'PENDING' | 'SCHEDULED' | 'CANCELLED' | 'COMPLETED'

// Use the AppointmentStatus type in your component props
interface AppointmentStatusBadgeProps {
  status: AppointmentStatus
}

export function AppointmentStatusBadge({
  status,
}: AppointmentStatusBadgeProps) {
  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'PENDING':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100/80 dark:bg-blue-800 dark:text-blue-100'
      case 'SCHEDULED':
        return 'bg-green-100 text-green-800 hover:bg-green-100/80 dark:bg-green-800 dark:text-green-100'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 hover:bg-red-100/80 dark:bg-red-800 dark:text-red-100'
      case 'COMPLETED':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-100/80 dark:bg-purple-800 dark:text-purple-100'
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100/80 dark:bg-gray-800 dark:text-gray-100'
    }
  }

  return (
    <Badge
      className={`${getStatusColor(status)} font-medium`}
      variant="outline">
      {status}
    </Badge>
  )
}
