'use client'

import Link from 'next/link'

import { Button } from '../ui/button'

interface backButtonProps {
  lable: string
  href: string
}

export function Bakcbutton({ lable, href }: backButtonProps) {
  return (
    <Button size={'sm'} variant={'link'} asChild className="w-full font-normal">
      <Link href={href}>{lable}</Link>
    </Button>
  )
}
