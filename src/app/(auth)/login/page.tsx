import type { Metadata } from 'next'
import Link from 'next/link'

import { LoginForm } from '@/components/login-form'

import { HeartPulse } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Login - PediCare',
  description: 'Login to your PediCare account',
}

export default function LoginPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <div className="flex justify-center">
            <HeartPulse className="text-primary h-10 w-10" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="text-muted-foreground text-sm">
            Enter your credentials to sign in to your account
          </p>
        </div>
        <LoginForm />
        <p className="text-muted-foreground px-8 text-center text-sm">
          <Link
            href="/"
            className="hover:text-brand underline underline-offset-4">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  )
}
