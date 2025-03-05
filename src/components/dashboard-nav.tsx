'use client'

import type React from 'react'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

import {
  CalendarDays,
  ClipboardList,
  DollarSign,
  LayoutDashboard,
  LineChart,
  Stethoscope,
  Users,
} from 'lucide-react'

interface NavItem {
  title: string
  href: string
  icon: React.ReactNode
}

export function DashboardNav() {
  const pathname = usePathname()

  const navItems: NavItem[] = [
    {
      title: 'Overview',
      href: '/dashboard',
      icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
    },
    {
      title: 'Patients',
      href: '/dashboard/patients',
      icon: <Users className="mr-2 h-4 w-4" />,
    },
    {
      title: 'Appointments',
      href: '/dashboard/appointments',
      icon: <CalendarDays className="mr-2 h-4 w-4" />,
    },
    {
      title: 'Medical Records',
      href: '/dashboard/medical-records',
      icon: <ClipboardList className="mr-2 h-4 w-4" />,
    },
    {
      title: 'Growth Charts',
      href: '/dashboard/growth-charts',
      icon: <LineChart className="mr-2 h-4 w-4" />,
    },
    {
      title: 'Consultations',
      href: '/dashboard/consultations',
      icon: <Stethoscope className="mr-2 h-4 w-4" />,
    },
    {
      title: 'Finances',
      href: '/dashboard/finances',
      icon: <DollarSign className="mr-2 h-4 w-4" />,
    },
  ]

  return (
    <nav className="grid items-start gap-2 py-4">
      {navItems.map((item, index) => (
        <Link key={index} href={item.href}>
          <span
            className={cn(
              'group hover:bg-accent hover:text-accent-foreground flex items-center rounded-md px-3 py-2 text-sm font-medium',
              pathname === item.href ? 'bg-accent' : 'transparent',
            )}>
            {item.icon}
            <span>{item.title}</span>
          </span>
        </Link>
      ))}
    </nav>
  )
}
