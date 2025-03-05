import type React from 'react'

import Link from 'next/link'

import { Button } from '@/components/ui/button'

import {
  Activity,
  CalendarCheck,
  ClipboardList,
  HeartPulse,
  Users,
} from 'lucide-react'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-primary text-primary-foreground py-6">
        <div className="container mx-auto flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-8 w-8" />
            <h1 className="text-2xl font-bold">PediCare</h1>
          </div>
          <div className="flex gap-4">
            <Link href="/login">
              <Button
                variant="outline"
                className="bg-primary-foreground text-primary">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="from-primary/10 to-background bg-gradient-to-b py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="mb-6 text-4xl font-bold">
              Pediatric Clinic Management System
            </h2>
            <p className="text-muted-foreground mx-auto mb-10 max-w-2xl text-xl">
              A comprehensive solution for managing pediatric clinics, patients,
              appointments, and medical records.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/login">
                <Button size="lg">Get Started</Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">
              Key Features
            </h2>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
              <FeatureCard
                icon={<Users className="h-10 w-10" />}
                title="Patient Management"
                description="Comprehensive patient profiles with medical history and family information."
              />
              <FeatureCard
                icon={<CalendarCheck className="h-10 w-10" />}
                title="Appointment Scheduling"
                description="Efficient scheduling system for doctors and patients."
              />
              <FeatureCard
                icon={<ClipboardList className="h-10 w-10" />}
                title="Medical Records"
                description="Secure storage and easy access to patient medical records."
              />
              <FeatureCard
                icon={<Activity className="h-10 w-10" />}
                title="Growth Tracking"
                description="Monitor and visualize patient growth with detailed charts."
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-muted py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground">
            © {new Date().getFullYear()} PediCare. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="bg-card text-card-foreground flex flex-col items-center rounded-lg border p-6 text-center shadow-sm">
      <div className="text-primary mb-4">{icon}</div>
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}
