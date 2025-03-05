import type React from 'react'

import { redirect } from 'next/navigation'

import { auth } from '@/auth'
import { DashboardNav } from '@/components/dashboard-nav'
import { ModeToggle } from '@/components/mode-toggle'
import { UserAccountNav } from '@/components/navbar'

import { HeartPulse } from 'lucide-react'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-background sticky top-0 z-40 border-b">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <HeartPulse className="text-primary h-6 w-6" />
            <span className="font-bold">PediCare</span>
          </div>
          <div className="flex items-center gap-4">
            <ModeToggle />
            <UserAccountNav
              user={{
                name: session.user?.name,
                image: null,
                email: session.user?.email,
              }}
            />
          </div>
        </div>
      </header>
      <div className="container grid flex-1 gap-12 md:grid-cols-[200px_1fr]">
        <aside className="hidden w-[200px] flex-col md:flex">
          <DashboardNav />
        </aside>
        <main className="flex w-full flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
