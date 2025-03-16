'use client'

import { MoreHorizontal } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'


const appointments = [
  {
    id: '1',
    patient: {
      name: 'John Smith',
      email: 'john.smith@example.com',
      image: '/placeholder.svg?height=32&width=32',
    },
    status: 'SCHEDULED',
    date: 'Today, 2:00 PM',
    doctor: 'Dr. Sarah Johnson',
    type: 'Check-up',
  },
  {
    id: '2',
    patient: {
      name: 'Emily Davis',
      email: 'emily.davis@example.com',
      image: '/placeholder.svg?height=32&width=32',
    },
    status: 'PENDING',
    date: 'Today, 4:30 PM',
    doctor: 'Dr. Michael Chen',
    type: 'Consultation',
  },
  {
    id: '3',
    patient: {
      name: 'Robert Wilson',
      email: 'robert.wilson@example.com',
      image: '/placeholder.svg?height=32&width=32',
    },
    status: 'SCHEDULED',
    date: 'Tomorrow, 10:00 AM',
    doctor: 'Dr. Sarah Johnson',
    type: 'Follow-up',
  },
  {
    id: '4',
    patient: {
      name: 'Sophia Martinez',
      email: 'sophia.martinez@example.com',
      image: '/placeholder.svg?height=32&width=32',
    },
    status: 'SCHEDULED',
    date: 'Tomorrow, 1:15 PM',
    doctor: 'Dr. Michael Chen',
    type: 'Vaccination',
  },
  {
    id: '5',
    patient: {
      name: 'David Thompson',
      email: 'david.thompson@example.com',
      image: '/placeholder.svg?height=32&width=32',
    },
    status: 'CANCELLED',
    date: 'Yesterday, 3:00 PM',
    doctor: 'Dr. Lisa Wong',
    type: 'Check-up',
  },
]

export function RecentAppointments() {
  return (
    <div className="space-y-4">
      {appointments.map(appointment => (
        <div
          key={appointment.id}
          className="flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-4">
            <Avatar>
              <AvatarImage
                src={appointment.patient.image}
                alt={appointment.patient.name}
              />
              <AvatarFallback>
                {appointment.patient.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm leading-none font-medium">
                {appointment.patient.name}
              </p>
              <p className="text-muted-foreground text-sm">
                {appointment.type}
              </p>
              <p className="text-muted-foreground text-xs">
                {appointment.date}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge
              variant={
                appointment.status === 'SCHEDULED'
                  ? 'default'
                  : appointment.status === 'PENDING'
                    ? 'outline'
                    : 'destructive'
              }>
              {appointment.status.charAt(0) +
                appointment.status.slice(1).toLowerCase()}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>View details</DropdownMenuItem>
                <DropdownMenuItem>Reschedule</DropdownMenuItem>
                <DropdownMenuItem>Cancel appointment</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  )
}
