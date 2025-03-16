
import { redirect } from 'next/navigation'

import { auth } from '@/auth'
import { Header } from '@/components/dashboard/header'
import { Sidebar } from '@/components/sidebar'

import type React from 'react'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect('/auth/login')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Sidebar />
      <div className="lg:pl-72">
        <Header />
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
