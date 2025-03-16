'use client'


import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/react'
import { UserRole } from '@prisma/client'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  Calendar,
  ChevronDown,
  ClipboardList,
  CreditCard,
  FileText,
  Home,
  LineChart,
  Menu,
  Settings,
  Stethoscope,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { auth } from '@/auth'
import { useSidebar } from '@/components/sidebar-provider'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

import type React from 'react'

const sidebarVariants = {
  open: { x: 0 },
  closed: { x: '-100%' },
}

const menuItemVariants = {
  open: { opacity: 1, y: 0 },
  closed: { opacity: 0, y: 20 },
}
interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const { isOpen, toggle, close } = useSidebar()

  // ✅ Store session state
  const [session, setSession] = useState<{ user?: { role?: string } } | null>(
    null,
  )

  useEffect(() => {
    async function loadSession() {
      const userSession = await auth() // ✅ Await the promise
      setSession(userSession) // ✅ Store session in state
    }
    loadSession()
  }, [])

  // ✅ Extract user role safely
  const role = session?.user?.role
  const routes = [
    {
      label: 'Dashboard',
      icon: Home,
      href: '/dashboard',
      roles: ['USER', 'ADMIN'],
    },
    {
      label: 'Appointments',
      icon: Calendar,
      href: '/dashboard/appointments',
      roles: ['USER', 'ADMIN'],
    },
    {
      label: 'Patients',
      icon: Users,
      href: '/dashboard/patients',
      roles: ['ADMIN', 'USER'],
      subItems: [
        { label: 'All Patients', href: '/dashboard/patients' },
        { label: 'Add Patient', href: '/dashboard/patients/new' },
      ],
    },
    {
      label: 'Doctors',
      icon: Stethoscope,
      href: '/dashboard/doctors',
      roles: ['ADMIN'],
    },
    {
      label: 'Medical Records',
      icon: ClipboardList,
      href: '/dashboard/medical-records',
      roles: ['USER', 'ADMIN'],
    },
    {
      label: 'Payments',
      icon: CreditCard,
      href: '/dashboard/payments',
      roles: ['USER', 'ADMIN'],
    },
    {
      label: 'Services',
      icon: FileText,
      href: '/dashboard/services',
      roles: ['ADMIN'],
    },
    {
      label: 'Finance',
      icon: LineChart,
      href: '/dashboard/finance',
      roles: ['ADMIN'],
    },
    {
      label: 'Settings',
      icon: Settings,
      href: '/dashboard/settings',
      roles: ['USER', 'ADMIN'],
    },
  ]
  const filteredRoutes = routes.filter(route => route.roles.includes(role))

  return (
    <>
      <Sheet open={isOpen} onOpenChange={toggle}>
        <SheetTrigger asChild className="lg:hidden">
          <Button
            variant="outline"
            size="icon"
            className="absolute top-4 left-4">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <MobileSidebar
            routes={filteredRoutes}
            pathname={pathname}
            onClose={close}
          />
        </SheetContent>
      </Sheet>
      <motion.aside
        className={cn(
          'bg-background fixed inset-y-0 left-0 z-20 hidden w-72 flex-col border-r lg:flex',
          className,
        )}
        variants={sidebarVariants}
        initial="closed"
        animate={isOpen ? 'open' : 'closed'}
        transition={{ duration: 0.3, ease: 'easeInOut' }}>
        <DesktopSidebar routes={filteredRoutes} pathname={pathname} />
      </motion.aside>
    </>
  )
}

interface SidebarNavProps {
  routes: {
    label: string
    icon: React.ElementType
    href: string
    roles: UserRole[]
    subItems?: { label: string; href: string }[]
  }[]
  pathname: string
  onClose?: () => void
}

function MobileSidebar({ routes, pathname, onClose }: SidebarNavProps) {
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex h-14 items-center border-b px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-bold"
          onClick={onClose}>
          <Activity className="text-primary h-5 w-5" />
          <span>MediCare</span>
        </Link>
      </div>
      <ScrollArea className="flex-1 px-2">
        <AnimatePresence>
          <motion.div
            className="space-y-1 p-2"
            initial="closed"
            animate="open"
            exit="closed">
            {routes.map(route => (
              <motion.div key={route.href} variants={menuItemVariants}>
                {route.subItems ? (
                  <Disclosure>
                    {({ open }) => (
                      <>
                        <DisclosureButton className="hover:bg-accent hover:text-accent-foreground flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium">
                          <div className="flex items-center gap-3">
                            <route.icon className="h-5 w-5" />
                            {route.label}
                          </div>
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${open ? 'rotate-180 transform' : ''}`}
                          />
                        </DisclosureButton>
                        <DisclosurePanel className="space-y-1 pt-2 pl-6">
                          {route.subItems?.map(subItem => (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              onClick={onClose}
                              className={cn(
                                'hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
                                pathname === subItem.href
                                  ? 'bg-accent text-accent-foreground'
                                  : 'transparent',
                              )}>
                              {subItem.label}
                            </Link>
                          ))}
                        </DisclosurePanel>
                      </>
                    )}
                  </Disclosure>
                ) : (
                  <Link
                    href={route.href}
                    onClick={onClose}
                    className={cn(
                      'hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
                      pathname === route.href
                        ? 'bg-accent text-accent-foreground'
                        : 'transparent',
                    )}>
                    <route.icon className="h-5 w-5" />
                    {route.label}
                  </Link>
                )}
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </ScrollArea>
    </div>
  )
}

function DesktopSidebar({ routes, pathname }: SidebarNavProps) {
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex h-14 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold">
          <Activity className="text-primary h-5 w-5" />
          <span>MediCare</span>
        </Link>
      </div>
      <ScrollArea className="flex-1">
        <AnimatePresence>
          <motion.div
            className="space-y-1 p-2"
            initial="closed"
            animate="open"
            exit="closed">
            {routes.map(route => (
              <motion.div key={route.href} variants={menuItemVariants}>
                {route.subItems ? (
                  <Disclosure>
                    {({ open }) => (
                      <>
                        <DisclosureButton className="hover:bg-accent hover:text-accent-foreground flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium">
                          <div className="flex items-center gap-3">
                            <route.icon className="h-5 w-5" />
                            {route.label}
                          </div>
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${open ? 'rotate-180 transform' : ''}`}
                          />
                        </DisclosureButton>
                        <DisclosurePanel className="space-y-1 pt-2 pl-6">
                          {route.subItems?.map(subItem => (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              className={cn(
                                'hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
                                pathname === subItem.href
                                  ? 'bg-accent text-accent-foreground'
                                  : 'transparent',
                              )}>
                              {subItem.label}
                            </Link>
                          ))}
                        </DisclosurePanel>
                      </>
                    )}
                  </Disclosure>
                ) : (
                  <Link
                    href={route.href}
                    className={cn(
                      'hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
                      pathname === route.href
                        ? 'bg-accent text-accent-foreground'
                        : 'transparent',
                    )}>
                    <route.icon className="h-5 w-5" />
                    {route.label}
                  </Link>
                )}
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </ScrollArea>
    </div>
  )
}
