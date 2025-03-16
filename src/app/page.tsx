'use client'

import { useEffect, useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import { LoginButton } from '@/components/auth/login-button'
import { Button } from '@/components/ui/button'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'

import { AnimatePresence, motion } from 'framer-motion'
import { useSession } from 'next-auth/react'

export default function Home() {
  const [isOpen, setIsOpen] = useState(false)
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  // Handle hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect based on role if authenticated
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role) {
      const role = session.user.role.toLowerCase()
      if (role === 'admin' || role === 'doctor' || role === 'patient') {
        router.push('/dashboard')
      }
    }
  }, [status, session, router])

  if (!mounted) {
    return null
  }

  const handleCancel = () => {
    if (window.history.length > 1) {
      router.back() // Go back if there’s history
    } else {
      setIsOpen(false) // Close modal if no history
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-6 dark:from-blue-950 dark:to-slate-900">
      <div className="flex w-full max-w-6xl flex-1 flex-col items-center justify-center">
        <div className="grid w-full grid-cols-1 items-center gap-8 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex flex-col items-center md:items-start">
            <h1 className="mb-4 text-center text-4xl font-bold md:text-left md:text-5xl">
              Welcome to <br />
              <span className="text-primary text-5xl md:text-6xl">
                PediaCare
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-muted-foreground mb-8 text-center md:text-left">
              Your trusted pediatric clinic providing comprehensive healthcare
              for your children. From routine check-ups to specialized care,
              we&apos;re here for your family every step of the way.
            </motion.p>

            <div className="flex gap-4">
              {status === 'authenticated' ? (
                <Link href="/dashboard">
                  <Button size="lg">View Dashboard</Button>
                </Link>
              ) : (
                <>
                  <Button
                    size="lg"
                    className="bg-primary hover:bg-primary/90"
                    onClick={() => setIsOpen(true)}>
                    New Patient
                  </Button>

                  <LoginButton>
                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      className="border-primary text-primary hover:bg-primary transition hover:text-white"
                    >
                      <div>Sign In</div>
                    </Button>                    
                  </LoginButton>
                </>
              )}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mt-8 flex flex-wrap justify-center gap-4 md:justify-start">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 rounded-full p-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
                  </svg>
                </div>
                <span className="text-sm font-medium">Compassionate Care</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 rounded-full p-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary">
                    <path d="M3 7V5c0-1.1.9-2 2-2h2"></path>
                    <path d="M17 3h2c1.1 0 2 .9 2 2v2"></path>
                    <path d="M21 17v2c0 1.1-.9 2-2 2h-2"></path>
                    <path d="M7 21H5c-1.1 0-2-.9-2-2v-2"></path>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                    <path d="M9 9h.01"></path>
                    <path d="M15 9h.01"></path>
                  </svg>
                </div>
                <span className="text-sm font-medium">Child-Friendly</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 rounded-full p-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                  </svg>
                </div>
                <span className="text-sm font-medium">Safe Environment</span>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="relative hidden h-[400px] w-full overflow-hidden rounded-2xl shadow-xl md:block">
            <Image
              src="/place.png?height=600&width=800"
              alt="Happy children at pediatric clinic"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 800px"
              className="object-contain"
              priority
            />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="mt-16 grid w-full grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow-md dark:bg-slate-800">
            <div className="bg-primary/10 mb-4 w-fit rounded-full p-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary">
                <path d="M16 22h2c.5 0 1-.2 1.4-.6.4-.4.6-.9.6-1.4V7.5L14.5 2H6c-.5 0-1 .2-1.4.6C4.2 3 4 3.5 4 4v3"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <path d="M4 11.5V20a2 2 0 0 0 2 2h2"></path>
                <path d="M12 13a3 3 0 1 0 0 6 3 3 0 1 0 0-6Z"></path>
                <path d="m14 14 2 2"></path>
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-semibold">Online Appointments</h3>
            <p className="text-muted-foreground">
              Schedule appointments online and manage your child&apos;s
              healthcare with ease.
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-md dark:bg-slate-800">
            <div className="bg-primary/10 mb-4 w-fit rounded-full p-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary">
                <path d="M8 19h8a4 4 0 0 0 0-8h-8a4 4 0 0 0 0 8Z"></path>
                <path d="M8 19a4 4 0 0 1 0-8"></path>
                <path d="M12 19v3"></path>
                <path d="M12 6V3"></path>
                <path d="M15 7a5 5 0 0 0-5-5"></path>
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-semibold">Growth Tracking</h3>
            <p className="text-muted-foreground">
              Monitor your child&apos;s growth and development with our
              comprehensive tracking tools.
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-md dark:bg-slate-800">
            <div className="bg-primary/10 mb-4 w-fit rounded-full p-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-semibold">Health Education</h3>
            <p className="text-muted-foreground">
              Access resources and information to help you make informed
              decisions about your child&apos;s health.
            </p>
          </div>
        </motion.div>
      </div>

      <footer className="mt-16 w-full max-w-6xl">
        <div className="border-t border-gray-200 pt-8 pb-4 dark:border-gray-800">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
              </svg>
              <span className="font-semibold">PediaCare</span>
            </div>
            <p className="text-muted-foreground text-center text-sm">
              &copy; {new Date().getFullYear()} PediaCare Clinic. All rights
              reserved.
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                className="text-muted-foreground hover:text-primary transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
                <span className="sr-only">Facebook</span>
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-primary transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
                </svg>
                <span className="sr-only">Instagram</span>
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-primary transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                </svg>
                <span className="sr-only">Twitter</span>
              </a>
            </div>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {isOpen && (
          <Dialog
            as={motion.div}
            static
            open={isOpen}
            onClose={() => setIsOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}>
            {/* Overlay */}
            <motion.div
              className="bg-opacity-30 fixed inset-0 bg-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />
            {/* Modal Content */}
            <DialogPanel
              as={motion.div}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1, transition: { duration: 0.3 } }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3 } }}
              className="bg-card text-card-foreground relative w-full max-w-sm rounded-xl p-6 shadow-xl">
              <DialogTitle className="mb-4 text-xl font-semibold">
                New Patient Registration
              </DialogTitle>
              <p className="text-muted-foreground mb-6">
                Create an account to manage your child&apos;s medical records,
                schedule appointments, and access our services.
              </p>

              <div className="flex flex-col gap-3">
                <Link href="/auth/register">
                  <Button className="w-full">Get Started</Button>
                </Link>
                <Button
                  variant="ghost"
                  onClick={handleCancel}
                  className="w-full">
                  Cancel
                </Button>
              </div>
            </DialogPanel>
          </Dialog>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
