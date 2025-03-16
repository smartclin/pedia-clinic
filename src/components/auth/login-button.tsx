'use client'

import { useRouter } from 'next/navigation'
import React from 'react'

interface LoginButtonProps {
  children: React.ReactNode
  mode?: 'modal' | 'redirect'
  asChild?: boolean
}

export function LoginButton({ children, asChild = false }: LoginButtonProps) {
  const router = useRouter()

  function buttonClicked() {
    router.push('/auth/login')
  }

  return asChild && React.isValidElement(children) ? (
    React.cloneElement(children as React.ReactElement<any>, { onClick: buttonClicked })
  ) : (
    <button onClick={buttonClicked} className="cursor-pointer">{children}</button>
  );
}
